/**
 * General utility functions
 */

import type { ApiErrorResponse } from '@/types/file';
import { type ClassValue, clsx } from 'clsx';

/**
 * Merges class names conditionally. A lightweight alternative to cn() from shadcn.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Creates a standardized API error response.
 */
export function createApiError(code: string, message: string): ApiErrorResponse {
  return {
    success: false,
    error: { code, message },
  };
}

/**
 * Creates a standardized API success response.
 */
export function createApiSuccess<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

/**
 * Maps internal error types to user-friendly messages.
 * Never exposes internal stack traces or secrets to the client.
 */
export function toUserFriendlyError(error: unknown): { code: string; message: string } {
  if (error instanceof Error) {
    // FabricConfigError
    if (error.name === 'FabricConfigError') {
      return {
        code: 'FABRIC_NOT_CONFIGURED',
        message:
          'Microsoft Fabric is not configured on this server. Please contact your administrator.',
      };
    }

    // FabricApiError
    if (error.name === 'FabricApiError') {
      const statusCode = (error as { statusCode?: number }).statusCode;

      if (statusCode === 401 || statusCode === 403) {
        return {
          code: 'FABRIC_PERMISSION_DENIED',
          message: 'You do not have permission to perform this action in Microsoft Fabric.',
        };
      }

      if (statusCode === 404) {
        return {
          code: 'FABRIC_NOT_FOUND',
          message: 'The requested file or resource was not found in Microsoft Fabric.',
        };
      }

      if (statusCode && statusCode >= 500) {
        return {
          code: 'FABRIC_SERVER_ERROR',
          message: 'Microsoft Fabric service is temporarily unavailable. Please try again later.',
        };
      }

      return {
        code: 'FABRIC_API_ERROR',
        message: 'An error occurred while communicating with Microsoft Fabric.',
      };
    }

    // Authentication errors
    if (error.message.includes('AADSTS') || error.message.includes('unauthorized')) {
      return {
        code: 'AUTH_ERROR',
        message: 'Authentication failed. Please sign in again.',
      };
    }
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Please try again.',
  };
}

/**
 * Computes a simple checksum (hash) of a Buffer for file integrity verification.
 * Uses Node.js crypto — server-side only.
 */
export async function computeChecksum(buffer: Buffer): Promise<string> {
  const { createHash } = await import('crypto');
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Converts a date string or Date to a readable relative time.
 */
export function timeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return past.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== past.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Formats a date string to a localized display format.
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
