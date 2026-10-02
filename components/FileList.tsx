'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, Search, RefreshCw, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { FileIconBadge } from './FileIcon';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { TableSkeleton } from './LoadingState';
import { formatFileSize, getMimeFileType } from '@/types/file';
import { timeAgo } from '@/lib/utils';
import type { UploadedFile, FileType, FileFilters } from '@/types/file';

type SortField = 'name' | 'size' | 'uploadedAt';
type SortOrder = 'asc' | 'desc';

const FILE_TYPE_OPTIONS: { value: FileType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'zip', label: 'ZIP' },
];

export function FileList() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState<FileType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortField>('uploadedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<UploadedFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Download tracking
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      search,
      fileType,
      sortBy,
      sortOrder,
      page: String(page),
      pageSize: '20',
    });

    try {
      const res = await fetch(`/api/files?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message ?? 'Failed to load files.');
      }

      setFiles(data.data.files);
      setTotalPages(data.data.totalPages);
      setTotal(data.data.total);
      setIsConfigured(data.data.configured !== false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files.');
    } finally {
      setIsLoading(false);
    }
  }, [search, fileType, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/files/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message ?? 'Delete failed.');
      }

      toast.success(`"${deleteTarget.originalName}" deleted successfully.`);
      setDeleteTarget(null);
      fetchFiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete file.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    setDownloadingId(file.id);
    toast.info(`Preparing download for "${file.originalName}"...`);

    try {
      const res = await fetch(`/api/files/${file.id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message ?? 'Download failed.');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`"${file.originalName}" downloaded.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp size={14} className="text-blue-500 inline ml-1" />
    ) : (
      <ChevronDown size={14} className="text-blue-500 inline ml-1" />
    );
  };

  // Show skeleton
  if (isLoading) return <TableSkeleton rows={6} />;

  // Show error
  if (error) return <ErrorState message={error} onRetry={fetchFiles} />;

  // Fabric not configured
  if (!isConfigured) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        Microsoft Fabric is not configured. File listing is unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search files..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9"
            aria-label="Search files"
          />
        </div>

        {/* Type filter */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={fileType}
            onChange={(e) => { setFileType(e.target.value as FileType | 'all'); setPage(1); }}
            className="input select pl-8 pr-8 w-full sm:w-36"
            aria-label="Filter by file type"
          >
            {FILE_TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Refresh */}
        <button
          onClick={fetchFiles}
          className="btn btn-secondary"
          aria-label="Refresh file list"
        >
          <RefreshCw size={15} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Empty state */}
      {files.length === 0 && !isLoading && (
        <EmptyState
          title={search ? 'No matching files' : 'No files yet'}
          description={
            search
              ? `No files found matching "${search}". Try a different search term.`
              : 'Upload your first file to get started.'
          }
          showUploadButton={!search}
        />
      )}

      {/* File table */}
      {files.length > 0 && (
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[auto_1fr_120px_160px_120px_120px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>Type</span>
            <button
              onClick={() => handleSort('name')}
              className="text-left hover:text-slate-700 transition-colors"
              aria-label="Sort by file name"
            >
              File <SortIcon field="name" />
            </button>
            <button
              onClick={() => handleSort('size')}
              className="text-left hover:text-slate-700 transition-colors"
              aria-label="Sort by file size"
            >
              Size <SortIcon field="size" />
            </button>
            <button
              onClick={() => handleSort('uploadedAt')}
              className="text-left hover:text-slate-700 transition-colors"
              aria-label="Sort by upload date"
            >
              Uploaded <SortIcon field="uploadedAt" />
            </button>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {/* Rows */}
          <ul className="divide-y divide-slate-50" aria-label="File list">
            {files.map((file) => {
              const fileType = getMimeFileType(file.type);
              const isDownloading = downloadingId === file.id;

              return (
                <li
                  key={file.id}
                  className="table-row px-5 py-4 grid md:grid-cols-[auto_1fr_120px_160px_120px_120px] grid-cols-[auto_1fr_auto] gap-4 items-center"
                >
                  {/* Icon */}
                  <FileIconBadge fileType={fileType} size="sm" />

                  {/* Name + metadata */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      by {file.uploadedBy}
                      <span className="inline md:hidden"> · {formatFileSize(file.size)}</span>
                    </p>
                  </div>

                  {/* Size */}
                  <span className="hidden md:block text-sm text-slate-500">
                    {formatFileSize(file.size)}
                  </span>

                  {/* Upload time */}
                  <span
                    className="hidden md:block text-sm text-slate-500"
                    title={new Date(file.uploadedAt).toLocaleString()}
                  >
                    {timeAgo(file.uploadedAt)}
                  </span>

                  {/* Status */}
                  <div className="hidden md:flex">
                    <span
                      className={`badge ${
                        file.status === 'uploaded'
                          ? 'badge-success'
                          : file.status === 'failed'
                          ? 'badge-error'
                          : 'badge-info'
                      }`}
                    >
                      {file.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end md:justify-start">
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={isDownloading}
                      className="btn btn-ghost btn-sm"
                      aria-label={`Download ${file.originalName}`}
                      title="Download"
                    >
                      {isDownloading ? (
                        <RefreshCw size={14} className="spin" />
                      ) : (
                        <Download size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(file)}
                      className="btn btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${file.originalName}`}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500">
                {total} file{total !== 1 ? 's' : ''} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary btn-sm"
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500 px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-secondary btn-sm"
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete dialog */}
      <ConfirmDeleteDialog
        fileName={deleteTarget?.originalName ?? ''}
        isOpen={deleteTarget !== null}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => !isDeleting && setDeleteTarget(null)}
      />
    </div>
  );
}
