/**
 * John Deere API Client Factory
 *
 * Creates a client instance with a fresh access token.
 * The user is responsible for storing the refresh token.
 * Access token management is handled internally.
 */

import type {
  JohnDeereClientConfig,
  Organization,
  Field,
  Boundary,
  Operation,
  ListBoundariesOptions,
  ListFieldsOptions,
} from '../../types/john-deere';
import type { ApiLink } from '../../types/common';
import { JD_API_BASE_URLS, JD_OAUTH_ENDPOINTS, JohnDeereError } from '../../types/john-deere';
import type { OAuthTokenResponse, PaginatedResponse } from '../../types/common';
import { postFormUrlEncoded, authenticatedRequest } from '../../utils/http';

/**
 * John Deere API Client Interface
 */
export interface JohnDeereClient {
  organizations: {
    list(): Promise<Organization[]>;
    get(orgId: string): Promise<Organization>;
  };
  fields: {
    list(orgId: string, options?: ListFieldsOptions): Promise<Field[]>;
    get(orgId: string, fieldId: string): Promise<Field>;
  };
  boundaries: {
    listForOrg(orgId: string, options?: ListBoundariesOptions): Promise<Boundary[]>;
    listForField(orgId: string, fieldId: string, options?: ListBoundariesOptions): Promise<Boundary[]>;
    get(orgId: string, boundaryId: string): Promise<Boundary>;
  };
  operations: {
    list(orgId: string, fieldId: string): Promise<Operation[]>;
  };
}

/**
 * Internal client implementation
 */
class JohnDeereClientImpl implements JohnDeereClient {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(accessToken: string, baseUrl: string) {
    this.accessToken = accessToken;
    this.baseUrl = baseUrl;
  }

  /**
   * Make an authenticated request to the John Deere API
   */
  private async request<T>(path: string, queryParams?: Record<string, string>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams(queryParams);
      url = `${url}?${params.toString()}`;
    }

    return authenticatedRequest<T>(url, this.accessToken);
  }

  /**
   * Fetch all pages of a paginated resource
   */
  private async fetchAllPages<T>(
    initialUrl: string,
    accessToken: string
  ): Promise<T[]> {
    const allItems: T[] = [];
    let url: string | null = initialUrl;

    while (url) {
      const response: PaginatedResponse<T> | T[] = await authenticatedRequest<
        PaginatedResponse<T> | T[]
      >(url, accessToken);

      // Handle both array and paginated response formats
      if (Array.isArray(response)) {
        allItems.push(...response);
        url = null;
      } else {
        allItems.push(...(response.values || []));
        // Find next page link
        const nextPageLink: ApiLink | undefined = response.links?.find(
          (link: ApiLink) => link.rel === 'nextPage'
        );
        url = nextPageLink?.uri ?? null;
      }
    }

    return allItems;
  }

  // ==========================================================================
  // Organizations
  // ==========================================================================

  organizations = {
    /**
     * List all organizations the user has access to
     */
    list: async (): Promise<Organization[]> => {
      return this.fetchAllPages<Organization>(
        `${this.baseUrl}/organizations`,
        this.accessToken
      );
    },

    /**
     * Get a specific organization by ID
     */
    get: async (orgId: string): Promise<Organization> => {
      return this.request<Organization>(`/organizations/${orgId}`);
    },
  };

  // ==========================================================================
  // Fields
  // ==========================================================================

  fields = {
    /**
     * List all fields for an organization
     */
    list: async (orgId: string, options?: ListFieldsOptions): Promise<Field[]> => {
      const queryParams: Record<string, string> = {};
      if (options?.recordFilter) {
        queryParams.recordFilter = options.recordFilter;
      }

      const url = new URL(`${this.baseUrl}/organizations/${orgId}/fields`);
      if (Object.keys(queryParams).length > 0) {
        Object.entries(queryParams).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
      }

      return this.fetchAllPages<Field>(url.toString(), this.accessToken);
    },

    /**
     * Get a specific field by ID
     */
    get: async (orgId: string, fieldId: string): Promise<Field> => {
      return this.request<Field>(`/organizations/${orgId}/fields/${fieldId}`);
    },
  };

  // ==========================================================================
  // Boundaries
  // ==========================================================================

  boundaries = {
    /**
     * List all boundaries for an organization
     */
    listForOrg: async (orgId: string, options?: ListBoundariesOptions): Promise<Boundary[]> => {
      const queryParams: Record<string, string> = {};
      if (options?.embed) {
        queryParams.embed = options.embed;
      }
      if (options?.recordFilter) {
        queryParams.recordFilter = options.recordFilter;
      }

      const url = new URL(`${this.baseUrl}/organizations/${orgId}/boundaries`);
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      return this.fetchAllPages<Boundary>(url.toString(), this.accessToken);
    },

    /**
     * List boundaries for a specific field
     */
    listForField: async (
      orgId: string,
      fieldId: string,
      options?: ListBoundariesOptions
    ): Promise<Boundary[]> => {
      const queryParams: Record<string, string> = {};
      if (options?.embed) {
        queryParams.embed = options.embed;
      }
      if (options?.recordFilter) {
        queryParams.recordFilter = options.recordFilter;
      }

      const url = new URL(
        `${this.baseUrl}/organizations/${orgId}/fields/${fieldId}/boundaries`
      );
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      return this.fetchAllPages<Boundary>(url.toString(), this.accessToken);
    },

    /**
     * Get a specific boundary by ID
     */
    get: async (orgId: string, boundaryId: string): Promise<Boundary> => {
      return this.request<Boundary>(`/organizations/${orgId}/boundaries/${boundaryId}`);
    },
  };

  // ==========================================================================
  // Operations
  // ==========================================================================

  operations = {
    /**
     * List operations for a field
     */
    list: async (orgId: string, fieldId: string): Promise<Operation[]> => {
      return this.fetchAllPages<Operation>(
        `${this.baseUrl}/organizations/${orgId}/fields/${fieldId}/operations`,
        this.accessToken
      );
    },
  };
}

