import { NextRequest, NextResponse } from 'next/server';
import { isFabricConfigured } from '@/lib/fabric';
import { listFilesInOneLake } from '@/lib/onelake';
import { createApiError, createApiSuccess, toUserFriendlyError } from '@/lib/utils';
import type { FileFilters, FileType } from '@/types/file';

export async function GET(request: NextRequest) {
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

  // ── Fetch Files from OneLake ──────────────────────────────────────────────
  try {
    let files = await listFilesInOneLake('Files/uploads');

    // ── Client-side filtering and sorting ───────────────────────────────────
    if (filters.search) {
      const q = filters.search.toLowerCase();
      files = files.filter((f) => f.originalName.toLowerCase().includes(q));
    }

    if (filters.fileType && filters.fileType !== 'all') {
      files = files.filter((f) => f.fileType === filters.fileType);
    }

    files.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = a.originalName.localeCompare(b.originalName);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'uploadedAt':
        default:
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    const total = files.length;
    const totalPages = Math.ceil(total / pageSize);
    const paginatedFiles = files.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json(
      createApiSuccess({
        files: paginatedFiles,
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
