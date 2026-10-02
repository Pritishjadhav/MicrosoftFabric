/**
 * Authentication-related TypeScript type definitions
 */

import type { Session } from 'next-auth';

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface ExtendedSession extends Session {
  user: AuthUser & {
    accessToken?: string;
  };
  accessToken?: string;
  error?: string;
}

export interface TokenSet {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
}

/**
 * Microsoft Entra ID / Azure AD token claims
 */
export interface EntraIDTokenClaims {
  oid?: string;     // Object ID
  tid?: string;     // Tenant ID
  sub?: string;     // Subject
  email?: string;
  name?: string;
  preferred_username?: string;
  upn?: string;     // User Principal Name
}
