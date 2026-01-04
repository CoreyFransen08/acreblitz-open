/**
 * Common types shared across all platform integrations
 */

/**
 * Generic paginated response from APIs
 */
export interface PaginatedResponse<T> {
  values: T[];
  total?: number;
  links?: ApiLink[];
}

/**
 * API link structure used in HATEOAS responses
 */
export interface ApiLink {
  '@type'?: string;
  rel: string;
  uri: string;
}

/**
 * Generic API error
 */
export interface ApiError {
  code: string;
  message: string;
  status?: number;
}

/**
 * OAuth token response
 */
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/**
 * Base configuration for OAuth providers
 */
export interface BaseOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Base configuration for API clients
 */
export interface BaseClientConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  onTokenRefresh?: (newRefreshToken: string) => void | Promise<void>;
}

