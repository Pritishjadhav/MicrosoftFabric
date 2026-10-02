import { NextRequest, NextResponse } from 'next/server';
import { isFabricConfigured } from '@/lib/fabric';
import { downloadFileFromOneLake, deleteFileFromOneLake } from '@/lib/onelake';
import { createApiError, createApiSuccess, toUserFriendlyError } from '@/lib/utils';

// ── GET /api/file?path=... ───────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!isFabricConfigured()) {
    return NextResponse.json(
      createApiError('FABRIC_NOT_CONFIGURED', 'Microsoft Fabric is not configured.'),
      { status: 503 }
    );
  }

  const { searchParams } = request.nextUrl;
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json(createApiError('MISSING_PATH', 'File path is required.'), { status: 400 });
  }

  // Prevent path traversal
  if (path.includes('..') || path.startsWith('/')) {
    return NextResponse.json(createApiError('INVALID_PATH', 'Invalid file path.'), { status: 400 });
  }

  // Download from OneLake
  try {
    const { buffer, contentType } = await downloadFileFromOneLake(path);
    const filename = path.split('/').pop() || 'download';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
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

// ── DELETE /api/file?path=... ────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  if (!isFabricConfigured()) {
    return NextResponse.json(
      createApiError('FABRIC_NOT_CONFIGURED', 'Microsoft Fabric is not configured.'),
      { status: 503 }
    );
  }

  const { searchParams } = request.nextUrl;
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json(createApiError('MISSING_PATH', 'File path is required.'), { status: 400 });
  }

  // Prevent path traversal
  if (path.includes('..') || path.startsWith('/')) {
    return NextResponse.json(createApiError('INVALID_PATH', 'Invalid file path.'), { status: 400 });
  }

  // Delete from OneLake
  try {
    await deleteFileFromOneLake(path);
  } catch (error) {
    console.error('[Delete API] OneLake delete failed:', error instanceof Error ? error.message : error);
    const { code, message } = toUserFriendlyError(error);
    return NextResponse.json(createApiError(code, `Delete failed: ${message}`), { status: 502 });
  }

  const filename = path.split('/').pop() || 'File';
  
  return NextResponse.json(
    createApiSuccess({
      message: `"${filename}" was deleted successfully.`,
    })
  );
}
