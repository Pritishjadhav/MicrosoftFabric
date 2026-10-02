/**
 * OneLake File Operations
 *
 * Implements file operations against Microsoft Fabric OneLake using the
 * ADLS Gen2-compatible DFS REST API.
 *
 * OneLake DFS endpoint pattern:
 *   https://onelake.dfs.fabric.microsoft.com/{workspaceId}/{lakehouseId}/Files/{path}
 *
 * Upload process (ADLS Gen2 protocol):
 *   1. PUT  ?resource=file            → Create the file resource
 *   2. PATCH ?action=append&position=0 → Append data
 *   3. PATCH ?action=flush&position=N  → Commit (flush) the file
 *
 * References:
 *   https://learn.microsoft.com/en-us/rest/api/storageservices/datalakestoragegen2/path/create
 *   https://learn.microsoft.com/en-us/rest/api/storageservices/datalakestoragegen2/path/update
 *   https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-directory-file-acl-javascript
 */

import { onelakeRequest, FabricApiError } from './fabric';
import type { UploadedFile } from '@/types/file';
import { getMimeFileType } from '@/types/file';

/**
 * Represents information about a file stored in OneLake.
 */
export interface OneLakeFileInfo {
  name: string;
  contentLength: number;
  lastModified: string;
  contentType: string;
  eTag: string;
}

/**
 * Uploads a file buffer to OneLake Lakehouse Files section.
 *
 * The ADLS Gen2 upload protocol requires three steps:
 *   1. Create: Initialize the file path
 *   2. Append: Stream the data
 *   3. Flush:  Commit the upload
 *
 * @param storagePath  - Relative path within Lakehouse Files, e.g. "uploads/2026/10/uuid-filename.csv"
 * @param fileBuffer   - File content as a Buffer
 * @param contentType  - MIME type of the file
 */
