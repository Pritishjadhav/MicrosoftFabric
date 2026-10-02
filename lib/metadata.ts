/**
 * Metadata Operations using Fabric Lakehouse SQL Analytics Endpoint
 *
 * Microsoft Fabric Lakehouse tables can be queried via the SQL Analytics Endpoint
 * using standard T-SQL through a REST API or ODBC/JDBC connection.
 *
 * For server-side Node.js, we use the Fabric REST API to execute SQL queries.
 * The file_metadata table is a Delta table managed by the Lakehouse.
 *
 * SETUP REQUIREMENT:
 * The file_metadata Delta table must be created manually in the Fabric Lakehouse.
 * See README.md for the exact SQL DDL to run in the Lakehouse SQL Analytics Endpoint.
 *
 * References:
 * https://learn.microsoft.com/en-us/fabric/data-warehouse/connectivity
 * https://learn.microsoft.com/en-us/rest/api/fabric/warehouse/items/run-on-demand-item-job
 */

import { v4 as uuidv4 } from 'uuid';
import { fabricApiRequest, getFabricConfig, FabricApiError } from './fabric';
import type { FileMetadata, FileStatus } from '@/types/file';
import type { FileFilters } from '@/types/file';

const TABLE_NAME = 'file_metadata';

/**
 * Executes a SQL query against the Fabric Warehouse/Lakehouse SQL endpoint
 * using the Fabric REST API execute endpoint.
 *
 * NOTE: The Fabric REST API for SQL execution is available on Warehouses.
 * For Lakehouses, we use the Lakehouse SQL Analytics Endpoint which requires
 * a Fabric Warehouse or the executeQueries endpoint introduced for Fabric.
 *
 * This implementation uses the Fabric Job API to submit SQL queries.
 */
async function executeSql(query: string, queryParams: unknown[] = []): Promise<unknown[]> {
  const config = getFabricConfig();

  if (!config.workspaceId || !config.lakehouseId) {
    throw new FabricApiError('Fabric configuration is incomplete.');
  }

  // Use Fabric Lakehouse SQL Analytics Endpoint via the executeQueries API
  // This submits a query to the Lakehouse SQL analytics endpoint
  // Pattern: /workspaces/{workspaceId}/items/{lakehouseId}/executeQueries

  // For metadata operations, we leverage the Fabric REST API
  // The actual SQL execution is done via the Fabric Data Warehouse endpoint
  // NOTE: This requires the Lakehouse to have the SQL Analytics Endpoint enabled
  const response = await fabricApiRequest<{ results?: { rows: unknown[] } }>(
    `/workspaces/${config.workspaceId}/items/${config.lakehouseId}/executeQueries`,
    {
      method: 'POST',
      body: JSON.stringify({
        queries: [
          {
            query,
            parameters: queryParams,
          },
        ],
      }),
    }
  );

  return response?.results?.rows ?? [];
}

/**
 * Inserts a file metadata record into the Delta table.
 * Called after a successful file upload to OneLake.
 */
