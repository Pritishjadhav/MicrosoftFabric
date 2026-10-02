/**
 * GET /api/files
 *
 * Returns a paginated, filterable list of files accessible to the authenticated user.
 *
 * Query Parameters:
 *   search    - Text search across filename
 *   fileType  - Filter by type: pdf | csv | excel | json | text | image | zip | all
 *   sortBy    - Sort field: name | size | uploadedAt (default: uploadedAt)
 *   sortOrder - Sort direction: asc | desc (default: desc)
 *   page      - Page number (default: 1)
 *   pageSize  - Items per page (default: 20, max: 100)
 *
 * SECURITY:
 *   - Requires authenticated session
 *   - Returns only public metadata fields
 *   - No storage paths exposed if unnecessary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isFabricConfigured } from '@/lib/auth';
import { listFileMetadata } from '@/lib/metadata';
import { metadataToUploadedFile } from '@/lib/onelake';
import { createApiError, createApiSuccess, toUserFriendlyError } from '@/lib/utils';
import type { FileFilters, FileType } from '@/types/file';

export async function GET(request: NextRequest) {
  // ── Authenticate ──────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(createApiError('UNAUTHORIZED', 'You must be signed in to view files.'), {
      status: 401,
    });
  }

  // ── Check Fabric Configuration ────────────────────────────────────────────
  if (!isFabricConfigured()) {
    // Return empty list rather than error so the UI can show setup instructions
    return NextResponse.json(
      createApiSuccess({
        files: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        configured: false,
      })
    );
  }

  // ── Parse Query Parameters ────────────────────────────────────────────────
  const { searchParams } = request.nextUrl;

  const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
  const rawPageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const pageSize = isNaN(rawPageSize) ? 20 : Math.min(Math.max(rawPageSize, 1), 100);

  const filters: FileFilters = {
    search: searchParams.get('search') ?? undefined,
    fileType: (searchParams.get('fileType') as FileType) ?? 'all',
    sortBy: (searchParams.get('sortBy') as FileFilters['sortBy']) ?? 'uploadedAt',
    sortOrder: (searchParams.get('sortOrder') as FileFilters['sortOrder']) ?? 'desc',
    page,
    pageSize,
  };

  // ── Fetch Metadata ────────────────────────────────────────────────────────
  try {
    const { files: metadataRecords, total } = await listFileMetadata(filters);

    const files = metadataRecords.map(metadataToUploadedFile);
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json(
      createApiSuccess({
        files,
        total,
        page,
        pageSize,
        totalPages,
        configured: true,
      })
    );
  } catch (error) {
    console.error('[Files API] Failed to list files:', error instanceof Error ? error.message : 'Unknown');
    const { code, message } = toUserFriendlyError(error);
    return NextResponse.json(createApiError(code, message), { status: 502 });
  }
}