export async function uploadFileToOneLake(
  storagePath: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<void> {
  const dfsPath = `/Files/${storagePath}`;
  const fileSize = fileBuffer.byteLength;

  // ──────────────────────────────────────────────
  // Step 1: Create the file resource
  // ──────────────────────────────────────────────
  const createResponse = await onelakeRequest(
    `${dfsPath}?resource=file`,
    { method: 'PUT' },
    {
      'Content-Length': '0',
      'x-ms-content-type': contentType,
    }
  );

  if (!createResponse.ok) {
    const body = await createResponse.text().catch(() => '');
    throw new FabricApiError(
      `OneLake: Failed to create file resource at "${storagePath}". Status: ${createResponse.status}. ${body}`,
      createResponse.status
    );
  }

  // ──────────────────────────────────────────────
  // Step 2: Append the file data
  // ──────────────────────────────────────────────
  const appendResponse = await onelakeRequest(
    `${dfsPath}?action=append&position=0`,
    {
      method: 'PATCH',
      body: new Uint8Array(fileBuffer),
    },
    {
      'Content-Length': String(fileSize),
      'Content-Type': 'application/octet-stream',
    }
  );

  if (!appendResponse.ok) {
    const body = await appendResponse.text().catch(() => '');
    throw new FabricApiError(
      `OneLake: Failed to append data to "${storagePath}". Status: ${appendResponse.status}. ${body}`,
      appendResponse.status
    );
  }

  // ──────────────────────────────────────────────
  // Step 3: Flush (commit) the file
  // ──────────────────────────────────────────────
  const flushResponse = await onelakeRequest(
    `${dfsPath}?action=flush&position=${fileSize}`,
    { method: 'PATCH' },
    {
      'Content-Length': '0',
    }
  );

  if (!flushResponse.ok) {
    const body = await flushResponse.text().catch(() => '');
    throw new FabricApiError(
      `OneLake: Failed to flush (commit) file at "${storagePath}". Status: ${flushResponse.status}. ${body}`,
      flushResponse.status
    );
  }
}

/**
 * Deletes a file from OneLake Lakehouse Files.
 *
 * @param storagePath - Relative path within Lakehouse Files
 */
export async function deleteFileFromOneLake(storagePath: string): Promise<void> {
  const dfsPath = `/Files/${storagePath}`;

  const response = await onelakeRequest(
    `${dfsPath}?recursive=false`,
    { method: 'DELETE' }
  );

  if (!response.ok && response.status !== 404) {
    const body = await response.text().catch(() => '');
    throw new FabricApiError(
      `OneLake: Failed to delete file at "${storagePath}". Status: ${response.status}. ${body}`,
      response.status
    );
  }
}

/**
 * Downloads a file from OneLake and returns it as a Buffer.
 *
 * @param storagePath - Relative path within Lakehouse Files
 */
export async function downloadFileFromOneLake(storagePath: string): Promise<{
  buffer: Buffer;
  contentType: string;
  contentLength: number;
}> {
  const dfsPath = `/Files/${storagePath}`;

  const response = await onelakeRequest(dfsPath, { method: 'GET' });

  if (!response.ok) {
    throw new FabricApiError(
      `OneLake: Failed to download file at "${storagePath}". Status: ${response.status}.`,
      response.status
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);

  return { buffer, contentType, contentLength: contentLength || buffer.byteLength };
}

/**
 * Checks whether a file exists in OneLake by performing a HEAD request.
 *
 * @param storagePath - Relative path within Lakehouse Files
 */
export async function fileExistsInOneLake(storagePath: string): Promise<boolean> {
  const dfsPath = `/Files/${storagePath}`;

  const response = await onelakeRequest(dfsPath, { method: 'HEAD' });

  return response.ok;
}

/**
 * Generates a safe, predictable storage path for a file upload.
 * Pattern: uploads/YYYY/MM/{uuid}-{sanitizedFilename}
 *
 * @param originalFilename - The original filename from the user's upload
 * @param fileId           - A UUID to ensure uniqueness
 */
export function generateStoragePath(originalFilename: string, fileId: string): string {
  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const safeFilename = sanitizeFilename(originalFilename);
  return `uploads/${year}/${month}/${fileId}-${safeFilename}`;
}

/**
 * Sanitizes a filename to prevent path traversal and invalid characters.
 * - Removes directory separators
 * - Strips characters that are not alphanumeric, dots, dashes, or underscores
 * - Truncates to a safe length
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  const basename = filename.replace(/.*[/\\]/, '');

  // Replace spaces with underscores, remove dangerous characters
  const sanitized = basename
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.') // Prevent multiple consecutive dots
    .replace(/^\./, '');     // Prevent leading dot

  // Ensure the filename isn't empty after sanitization
  if (!sanitized) {
    return 'unnamed_file';
  }

  // Truncate to 200 characters while preserving extension
  if (sanitized.length > 200) {
    const ext = sanitized.lastIndexOf('.');
    if (ext > 0) {
      const extension = sanitized.slice(ext);
      return sanitized.slice(0, 200 - extension.length) + extension;
    }
    return sanitized.slice(0, 200);
  }

  return sanitized;
}

/**
 * Lists files in a specific OneLake directory using the ADLS Gen2 API.
 *
 * @param directory - The directory path, e.g., "Files/uploads"
 */
export async function listFilesInOneLake(directory: string = 'Files/uploads'): Promise<UploadedFile[]> {
  // Query the ADLS Gen2 endpoint to list paths
  // Using lakehouseId as the "filesystem" equivalent
  const response = await onelakeRequest(
    `?resource=filesystem&recursive=true&directory=${directory}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    if (response.status === 404) {
      // Directory doesn't exist yet, return empty array
      return [];
    }
    const body = await response.text().catch(() => '');
    throw new FabricApiError(
      `OneLake: Failed to list files in "${directory}". Status: ${response.status}. ${body}`,
      response.status
    );
  }

  const data = await response.json();
  const paths: { name: string; isDirectory: boolean; contentLength: string; lastModified: string }[] = data.paths || [];

  return paths
    .filter((p) => !p.isDirectory)
    .map((p) => {
      // Extract original filename from UUID-filename pattern if possible
      const basename = p.name.split('/').pop() || '';
      let originalName = basename;
      let id = basename;
      const match = basename.match(/^([a-f0-9-]+)-(.*)$/);
      if (match) {
        id = match[1];
        originalName = match[2];
      }

      // Ensure proper typing for length
      const size = parseInt(p.contentLength || '0', 10);
      
      return {
        id,
        name: basename,
        originalName,
        size,
        type: 'application/octet-stream', // Can't easily infer MIME from just list response, could use extension map
        fileType: getMimeFileType('application/octet-stream'),
        path: p.name.replace(/^Files\//, ''), // Strip "Files/" prefix for consistency with upload routes
        uploadedBy: 'Unknown',
        uploadedByEmail: '',
        uploadedAt: new Date(p.lastModified).toISOString(),
        status: 'uploaded' as const,
        checksum: null,
      };
    })
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}
