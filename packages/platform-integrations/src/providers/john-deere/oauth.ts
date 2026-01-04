/**
 * John Deere OAuth 2.0 Helper Class
 *
 * Provides methods for:
 * - Generating authorization URLs
 * - Exchanging authorization codes for tokens
 * - Checking organization connections
 * - Revoking tokens
 */

import type { OAuthTokenResponse, PaginatedResponse } from '../../types/common';
import type {
  JohnDeereOAuthConfig,
  AuthorizationUrlOptions,
  AuthorizationUrlResult,
  TokenExchangeResult,
  ConnectedOrganizationsResult,
  OrganizationConnectionInfo,
  Organization,
} from '../../types/john-deere';
import { JD_OAUTH_ENDPOINTS, JD_API_BASE_URLS, JohnDeereError } from '../../types/john-deere';
import { postFormUrlEncoded, authenticatedRequest } from '../../utils/http';

/**
 * Helper class for John Deere OAuth 2.0 authentication flow
 *
 * @example
 * ```typescript
 * const oauth = new JohnDeereOAuth({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   redirectUri: 'https://yourapp.com/callback',
 * });
 *
 * // Generate auth URL
 * const { url, state } = oauth.getAuthorizationUrl({
 *   scopes: ['ag1', 'ag2', 'offline_access'],
 * });
 *
 * // Exchange code for tokens (includes org connection check)
 * const result = await oauth.exchangeCodeForTokens(authCode);
 *
 * if (result.connectionsUrl) {
 *   // Redirect user to select organizations
 * }
 * ```
 */
export class JohnDeereOAuth {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly authorizationUrl: string;
  private readonly tokenUrl: string;
  private readonly revokeUrl: string;
  private readonly apiBaseUrl: string;
  private readonly applicationId?: string;

  constructor(config: JohnDeereOAuthConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.authorizationUrl = config.authorizationUrl || JD_OAUTH_ENDPOINTS.AUTHORIZATION;
    this.tokenUrl = config.tokenUrl || JD_OAUTH_ENDPOINTS.TOKEN;
    this.revokeUrl = config.revokeUrl || JD_OAUTH_ENDPOINTS.REVOKE;
    this.apiBaseUrl = config.apiBaseUrl || JD_API_BASE_URLS.PRODUCTION;
    this.applicationId = config.applicationId;
  }

  /**
   * Generate a cryptographically secure random state parameter
   */
  private generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate the authorization URL for redirecting the user to John Deere login
   *
   * @param options - Authorization options including scopes and optional state
   * @returns The authorization URL and state parameter
   *
   * @example
   * ```typescript
   * const { url, state } = oauth.getAuthorizationUrl({
   *   scopes: ['ag1', 'ag2', 'ag3', 'offline_access'],
   * });
   * // Save state for verification, redirect user to url
   * ```
   */
  getAuthorizationUrl(options: AuthorizationUrlOptions): AuthorizationUrlResult {
    const state = options.state || this.generateState();

    const url = new URL(this.authorizationUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('scope', options.scopes.join(' '));
    url.searchParams.set('state', state);

    return {
      url: url.toString(),
      state,
    };
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   * Also checks organization connections to determine if user needs to
   * complete the org selection flow.
   *
   * @param code - The authorization code from the callback
   * @returns Token information and organization connection status
   *
   * @example
   * ```typescript
   * const result = await oauth.exchangeCodeForTokens(code);
   *
   * // Save refresh token
   * await db.saveRefreshToken(userId, result.refreshToken);
   *
   * // Check if org connection is needed
   * if (result.connectionsUrl) {
   *   // Redirect user to result.connectionsUrl
   * }
   * ```
   */
  async exchangeCodeForTokens(code: string): Promise<TokenExchangeResult> {
    // Step 1: Exchange code for tokens
    const tokenResponse = await postFormUrlEncoded<OAuthTokenResponse>(
      this.tokenUrl,
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }
    );

    if (!tokenResponse.access_token) {
      throw new JohnDeereError(
        'No access token received from token endpoint',
        'TOKEN_EXCHANGE_FAILED'
      );
    }

    if (!tokenResponse.refresh_token) {
      throw new JohnDeereError(
        'No refresh token received. Make sure to request offline_access scope.',
        'NO_REFRESH_TOKEN'
      );
    }

    // Step 2: Check organization connections
    const { organizations, connectionsUrl } = await this.checkOrganizationConnections(
      tokenResponse.access_token
    );

    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: tokenResponse.token_type,
      expiresIn: tokenResponse.expires_in,
      scope: tokenResponse.scope,
      organizations,
      connectionsUrl,
    };
  }

