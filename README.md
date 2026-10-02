# Microsoft Fabric File Uploader

A simple, unauthenticated file manager designed to directly upload, list, download, and delete files in Microsoft Fabric's OneLake (Lakehouse Files).

## Features

- **Direct to OneLake**: Uses the ADLS Gen2 DFS API to interact directly with Microsoft Fabric OneLake.
- **No Database**: Reads directory structures and files directly from OneLake.
- **No Login Required**: The application is designed for internal/trusted network use without an authentication layer.
- **File Management**: Upload, list, download, and delete files.
- **UI & UX**: Beautiful UI built with Next.js, Tailwind CSS, and Lucide icons.

---

## Environment Variables

The app requires configuration for the backend to authenticate with Microsoft Fabric.

| Variable | Required | Description |
| :--- | :---: | :--- |
| `AZURE_TENANT_ID` | ✅ | Azure AD Tenant ID |
| `AZURE_CLIENT_ID` | ✅ | Azure AD App Registration Client ID |
| `AZURE_CLIENT_SECRET` | ✅ | Azure AD App Registration Client Secret |
| `FABRIC_WORKSPACE_ID` | ✅ | Fabric Workspace GUID |
| `FABRIC_LAKEHOUSE_ID` | ✅ | Fabric Lakehouse GUID |
| `MAX_FILE_SIZE_MB` | ❌ | Max upload size in MB (default: 100) |
| `ALLOWED_MIME_TYPES` | ❌ | Comma-separated MIME type allowlist |

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and fill in all required values
```

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Testing the upload flow

1. Open the application in your browser.
2. Navigate to **Upload** in the sidebar.
3. Drag a file (e.g., a CSV) into the drop zone.
4. Click **Upload Files**.
5. The file should upload to OneLake at `Files/uploads/YYYY/MM/{uuid}-{filename}`.
6. The dashboard will list files directly from OneLake.

---

## API Documentation

### `POST /api/upload`

Upload a file to OneLake.

**Request:** `multipart/form-data` with field `file`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "...",
      "name": "...",
      "originalName": "students.csv",
      "path": "uploads/2026/10/550e8400-students.csv"
    }
  }
}
```

---

### `GET /api/files`

List files with optional filters.

**Query Parameters:**
- `search` - Text search
- `fileType` - `pdf | csv | excel | json | text | image | zip | all`
- `sortBy` - `name | size | uploadedAt`
- `sortOrder` - `asc | desc`
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20, max: 100)

---

### `GET /api/file?path=...`

Download a file. Returns the file as a binary stream with appropriate headers.

**Query Parameter:**
- `path` - the file path in OneLake (e.g. `uploads/2026/10/uuid-file.txt`)

---

### `DELETE /api/file?path=...`

Delete a file from OneLake.

**Query Parameter:**
- `path` - the file path in OneLake (e.g. `uploads/2026/10/uuid-file.txt`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "\"students.csv\" was deleted successfully."
  }
}
```

---

## Security

### Implemented Security Measures

- ✅ **Client credentials for Fabric** — separate service principal for server-side Fabric API calls
- ✅ **Input validation** — Zod schema for file type, size, and name
- ✅ **Filename sanitization** — prevents path traversal (`../`, absolute paths, special characters)
- ✅ **Server-generated storage paths** — clients cannot specify where files are stored
- ✅ **No secrets in client code** — all `.env` variables are server-only
- ✅ **Secure error messages** — internal errors are not exposed to users
- ✅ **No access token logging** — tokens are never written to logs
- ✅ **Security headers** — `X-Frame-Options`, `X-Content-Type-Options`, etc.

### What Is NOT Implemented (for production, add these)

- ❌ **Authentication** — Application is open and has NO user authentication
- ❌ **Rate limiting** — Add a rate limiting library (e.g., `upstash/ratelimit`)
- ❌ **Virus scanning** — Add file scanning before storing
- ❌ **Large file chunked upload** — Files > 100MB should use streaming upload

---

## Troubleshooting

### "Microsoft Fabric Not Configured"

Check that all required environment variables are set:
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `FABRIC_WORKSPACE_ID`
- `FABRIC_LAKEHOUSE_ID`

### "OneLake upload failed: 403"

The service principal doesn't have access to the Fabric workspace. Add it as a **Contributor** in the workspace **Manage access** settings.

### "Failed to acquire authentication token"

Verify your `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and `AZURE_TENANT_ID` are correct.

### Upload times out for large files

The default Next.js server action body limit may be too small. The `next.config.ts` sets it to 105MB. For files larger than this, implement a chunked/direct-to-OneLake upload pattern using SAS tokens.

---

## License

Internal enterprise use only.