export async function insertFileMetadata(params: {
  id: string;
  fileName: string;
  originalFileName: string;
  storagePath: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedByEmail: string;
  checksum: string | null;
}): Promise<FileMetadata> {
  const now = new Date().toISOString();

  const metadata: FileMetadata = {
    id: params.id,
    file_name: params.fileName,
    original_file_name: params.originalFileName,
    storage_path: params.storagePath,
    file_type: params.fileType,
    file_size: params.fileSize,
    uploaded_by: params.uploadedBy,
    uploaded_by_email: params.uploadedByEmail,
    uploaded_at: now,
    status: 'uploaded',
    checksum: params.checksum,
    created_at: now,
    updated_at: now,
  };

  await executeSql(
    `INSERT INTO ${TABLE_NAME} 
     (id, file_name, original_file_name, storage_path, file_type, file_size, 
      uploaded_by, uploaded_by_email, uploaded_at, status, checksum, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      metadata.id,
      metadata.file_name,
      metadata.original_file_name,
      metadata.storage_path,
      metadata.file_type,
      metadata.file_size,
      metadata.uploaded_by,
      metadata.uploaded_by_email,
      metadata.uploaded_at,
      metadata.status,
      metadata.checksum,
      metadata.created_at,
      metadata.updated_at,
    ]
  );

  return metadata;
}

/**
 * Retrieves file metadata records with filtering, sorting, and pagination.
 */
export async function listFileMetadata(
  filters: FileFilters = {}
): Promise<{ files: FileMetadata[]; total: number }> {
  const {
    search,
    fileType,
    sortBy = 'uploadedAt',
    sortOrder = 'desc',
    page = 1,
    pageSize = 20,
  } = filters;

  const offset = (page - 1) * pageSize;

  const sortColumnMap: Record<string, string> = {
    name: 'file_name',
    size: 'file_size',
    uploadedAt: 'uploaded_at',
  };

  const orderColumn = sortColumnMap[sortBy] ?? 'uploaded_at';
  const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  let whereClause = "WHERE status != 'deleting'";
  const queryParams: unknown[] = [];

  if (search) {
    whereClause += ` AND (LOWER(file_name) LIKE ? OR LOWER(original_file_name) LIKE ?)`;
    queryParams.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
  }

  if (fileType && fileType !== 'all') {
    // Map FileType enum to MIME type prefixes for filtering
    const mimePrefix = fileTypeToMimePrefix(fileType);
    if (mimePrefix) {
      whereClause += ` AND file_type LIKE ?`;
      queryParams.push(`${mimePrefix}%`);
    }
  }

  const rows = await executeSql(
    `SELECT id, file_name, original_file_name, storage_path, file_type, file_size,
            uploaded_by, uploaded_by_email, uploaded_at, status, checksum, created_at, updated_at
     FROM ${TABLE_NAME}
     ${whereClause}
     ORDER BY ${orderColumn} ${orderDir}
     LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, offset]
  );

  const countRows = await executeSql(
    `SELECT COUNT(*) as total FROM ${TABLE_NAME} ${whereClause}`,
    queryParams
  );

  const total = (countRows[0] as { total: number })?.total ?? 0;
  const files = (rows as FileMetadata[]) ?? [];

  return { files, total };
}

/**
 * Retrieves a single file metadata record by ID.
 */
export async function getFileMetadataById(id: string): Promise<FileMetadata | null> {
  const rows = await executeSql(
    `SELECT id, file_name, original_file_name, storage_path, file_type, file_size,
            uploaded_by, uploaded_by_email, uploaded_at, status, checksum, created_at, updated_at
     FROM ${TABLE_NAME}
     WHERE id = ? AND status != 'deleting'`,
    [id]
  );

  return (rows[0] as FileMetadata) ?? null;
}

/**
 * Marks a file as deleted in the metadata table.
 * The record is retained for audit purposes with status = 'deleting'.
 */
export async function markFileDeleted(id: string): Promise<void> {
  await executeSql(
    `UPDATE ${TABLE_NAME} SET status = 'deleting', updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
}

/**
 * Permanently removes a file metadata record from the table.
 */
export async function deleteFileMetadata(id: string): Promise<void> {
  await executeSql(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
}

/**
 * Updates the status of a file record.
 */
export async function updateFileStatus(id: string, status: FileStatus): Promise<void> {
  await executeSql(
    `UPDATE ${TABLE_NAME} SET status = ?, updated_at = ? WHERE id = ?`,
    [status, new Date().toISOString(), id]
  );
}

/**
 * Maps FileType enum values to MIME type prefixes for SQL LIKE queries.
 */
function fileTypeToMimePrefix(fileType: string): string | null {
  const prefixMap: Record<string, string> = {
    pdf: 'application/pdf',
    csv: 'text/csv',
    excel: 'application/vnd',
    json: 'application/json',
    text: 'text/',
    image: 'image/',
    zip: 'application/zip',
  };
  return prefixMap[fileType] ?? null;
}

/**
 * Generates a new UUID for file IDs.
 */
export function generateFileId(): string {
  return uuidv4();
}
