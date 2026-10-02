/**
 * Microsoft Entra ID Authentication Configuration
 *
 * This module configures NextAuth.js with the Azure AD provider.
 * All token handling occurs server-side only.
 * Never expose access tokens or client secrets to the browser.
 */

import type { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

/**
 * Validates that required environment variables are present.
 * Logs a warning in development if variables are missing.
 */
function validateEntraConfig(): boolean {
  const required = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `[Auth] Missing environment variables: ${missing.join(', ')}. ` +
        'Authentication will not work until these are configured.'
    );
    return false;
  }
  return true;
}

export const isFabricConfigured = (): boolean => {
  return !!(
    process.env.FABRIC_WORKSPACE_ID &&
    process.env.FABRIC_LAKEHOUSE_ID
  );
};

export const isAuthConfigured = (): boolean => {
  return !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET &&
    process.env.NEXTAUTH_SECRET
  );
};

/**
 * NextAuth.js configuration with Microsoft Entra ID (Azure AD) provider.
 * Requests the "offline_access" scope for refresh token capability.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_CLIENT_ID ?? '',
      clientSecret: process.env.AZURE_CLIENT_SECRET ?? '',
      tenantId: process.env.AZURE_TENANT_ID ?? 'common',
      authorization: {
        params: {
          scope: 'openid profile email offline_access',
        },
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },

  callbacks: {
    /**
     * Called when a JWT is created or updated.
     * We store user identity here — NOT Fabric tokens (those use client credentials server-side).
     */
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.oid = (profile as Record<string, unknown>).oid as string | undefined;
        token.tid = (profile as Record<string, unknown>).tid as string | undefined;
        token.email = profile.email;
        token.name = profile.name;
      }
      return token;
    },

    /**
     * Called when a session is checked.
     * Expose only necessary user info — never expose secrets.
     */
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub ?? '';
        (session as { user: { oid?: string } }).user.oid = token.oid as string | undefined;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  events: {
    async signIn({ user }) {
      // Log sign-in without exposing sensitive data
      console.info(`[Auth] User signed in: ${user.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);
    },
    async signOut() {
      console.info('[Auth] User signed out.');
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

// Validate config on module load
validateEntraConfig();