  /**
   * Check if any organizations need connection setup
   *
   * @param accessToken - Valid access token
   * @returns Organization info and connections URL if needed
   */
  private async checkOrganizationConnections(accessToken: string): Promise<{
    organizations: OrganizationConnectionInfo[];
    connectionsUrl: string | null;
  }> {
    try {
      // Fetch organizations
      const response = await authenticatedRequest<
        Organization[] | PaginatedResponse<Organization>
      >(`${this.apiBaseUrl}/organizations`, accessToken);

      // Handle both array and paginated response formats
      const orgsData: Organization[] = Array.isArray(response)
        ? response
        : response.values || [];

      // Map organizations and check for connections links
      const organizations: OrganizationConnectionInfo[] = orgsData.map((org) => {
        const connectionsLink = org.links?.find((link) => link.rel === 'connections');
        return {
          id: org.id,
          name: org.name,
          type: org.type,
          needsConnection: !!connectionsLink,
          connectionsUrl: connectionsLink?.uri,
        };
      });

      // Find the first organization that needs connection
      const orgNeedingConnection = organizations.find((org) => org.needsConnection);
      let connectionsUrl: string | null = null;

      if (orgNeedingConnection?.connectionsUrl) {
        // Append redirect_uri to the connections URL if not already present
        const url = new URL(orgNeedingConnection.connectionsUrl);
        if (!url.searchParams.has('redirect_uri')) {
          url.searchParams.set('redirect_uri', this.redirectUri);
        }
        connectionsUrl = url.toString();
      } else if (organizations.length === 0 && this.applicationId) {
        // No organizations returned - user needs to grant access
        // Use the applicationId to construct the connections URL
        // Format: https://connections.deere.com/connections/{APP_UUID}/select-organizations
        const url = new URL(
          `https://connections.deere.com/connections/${this.applicationId}/select-organizations`
        );
        url.searchParams.set('redirect_uri', this.redirectUri);
        connectionsUrl = url.toString();
      }

      return { organizations, connectionsUrl };
    } catch (error) {
      // If org check fails, provide a fallback connections URL if we have applicationId
      console.warn('Failed to check organization connections:', error);
      
      let connectionsUrl: string | null = null;
      if (this.applicationId) {
        const url = new URL(
          `https://connections.deere.com/connections/${this.applicationId}/select-organizations`
        );
        url.searchParams.set('redirect_uri', this.redirectUri);
        connectionsUrl = url.toString();
      }
      
      return {
        organizations: [],
        connectionsUrl,
      };
    }
  }

  /**
   * Revoke a refresh token
   *
   * @param refreshToken - The refresh token to revoke
   *
   * @example
   * ```typescript
   * await oauth.revokeToken(refreshToken);
   * // Token is now invalid, remove from database
   * ```
   */
  async revokeToken(refreshToken: string): Promise<void> {
    try {
      await postFormUrlEncoded<Record<string, never>>(this.revokeUrl, {
        token: refreshToken,
        token_type_hint: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });
    } catch (error) {
      // If the token is already invalid/revoked, that's fine
      if (error instanceof JohnDeereError) {
        if (error.code === 'invalid_token' || error.code === 'invalid_grant') {
          return;
        }
      }
      throw error;
    }
  }

  /**
   * Refresh an access token using a refresh token.
   * This is primarily used internally by the client factory,
   * but exposed for advanced use cases.
   *
   * @param refreshToken - The refresh token
   * @returns New token information
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  }> {
    const tokenResponse = await postFormUrlEncoded<OAuthTokenResponse>(
      this.tokenUrl,
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }
    );

    if (!tokenResponse.access_token) {
      throw new JohnDeereError(
        'No access token received from refresh',
        'REFRESH_FAILED'
      );
    }

    return {
      accessToken: tokenResponse.access_token,
      // John Deere may return a new refresh token
      refreshToken: tokenResponse.refresh_token || refreshToken,
      tokenType: tokenResponse.token_type,
      expiresIn: tokenResponse.expires_in,
    };
  }

  /**
   * Check which organizations are connected after the user returns from
   * the organization connection flow.
   *
   * Use this method when the user returns from connections.deere.com
   * to determine which organizations are now accessible.
   *
   * @param refreshToken - The user's refresh token
   * @returns Connected and pending organizations, plus the (possibly updated) refresh token
   *
   * @example
   * ```typescript
   * // User just returned from org connection page
   * const result = await oauth.getConnectedOrganizations(savedRefreshToken);
   *
   * if (result.connectionsUrl) {
   *   // User still has pending orgs - redirect back to connections
   *   return redirect(result.connectionsUrl);
   * }
   *
   * // All done! User has connected orgs
   * console.log('Connected orgs:', result.connectedOrganizations);
   * ```
   */
  async getConnectedOrganizations(refreshToken: string): Promise<ConnectedOrganizationsResult> {
    // Get a fresh access token
    const tokenResult = await this.refreshAccessToken(refreshToken);

    // Fetch organizations
    const response = await authenticatedRequest<
      Organization[] | PaginatedResponse<Organization>
    >(`${this.apiBaseUrl}/organizations`, tokenResult.accessToken);

    // Handle both array and paginated response formats
    const orgsData: Organization[] = Array.isArray(response)
      ? response
      : response.values || [];

    // Separate connected vs pending organizations
    const connectedOrganizations: OrganizationConnectionInfo[] = [];
    const pendingOrganizations: OrganizationConnectionInfo[] = [];

    for (const org of orgsData) {
      const connectionsLink = org.links?.find((link) => link.rel === 'connections');
      const orgInfo: OrganizationConnectionInfo = {
        id: org.id,
        name: org.name,
        type: org.type,
        needsConnection: !!connectionsLink,
        connectionsUrl: connectionsLink?.uri,
      };

      if (connectionsLink) {
        pendingOrganizations.push(orgInfo);
      } else {
        connectedOrganizations.push(orgInfo);
      }
    }

    // Build connections URL if there are pending orgs
    let connectionsUrl: string | null = null;
    if (pendingOrganizations.length > 0 && pendingOrganizations[0].connectionsUrl) {
      const url = new URL(pendingOrganizations[0].connectionsUrl);
      if (!url.searchParams.has('redirect_uri')) {
        url.searchParams.set('redirect_uri', this.redirectUri);
      }
      connectionsUrl = url.toString();
    }

    return {
      connectedOrganizations,
      pendingOrganizations,
      connectionsUrl,
      refreshToken: tokenResult.refreshToken,
    };
  }
}

