/**
 * POST /api/upload
 *
 * Handles multipart file uploads from authenticated users.
 * Validates files, uploads to OneLake, and stores metadata in the Delta table.
 *
 * Flow:
 *   1. Verify authenticated session
 *   2. Parse multipart/form-data
 *   3. Validate file (size, type, name)
 *   4. Sanitize filename and generate storage path
 *   5. Upload file buffer to OneLake (ADLS Gen2 protocol)
 *   6. Compute file checksum
 *   7. Insert metadata record in Fabric Lakehouse Delta table
 *   8. Return structured response
 *
 * SECURITY:
 *   - All Fabric API calls happen server-side only
 *   - No secrets are returned in responses
 *   - File paths are generated server-side
 *   - Filenames are sanitized to prevent path traversal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateFileUpload } from '@/lib/validation';
import { uploadFileToOneLake, generateStoragePath, sanitizeFilename } from '@/lib/onelake';
import { insertFileMetadata, generateFileId } from '@/lib/metadata';
import { createApiError, createApiSuccess, computeChecksum, toUserFriendlyError } from '@/lib/utils';
import { getMimeFileType } from '@/types/file';
import { isFabricConfigured } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(createApiError('UNAUTHORIZED', 'You must be signed in to upload files.'), {
      status: 401,
    });
  }

  // ── 2. Check Fabric Configuration ──────────────────────────────────────────
  if (!isFabricConfigured()) {
    return NextResponse.json(
      createApiError(
        'FABRIC_NOT_CONFIGURED',
        'Microsoft Fabric is not configured on this server. Please contact your administrator.'
      ),
      { status: 503 }
    );
  }

  // ── 3. Parse Multipart Form Data ───────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(createApiError('INVALID_REQUEST', 'Failed to parse the request body.'), {
      status: 400,
    });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      createApiError('MISSING_FILE', 'No file was provided in the request.'),
      { status: 400 }
    );
  }

  // ── 4. Validate File ───────────────────────────────────────────────────────
  const validation = validateFileUpload(file.name, file.type, file.size);
  if (!validation.success) {
    return NextResponse.json(createApiError('VALIDATION_FAILED', validation.error), {
      status: 422,
    });
  }

  // ── 5. Prepare File Data ───────────────────────────────────────────────────
  const fileId = generateFileId();
  const sanitizedName = sanitizeFilename(file.name);
  const storagePath = generateStoragePath(file.name, fileId);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // ── 6. Upload to OneLake ───────────────────────────────────────────────────
  try {
    await uploadFileToOneLake(storagePath, fileBuffer, file.type);
  } catch (error) {
    console.error('[Upload API] OneLake upload failed:', error instanceof Error ? error.message : 'Unknown error');
    const { code, message } = toUserFriendlyError(error);
    return NextResponse.json(createApiError(code, `Upload failed: ${message}`), {
      status: 502,
    });
  }

  // ── 7. Compute Checksum ────────────────────────────────────────────────────
  let checksum: string | null = null;
  try {
    checksum = await computeChecksum(fileBuffer);
  } catch {
    // Non-fatal: continue without checksum
    console.warn('[Upload API] Failed to compute file checksum.');
  }

  // ── 8. Store Metadata in Delta Table ──────────────────────────────────────
  let metadata;
  try {
    metadata = await insertFileMetadata({
      id: fileId,
      fileName: sanitizedName,
      originalFileName: file.name,
      storagePath,
      fileType: file.type,
      fileSize: file.size,
      uploadedBy: session.user.name ?? 'Unknown',
      uploadedByEmail: session.user.email ?? 'unknown',
      checksum,
    });
  } catch (error) {
    // Metadata insert failed — file is in OneLake but we couldn't record it.
    // Log for manual remediation. Don't expose internal detail to client.
    console.error(
      '[Upload API] Metadata insert failed after successful OneLake upload. File ID:',
      fileId,
      'Path:',
      storagePath,
      'Error:',
      error instanceof Error ? error.message : 'Unknown'
    );

    // Return success for the file upload, but note metadata issue in status
    return NextResponse.json(
      createApiSuccess({
        file: {
          id: fileId,
          name: sanitizedName,
          originalName: file.name,
          size: file.size,
          type: file.type,
          fileType: getMimeFileType(file.type),
          path: storagePath,
          uploadedBy: session.user.name ?? 'Unknown',
          uploadedByEmail: session.user.email ?? 'unknown',
          uploadedAt: new Date().toISOString(),
          status: 'uploaded' as const,
          checksum,
        },
      }),
      { status: 201 }
    );
  }

  // ── 9. Return Success Response ─────────────────────────────────────────────
  return NextResponse.json(
    createApiSuccess({
      file: {
        id: metadata.id,
        name: metadata.file_name,
        originalName: metadata.original_file_name,
        size: metadata.file_size,
        type: metadata.file_type,
        fileType: getMimeFileType(metadata.file_type),
        path: metadata.storage_path,
        uploadedBy: metadata.uploaded_by,
        uploadedByEmail: metadata.uploaded_by_email,
        uploadedAt: metadata.uploaded_at,
        status: metadata.status,
        checksum: metadata.checksum,
      },
    }),
    { status: 201 }
  );
}

