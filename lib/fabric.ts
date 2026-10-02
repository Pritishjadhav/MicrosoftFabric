/**
 * Microsoft Fabric Authentication and API Client
 *
 * This module handles server-side authentication with Microsoft Fabric
 * using the OAuth 2.0 client credentials flow via MSAL Node.js.
 *
 * SECURITY: This module must NEVER be imported in browser-side (client) code.
 * All Fabric communication happens through Next.js API Route Handlers.
 *
 * References:
 * - https://learn.microsoft.com/en-us/rest/api/fabric/
 * - https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow
 */

import { ConfidentialClientApplication, type Configuration } from '@azure/msal-node';

// Fabric REST API base URL
const FABRIC_API_BASE = 'https://api.fabric.microsoft.com/v1';

// OneLake DFS endpoint (ADLS Gen2-compatible)
const ONELAKE_DFS_BASE = 'https://onelake.dfs.fabric.microsoft.com';

// Fabric API OAuth scope
const FABRIC_SCOPE = 'https://analysis.windows.net/powerbi/api/.default';

// Storage scope for OneLake DFS operations
const STORAGE_SCOPE = 'https://storage.azure.com/.default';

/** Cached MSAL client instance */
let msalClient: ConfidentialClientApplication | null = null;

/** Cached token with expiry tracking */
interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache: Record<string, CachedToken> = {};

/**
 * Validates that required Fabric environment variables are set.
 * Throws a descriptive error if any are missing.
 */
export function validateFabricConfig(): void {
  const required = {
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
    FABRIC_WORKSPACE_ID: process.env.FABRIC_WORKSPACE_ID,
    FABRIC_LAKEHOUSE_ID: process.env.FABRIC_LAKEHOUSE_ID,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new FabricConfigError(
      `Microsoft Fabric is not configured. Missing environment variables: ${missing.join(', ')}. ` +
        'Please follow the setup instructions in README.md.'
    );
  }
}

/**
 * Custom error class for Fabric configuration issues.
 */
export class FabricConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FabricConfigError';
  }
}

/**
 * Custom error class for Fabric API errors.
 */
export class FabricApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly fabricErrorCode?: string
  ) {
    super(message);
    this.name = 'FabricApiError';
  }
}

/**
 * Creates or returns the cached MSAL ConfidentialClientApplication.
 * Uses client credentials flow for server-to-server authentication.
 */
function getMsalClient(): ConfidentialClientApplication {
  if (msalClient) return msalClient;

  const msalConfig: Configuration = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    },
  };

  msalClient = new ConfidentialClientApplication(msalConfig);
  return msalClient;
}

/**
 * Acquires an access token for the specified scope using client credentials.
 * Tokens are cached in memory and refreshed 5 minutes before expiry.
 *
 * SECURITY: Never log the returned token value.
 */
export async function acquireToken(scope: string): Promise<string> {
  const cacheKey = scope;
  const cached = tokenCache[cacheKey];

  // Return cached token if still valid (with 5 min buffer)
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }

  const client = getMsalClient();

  const result = await client.acquireTokenByClientCredential({
    scopes: [scope],
  });

  if (!result?.accessToken) {
    throw new FabricApiError(
      'Failed to acquire authentication token for Microsoft Fabric. ' +
        'Verify your AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET configuration.'
    );
  }

  tokenCache[cacheKey] = {
    token: result.accessToken,
    expiresAt: result.expiresOn?.getTime() ?? Date.now() + 55 * 60 * 1000,
  };

  return result.accessToken;
}

/**
 * Acquires a token scoped for the Fabric REST API.
 */
export async function acquireFabricToken(): Promise<string> {
  return acquireToken(FABRIC_SCOPE);
}

/**
 * Acquires a token scoped for OneLake / Azure Storage operations.
 */
export async function acquireStorageToken(): Promise<string> {
  return acquireToken(STORAGE_SCOPE);
}

/**
 * Makes an authenticated request to the Microsoft Fabric REST API.
 * Automatically handles token acquisition and error parsing.
 */
export async function fabricApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  validateFabricConfig();
  const token = await acquireFabricToken();

  const url = `${FABRIC_API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    let errorMessage = `Fabric API request failed: ${response.status} ${response.statusText}`;
    let fabricErrorCode = 'FABRIC_API_ERROR';

    try {
      const errorJson = JSON.parse(errorBody);
      if (errorJson.message) errorMessage = errorJson.message;
      if (errorJson.errorCode) fabricErrorCode = errorJson.errorCode;
    } catch {
      // Non-JSON error response, use status text
    }

    throw new FabricApiError(errorMessage, response.status, fabricErrorCode);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Makes an authenticated request to the OneLake DFS endpoint.
 * Uses the Azure Storage scope for authentication.
 */
export async function onelakeRequest(
  path: string,
  options: RequestInit = {},
  customHeaders: Record<string, string> = {}
): Promise<Response> {
  validateFabricConfig();
  const token = await acquireStorageToken();

  const workspaceId = process.env.FABRIC_WORKSPACE_ID!;
  const lakehouseId = process.env.FABRIC_LAKEHOUSE_ID!;

  // Build the full OneLake DFS URL
  // Pattern: https://onelake.dfs.fabric.microsoft.com/{workspaceId}/{lakehouseId}/Files/{path}
  const url = `${ONELAKE_DFS_BASE}/${workspaceId}/${lakehouseId}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'x-ms-version': '2023-11-03',
      'x-ms-date': new Date().toUTCString(),
      ...customHeaders,
      ...(options.headers as Record<string, string>),
    },
  });

  return response;
}

/**
 * Returns the Fabric workspace and lakehouse configuration.
 */
export function getFabricConfig() {
  return {
    workspaceId: process.env.FABRIC_WORKSPACE_ID ?? '',
    lakehouseId: process.env.FABRIC_LAKEHOUSE_ID ?? '',
    sqlEndpoint: process.env.FABRIC_SQL_ENDPOINT ?? '',
    databaseName: process.env.FABRIC_DATABASE_NAME ?? '',
    apiBase: FABRIC_API_BASE,
    onelakeBase: ONELAKE_DFS_BASE,
  };
}

/**
 * Checks if all required Fabric environment variables are set
 */
export function isFabricConfigured(): boolean {
  return !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET &&
    process.env.FABRIC_WORKSPACE_ID &&
    process.env.FABRIC_LAKEHOUSE_ID
  );
}
