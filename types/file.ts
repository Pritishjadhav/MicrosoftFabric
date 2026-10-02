/**
 * File-related TypeScript type definitions
 * These types are shared between the frontend and API layer.
 */

export type FileStatus = 'pending' | 'uploading' | 'uploaded' | 'failed' | 'deleting';

export type FileType =
  | 'pdf'
  | 'csv'
  | 'excel'
  | 'json'
  | 'text'
  | 'image'
  | 'zip'
  | 'generic';

export interface FileMetadata {
  id: string;
  file_name: string;
  original_file_name: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_by_email: string;
  uploaded_at: string;
  status: FileStatus;
  checksum: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  fileType: FileType;
  path: string;
  uploadedBy: string;
  uploadedByEmail: string;
  uploadedAt: string;
  status: FileStatus;
  checksum: string | null;
}

export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: FileStatus;
  error?: string;
}

export interface FileListResponse {
  success: true;
  data: {
    files: UploadedFile[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface FileUploadResponse {
  success: true;
  data: {
    file: UploadedFile;
  };
}

export interface FileDeleteResponse {
  success: true;
  data: {
    id: string;
    message: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = T | ApiErrorResponse;

export interface FileFilters {
  search?: string;
  fileType?: FileType | 'all';
  sortBy?: 'name' | 'size' | 'uploadedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export const FILE_TYPE_MAP: Record<string, FileType> = {
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/json': 'json',
  'text/plain': 'text',
  'text/markdown': 'text',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/x-tar': 'zip',
  'application/gzip': 'zip',
};

export function getMimeFileType(mimeType: string): FileType {
  return FILE_TYPE_MAP[mimeType] ?? 'generic';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