/**
 * Create a John Deere API client.
 *
 * This factory function:
 * 1. Uses the provided refresh token to obtain a fresh access token
 * 2. If a new refresh token is returned, calls the onTokenRefresh callback
 * 3. Returns a client instance ready for API calls
 *
 * @param config - Client configuration including credentials and refresh token
 * @returns A ready-to-use API client
 *
 * @example
 * ```typescript
 * const client = await createJohnDeereClient({
 *   clientId: process.env.JD_CLIENT_ID,
 *   clientSecret: process.env.JD_CLIENT_SECRET,
 *   refreshToken: savedRefreshToken,
 *   onTokenRefresh: async (newToken) => {
 *     await db.updateRefreshToken(userId, newToken);
 *   },
 * });
 *
 * const orgs = await client.organizations.list();
 * const fields = await client.fields.list(orgs[0].id);
 * ```
 */
export async function createJohnDeereClient(
  config: JohnDeereClientConfig
): Promise<JohnDeereClient> {
  const {
    clientId,
    clientSecret,
    refreshToken,
    baseUrl = JD_API_BASE_URLS.PRODUCTION,
    onTokenRefresh,
  } = config;

  // Refresh the access token
  const tokenResponse = await postFormUrlEncoded<OAuthTokenResponse>(
    JD_OAUTH_ENDPOINTS.TOKEN,
    {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }
  );

  if (!tokenResponse.access_token) {
    throw new JohnDeereError(
      'Failed to obtain access token from refresh token',
      'TOKEN_REFRESH_FAILED'
    );
  }

  // If a new refresh token was returned, notify the caller
  if (tokenResponse.refresh_token && tokenResponse.refresh_token !== refreshToken) {
    if (onTokenRefresh) {
      await Promise.resolve(onTokenRefresh(tokenResponse.refresh_token));
    }
  }

  // Create and return the client instance
  return new JohnDeereClientImpl(tokenResponse.access_token, baseUrl);
}

