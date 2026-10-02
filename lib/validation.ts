/**
 * File Validation Module
 *
 * Provides Zod-based validation for file uploads including:
 * - File size limits (configurable via environment)
 * - MIME type allowlist
 * - Filename safety checks
 */

import { z } from 'zod';

// Maximum file size in bytes (default 100 MB, configurable via env)
export const MAX_FILE_SIZE_BYTES: number = (() => {
  const mb = parseInt(process.env.MAX_FILE_SIZE_MB ?? '100', 10);
  return (isNaN(mb) ? 100 : Math.max(1, Math.min(mb, 2048))) * 1024 * 1024;
})();

export const MAX_FILE_SIZE_MB_VALUE: number = MAX_FILE_SIZE_BYTES / (1024 * 1024);

/**
 * Default allowed MIME types.
 * These can be overridden via the ALLOWED_MIME_TYPES environment variable.
 */
const DEFAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/csv',
  'text/plain',
  'text/markdown',
  'application/json',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-tar',
  'application/gzip',
];

export const ALLOWED_MIME_TYPES: string[] = (() => {
  const envTypes = process.env.ALLOWED_MIME_TYPES;
  if (envTypes) {
    return envTypes.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_MIME_TYPES;
})();

/**
 * Zod schema for validating file upload parameters.
 * Used on the server to validate before sending to OneLake.
 */
export const fileUploadSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(260, 'Filename is too long')
    .refine((name) => !/[/\\:*?"<>|]/.test(name), 'Filename contains invalid characters')
    .refine((name) => !name.includes('..'), 'Filename cannot contain ".."'),
  mimeType: z
    .string()
    .min(1, 'MIME type is required')
    .refine((type) => ALLOWED_MIME_TYPES.includes(type), {
      message: `Unsupported file type. Allowed types: ${DEFAULT_ALLOWED_MIME_TYPES.join(', ')}`,
    }),
  fileSize: z
    .number()
    .positive('File size must be positive')
    .max(MAX_FILE_SIZE_BYTES, `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB_VALUE} MB`),
});

export type FileUploadInput = z.infer<typeof fileUploadSchema>;

/**
 * Validation result type
 */
export type ValidationResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Validates a file before upload.
 * Returns a structured result with a user-friendly error message on failure.
 */
export function validateFileUpload(
  filename: string,
  mimeType: string,
  fileSize: number
): ValidationResult {
  const result = fileUploadSchema.safeParse({ filename, mimeType, fileSize });

  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: firstError?.message ?? 'File validation failed.',
    };
  }

  return { success: true };
}

/**
 * Human-readable list of supported file types for display in the UI.
 */
export const SUPPORTED_TYPES_DISPLAY = [
  'PDF',
  'CSV',
  'Excel (.xlsx)',
  'JSON',
  'Text (.txt)',
  'Images (JPEG, PNG, GIF, WebP)',
  'ZIP',
  'Word (.docx)',
];
