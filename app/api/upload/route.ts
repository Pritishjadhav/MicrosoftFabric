import { NextRequest, NextResponse } from 'next/server';
import { validateFileUpload } from '@/lib/validation';
import { uploadFileToOneLake, generateStoragePath, sanitizeFilename } from '@/lib/onelake';
import { createApiError, createApiSuccess, computeChecksum, toUserFriendlyError } from '@/lib/utils';
import { getMimeFileType } from '@/types/file';
import { isFabricConfigured } from '@/lib/fabric';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  // ── 1. Check Fabric Configuration ──────────────────────────────────────────
  if (!isFabricConfigured()) {
    return NextResponse.json(
      createApiError(
        'FABRIC_NOT_CONFIGURED',
        'Microsoft Fabric is not configured on this server. Please contact your administrator.'
      ),
      { status: 503 }
    );
  }

  // ── 2. Parse Multipart Form Data ───────────────────────────────────────────
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

  // ── 3. Validate File ───────────────────────────────────────────────────────
  const validation = validateFileUpload(file.name, file.type, file.size);
  if (!validation.success) {
    return NextResponse.json(createApiError('VALIDATION_FAILED', validation.error), {
      status: 422,
    });
  }

  // ── 4. Prepare File Data ───────────────────────────────────────────────────
  const fileId = randomUUID();
  const sanitizedName = sanitizeFilename(file.name);
  const storagePath = generateStoragePath(file.name, fileId);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // ── 5. Upload to OneLake ───────────────────────────────────────────────────
  try {
    await uploadFileToOneLake(storagePath, fileBuffer, file.type);
  } catch (error) {
    console.error('[Upload API] OneLake upload failed:', error instanceof Error ? error.message : 'Unknown error');
    const { code, message } = toUserFriendlyError(error);
    return NextResponse.json(createApiError(code, `Upload failed: ${message}`), {
      status: 502,
    });
  }

  // ── 6. Compute Checksum ────────────────────────────────────────────────────
  let checksum: string | null = null;
  try {
    checksum = await computeChecksum(fileBuffer);
  } catch {
    // Non-fatal: continue without checksum
    console.warn('[Upload API] Failed to compute file checksum.');
  }

  // ── 7. Return Success Response ─────────────────────────────────────────────
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
        uploadedBy: 'Unknown',
        uploadedByEmail: '',
        uploadedAt: new Date().toISOString(),
        status: 'completed',
        checksum,
      },
    }),
    { status: 201 }
  );
}
