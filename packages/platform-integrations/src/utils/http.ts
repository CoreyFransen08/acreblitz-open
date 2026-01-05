/**
 * HTTP utility functions for making API requests
 * Uses native fetch - no external dependencies
 */

import type { JohnDeereApiError } from '../types/john-deere';
import { JohnDeereError } from '../types/john-deere';

/**
 * Options for HTTP requests
 */
export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | URLSearchParams;
  timeout?: number;
}

/**
 * Make an HTTP request with error handling
 */
export async function httpRequest<T>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<T> {
  const { method = 'GET', headers = {}, body, timeout = 30000 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData: JohnDeereApiError | undefined;
      try {
        errorData = await response.json();
      } catch {
        // Response body may not be JSON
      }

      const errorMessage =
        errorData?.message ||
        errorData?.errors?.[0]?.message ||
        `HTTP ${response.status}: ${response.statusText}`;

      throw new JohnDeereError(
        errorMessage,
        errorData?.code || `HTTP_${response.status}`,
        response.status,
        errorData
      );
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    // Check for JSON or JD's custom content type (application/vnd.deere.axiom.v3+json)
    const isJsonResponse = contentType && (
      contentType.includes('application/json') ||
      contentType.includes('application/vnd.deere')
    );

    if (!isJsonResponse) {
      return {} as T;
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof JohnDeereError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new JohnDeereError('Request timeout', 'TIMEOUT', undefined);
      }
      throw new JohnDeereError(error.message, 'NETWORK_ERROR', undefined);
    }

    throw new JohnDeereError('Unknown error occurred', 'UNKNOWN_ERROR', undefined);
  }
}

/**
 * Make a form-urlencoded POST request (for OAuth endpoints)
 */
export async function postFormUrlEncoded<T>(
  url: string,
  params: Record<string, string>,
  additionalHeaders: Record<string, string> = {}
): Promise<T> {
  const body = new URLSearchParams(params);

  return httpRequest<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      ...additionalHeaders,
    },
    body,
  });
}

/**
 * Unit of measure system for John Deere API
 */
export type UOMSystem = 'METRIC' | 'ENGLISH';

/**
 * Options for authenticated requests
 */
export interface AuthenticatedRequestOptions extends HttpRequestOptions {
  /** Unit of measure system for area/distance values */
  uomSystem?: UOMSystem;
}

/**
 * Make an authenticated API request with Bearer token
 */
export async function authenticatedRequest<T>(
  url: string,
  accessToken: string,
  options: AuthenticatedRequestOptions = {}
): Promise<T> {
  const { headers = {}, uomSystem, ...restOptions } = options;

  // Build headers - include UOM system header for area calculations
  const requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.deere.axiom.v3+json',
    // Default to ENGLISH (acres) - can be overridden via options
    'Accept-UOM-System': uomSystem ?? 'ENGLISH',
    ...headers,
  };

  return httpRequest<T>(url, {
    ...restOptions,
    headers: requestHeaders,
  });
}

