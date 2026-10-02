/**
 * GET /api/files/[id]  — Download a file
 * DELETE /api/files/[id] — Delete a file
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isFabricConfigured } from '@/lib/auth';
import { getFileMetadataById, deleteFileMetadata } from '@/lib/metadata';
import { downloadFileFromOneLake, deleteFileFromOneLake } from '@/lib/onelake';
import { createApiError, createApiSuccess, toUserFriendlyError } from '@/lib/utils';

// ── GET /api/files/[id] ───────────────────────────────────────────────────────
// Downloads a file securely. The server fetches it from OneLake and streams it
// to the client. The storage path is never exposed directly to the browser.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(createApiError('UNAUTHORIZED', 'You must be signed in to download files.'), {
      status: 401,
    });
  }

  if (!isFabricConfigured()) {
    return NextResponse.json(
      createApiError('FABRIC_NOT_CONFIGURED', 'Microsoft Fabric is not configured.'),
      { status: 503 }
    );
  }

  if (!id) {
    return NextResponse.json(createApiError('MISSING_ID', 'File ID is required.'), { status: 400 });
  }

  // Look up metadata
  let metadata;
  try {
    metadata = await getFileMetadataById(id);
  } catch (error) {
    console.error('[Download API] Metadata lookup failed:', error instanceof Error ? error.message : error);
    const { code, message } = toUserFriendlyError(error);
    return NextResponse.json(createApiError(code, message), { status: 502 });
  }

  if (!metadata) {
    return NextResponse.json(createApiError('FILE_NOT_FOUND', 'The requested file was not found.'), {
      status: 404,
    });
  }

  // Download from OneLake
  try {
    const { buffer, contentType } = await downloadFileFromOneLake(metadata.storage_path);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(metadata.original_file_name)}"`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-store, no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[Download API] OneLake download failed:', error instanceof Error ? error.message : error);
    const { code, message } = toUserFriendlyError(error);
    return NextResponse.json(createApiError(code, `Download failed: ${message}`), { status: 502 });
  }
}

// ── DELETE /api/files/[id] ────────────────────────────────────────────────────
// Deletes a file from OneLake and removes its metadata record.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(createApiError('UNAUTHORIZED', 'You must be signed in to delete files.'), {
      status: 401,
    });
  }

  if (!isFabricConfigured()) {
    return NextResponse.json(
      createApiError('FABRIC_NOT_CONFIGURED', 'Microsoft Fabric is not configured.'),
      { status: 503 }
    );
  }

  if (!id) {
    return NextResponse.json(createApiError('MISSING_ID', 'File ID is required.'), { status: 400 });
  }

  // Look up metadata
  let metadata;
  try {
    metadata = await getFileMetadataById(id);
  } catch (error) {
    console.error('[Delete API] Metadata lookup failed:', error instanceof Error ? error.message : error);
    const { code, message } = toUserFriendlyError(error);
    return NextResponse.json(createApiError(code, message), { status: 502 });
  }

  if (!metadata) {
    return NextResponse.json(createApiError('FILE_NOT_FOUND', 'The requested file was not found.'), {
      status: 404,
    });
  }

  // Delete from OneLake
  try {
    await deleteFileFromOneLake(metadata.storage_path);
  } catch (error) {
    console.error('[Delete API] OneLake delete failed:', error instanceof Error ? error.message : error);
    const { code, message } = toUserFriendlyError(error);
    return NextResponse.json(createApiError(code, `Delete failed: ${message}`), { status: 502 });
  }

  // Remove metadata record
  try {
    await deleteFileMetadata(id);
  } catch (error) {
    // File is deleted from OneLake but metadata removal failed.
    // Log for remediation but don't fail the response.
    console.error(
      '[Delete API] Metadata deletion failed for file ID:',
      id,
      'Error:',
      error instanceof Error ? error.message : error
    );
  }

  return NextResponse.json(
    createApiSuccess({
      id,
      message: `File "${metadata.original_file_name}" was deleted successfully.`,
    })
  );
}
