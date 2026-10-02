# Fabric File Manager

A production-ready, professional web application for securely uploading, managing, and organizing files in **Microsoft Fabric Lakehouse / OneLake** — authenticated via **Microsoft Entra ID**.

![Built with Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Microsoft Fabric](https://img.shields.io/badge/Microsoft%20Fabric-OneLake-purple)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Prerequisites](#prerequisites)
5. [Microsoft Fabric Setup](#microsoft-fabric-setup)
6. [Microsoft Entra ID Setup](#microsoft-entra-id-setup)
7. [Environment Variables](#environment-variables)
8. [Local Development](#local-development)
9. [Fabric Metadata Table Setup](#fabric-metadata-table-setup)
10. [API Documentation](#api-documentation)
11. [Security](#security)
12. [Production Deployment](#production-deployment)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

Fabric File Manager is an enterprise-grade internal file management application that uses **Microsoft Fabric** as its exclusive storage and data platform:

- **Files** are stored in Lakehouse `Files/uploads/YYYY/MM/`
- **Metadata** is tracked in a Delta table (`file_metadata`) in the Lakehouse Tables section
- **Authentication** is handled exclusively via Microsoft Entra ID (OAuth 2.0 / OpenID Connect)
- **No other database** (Firebase, PostgreSQL, MongoDB, etc.) is used

### Key Features

| Feature | Description |
|---|---|
| 🔐 Microsoft Sign-In | Microsoft Entra ID via OAuth 2.0 |
| 📁 File Upload | Drag-and-drop, multi-file, with progress |
| ☁️ OneLake Storage | ADLS Gen2 DFS REST API |
| 📊 Delta Metadata | Lakehouse SQL Analytics Endpoint |
| 🔍 File Search | Filter, sort, paginate |
| ⬇️ Secure Download | Server-proxied download from OneLake |
| 🗑️ Delete | Confirmation dialog + OneLake + metadata cleanup |
| 📱 Responsive | Desktop-first, mobile-friendly |

---

## Architecture

```
Browser
  ↓
Next.js React UI (Tailwind CSS, Lucide React)
  ↓
Next.js App Router / API Route Handlers
  ↓  ↓
  ↓  Microsoft Entra ID (OAuth 2.0)
  ↓
MSAL Node.js (Client Credentials Flow)
  ↓
Microsoft Fabric / OneLake
  ├── Files/uploads/YYYY/MM/{uuid}-{filename}   (ADLS Gen2 DFS REST API)
  └── Tables/file_metadata                       (Delta table, SQL Analytics Endpoint)
```

### Lakehouse Structure

```
Your Lakehouse
├── Files/
│   └── uploads/
│       └── YYYY/
│           └── MM/
│               └── {uuid}-{safe-filename}
└── Tables/
    └── file_metadata (Delta table)
```

### Upload Flow (ADLS Gen2 Protocol)

The OneLake upload uses the ADLS Gen2 DFS REST API three-step protocol:

1. **PUT** `?resource=file` → Create the file resource
2. **PATCH** `?action=append&position=0` → Upload file bytes
3. **PATCH** `?action=flush&position={size}` → Commit the file

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Auth | NextAuth.js v4 + Microsoft Entra ID |
| Fabric SDK | @azure/msal-node (client credentials) |
| File Upload | react-dropzone |
| Validation | Zod v4 |
| Notifications | Sonner |
| Utilities | uuid, clsx |

---

## Prerequisites

- **Node.js** v20 or higher (tested on v24)
- **npm** v10 or higher
- **Microsoft Azure account** with admin access
- **Microsoft Fabric capacity** (F2 or higher, or trial)
- **Git** installed

---

## Microsoft Fabric Setup

### Step 1: Create a Fabric Workspace

1. Go to [app.fabric.microsoft.com](https://app.fabric.microsoft.com/)
2. Click **+ New workspace**
3. Name it (e.g., `FileManagerWorkspace`)
4. Note the **Workspace ID** from the URL: `https://app.fabric.microsoft.com/groups/{WORKSPACE_ID}/...`

### Step 2: Create a Lakehouse

1. Inside your workspace, click **+ New item → Lakehouse**
2. Name it (e.g., `FileManagerLakehouse`)
3. Note the **Lakehouse ID** from the URL or the item properties

### Step 3: Enable the SQL Analytics Endpoint

The SQL Analytics Endpoint is enabled automatically when a Lakehouse is created in Fabric.

To find the SQL endpoint:
1. Open the Lakehouse
2. Click **Settings** (gear icon)
3. Find **SQL Analytics Endpoint** connection string
4. It looks like: `{workspace-name}.datawarehouse.fabric.microsoft.com`

### Step 4: Grant Service Principal Access

Your app registration's service principal needs access to the Fabric workspace:

1. In your Fabric workspace, click **Manage access** (top right)
2. Add your app's **Service Principal** by its Client ID (Application ID)
3. Grant it at minimum **Contributor** role

---

## Microsoft Entra ID Setup

### Step 1: Register an Application

1. Go to [entra.microsoft.com](https://entra.microsoft.com/)
2. Navigate to **Identity → Applications → App registrations**
3. Click **+ New registration**
4. Fill in:
   - **Name:** `Fabric File Manager`
   - **Supported account types:** Single tenant (recommended for internal apps)
   - **Redirect URI:** Web → `http://localhost:3000/api/auth/callback/azure-ad`
5. Click **Register**
6. Note the **Application (client) ID** and **Directory (tenant) ID**

### Step 2: Create a Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **+ New client secret**
3. Add a description and expiry
4. **Copy the secret Value immediately** (it won't be shown again)

### Step 3: Set API Permissions

For the application to call Fabric APIs using client credentials:

1. In **API permissions**, click **+ Add a permission**
2. Select **Power BI Service** (Microsoft Fabric uses this scope)
3. Select **Application permissions** → `Tenant.Read.All` or `Dataset.ReadWrite.All`
4. Click **Grant admin consent** (requires Global Admin)

> **Note:** For OneLake DFS operations, the service principal also needs access to the **Azure Storage** API:
> - Add **Azure Storage** → **Application permissions** → `user_impersonation` or the storage scope
> - Alternatively, assign the service principal as **Storage Blob Data Contributor** on the storage account

### Step 4: Configure Redirect URIs

For production, add your production URL:
- `https://your-domain.com/api/auth/callback/azure-ad`

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then fill in all values:

| Variable | Required | Description |
|---|---|---|
| `AZURE_TENANT_ID` | ✅ | Directory (Tenant) ID from Entra ID |
| `AZURE_CLIENT_ID` | ✅ | Application (Client) ID from Entra ID |
| `AZURE_CLIENT_SECRET` | ✅ | Client secret value from Entra ID |
| `NEXTAUTH_SECRET` | ✅ | Random string for session encryption. Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` for dev, your domain for prod |
| `FABRIC_WORKSPACE_ID` | ✅ | Fabric Workspace GUID |
| `FABRIC_LAKEHOUSE_ID` | ✅ | Fabric Lakehouse GUID |
| `FABRIC_SQL_ENDPOINT` | ⚠️ | SQL Analytics Endpoint hostname |
| `FABRIC_DATABASE_NAME` | ⚠️ | Lakehouse database name |
| `MAX_FILE_SIZE_MB` | ❌ | Max upload size in MB (default: 100) |
| `ALLOWED_MIME_TYPES` | ❌ | Comma-separated MIME type allowlist |

> ⚠️ Variables marked ⚠️ are required for metadata table operations.

---

## Fabric Metadata Table Setup

You must create the `file_metadata` Delta table in your Lakehouse **before** using the app.

### Option A: Using Fabric Notebook (Recommended)

1. In your Fabric workspace, create a **Notebook**
2. Run this PySpark code:

```python
from pyspark.sql.types import *
from pyspark.sql import SparkSession

spark = SparkSession.builder.getOrCreate()

schema = StructType([
    StructField("id", StringType(), False),
    StructField("file_name", StringType(), False),
    StructField("original_file_name", StringType(), False),
    StructField("storage_path", StringType(), False),
    StructField("file_type", StringType(), False),
    StructField("file_size", LongType(), False),
    StructField("uploaded_by", StringType(), False),
    StructField("uploaded_by_email", StringType(), False),
    StructField("uploaded_at", StringType(), False),
    StructField("status", StringType(), False),
    StructField("checksum", StringType(), True),
    StructField("created_at", StringType(), False),
    StructField("updated_at", StringType(), False),
])

df = spark.createDataFrame([], schema)
df.write.format("delta").mode("overwrite").saveAsTable("file_metadata")

print("✅ file_metadata table created successfully!")
```

### Option B: Using the SQL Analytics Endpoint

Connect to your Lakehouse SQL Analytics Endpoint using Azure Data Studio or another SQL client:

```sql
CREATE TABLE file_metadata (
    id NVARCHAR(36) NOT NULL,
    file_name NVARCHAR(500) NOT NULL,
    original_file_name NVARCHAR(500) NOT NULL,
    storage_path NVARCHAR(1000) NOT NULL,
    file_type NVARCHAR(200) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by NVARCHAR(200) NOT NULL,
    uploaded_by_email NVARCHAR(200) NOT NULL,
    uploaded_at NVARCHAR(50) NOT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'uploaded',
    checksum NVARCHAR(64),
    created_at NVARCHAR(50) NOT NULL,
    updated_at NVARCHAR(50) NOT NULL
);
```

> **Note:** In Fabric Lakehouse, DDL operations like `CREATE TABLE` need to be done via notebooks or the Fabric REST API. The SQL Analytics Endpoint in Lakehouse is read-only for writes; writes go through Spark or the Load Table API.

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

1. Sign in with your Microsoft account
2. Navigate to **Upload** in the sidebar
3. Drag a file (e.g., a CSV) into the drop zone
4. Click **Upload Files**
5. The file should:
   - Upload to OneLake at `Files/uploads/YYYY/MM/{uuid}-{filename}`
   - Record metadata in the `file_metadata` Delta table

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
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "students.csv",
      "originalName": "students.csv",
      "size": 245678,
      "type": "text/csv",
      "fileType": "csv",
      "path": "uploads/2026/10/550e8400-students.csv",
      "uploadedBy": "Jane Smith",
      "uploadedByEmail": "jane@company.com",
      "uploadedAt": "2026-10-02T12:00:00Z",
      "status": "uploaded",
      "checksum": "sha256:abc..."
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

### `GET /api/files/[id]`

Download a file. Returns the file as a binary stream with appropriate headers.

---

### `DELETE /api/files/[id]`

Delete a file from OneLake and remove its metadata record.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-...",
    "message": "File \"students.csv\" was deleted successfully."
  }
}
```

---

## Security

### Implemented Security Measures

- ✅ **Microsoft Entra ID authentication** — no passwords stored
- ✅ **Server-side token handling** — access tokens never sent to browser
- ✅ **Client credentials for Fabric** — separate service principal for server-side Fabric API calls
- ✅ **Input validation** — Zod schema for file type, size, and name
- ✅ **Filename sanitization** — prevents path traversal (`../`, absolute paths, special characters)
- ✅ **Server-generated storage paths** — clients cannot specify where files are stored
- ✅ **No secrets in client code** — all `.env` variables are server-only
- ✅ **Secure error messages** — internal errors are not exposed to users
- ✅ **No access token logging** — tokens are never written to logs
- ✅ **Security headers** — `X-Frame-Options`, `X-Content-Type-Options`, etc.
- ✅ **CSRF protection** — via NextAuth.js session management

### What Is NOT Implemented (for production, add these)

- ❌ **Per-user file isolation** — Currently all authenticated users can see all files
- ❌ **Rate limiting** — Add a rate limiting library (e.g., `upstash/ratelimit`)
- ❌ **Virus scanning** — Add file scanning before storing
- ❌ **Large file chunked upload** — Files > 100MB should use streaming upload

---

## Production Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
```

**Important:** Set `NEXTAUTH_URL` to your production URL.

### Self-Hosted / Azure App Service

```bash
npm run build
npm run start
```

### Environment Considerations

- Ensure `NEXTAUTH_URL` matches your production domain exactly
- Add the production URL to your Entra ID app registration's Redirect URIs
- The `MAX_FILE_SIZE_MB` should not exceed your hosting platform's request size limit

---

## Troubleshooting

### "Microsoft Fabric Not Configured"

Check that all required environment variables are set:
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `FABRIC_WORKSPACE_ID`
- `FABRIC_LAKEHOUSE_ID`

### "AADSTS65001: The user or administrator has not consented..."

Your Entra ID app registration needs admin consent for the API permissions. Go to **API permissions → Grant admin consent**.

### "OneLake upload failed: 403"

The service principal doesn't have access to the Fabric workspace. Add it as a **Contributor** in the workspace **Manage access** settings.

### "Failed to acquire authentication token"

Verify your `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and `AZURE_TENANT_ID` are correct.

### Upload times out for large files

The default Next.js server action body limit may be too small. The `next.config.ts` sets it to 105MB. For files larger than this, implement a chunked/direct-to-OneLake upload pattern using SAS tokens.

### Files appear in OneLake but not in the file list

The `file_metadata` Delta table may not have been created. Follow the [Fabric Metadata Table Setup](#fabric-metadata-table-setup) instructions.

---

## License

Internal enterprise use only.
