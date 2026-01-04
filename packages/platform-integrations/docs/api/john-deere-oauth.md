# JohnDeereOAuth

The `JohnDeereOAuth` class handles the OAuth 2.0 authorization flow for John Deere Operations Center.

## Import

```typescript
import { JohnDeereOAuth } from '@acreblitz/platform-integrations';
```

## Constructor

```typescript
new JohnDeereOAuth(config: JohnDeereOAuthConfig)
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config.clientId` | `string` | Yes | Your application's Client ID from developer.deere.com |
| `config.clientSecret` | `string` | Yes | Your application's Client Secret |
| `config.redirectUri` | `string` | Yes | The callback URL registered in your JD application |
| `config.authorizationUrl` | `string` | No | Override the authorization endpoint |
| `config.tokenUrl` | `string` | No | Override the token endpoint |
| `config.revokeUrl` | `string` | No | Override the revoke endpoint |
| `config.apiBaseUrl` | `string` | No | Override the API base URL (for sandbox testing) |
| `config.applicationId` | `string` | No | Your app's UUID from developer.deere.com (used to construct connections URL when no orgs are returned) |

### Example

```typescript
import { JohnDeereOAuth, JD_API_BASE_URLS } from '@acreblitz/platform-integrations';

const oauth = new JohnDeereOAuth({
  clientId: process.env.JD_CLIENT_ID,
  clientSecret: process.env.JD_CLIENT_SECRET,
  redirectUri: 'https://myapp.com/api/auth/callback',
  applicationId: process.env.JD_APPLICATION_ID,
  // Use sandbox for development
  apiBaseUrl: process.env.USE_SANDBOX === 'true'
    ? JD_API_BASE_URLS.SANDBOX
    : JD_API_BASE_URLS.PRODUCTION,
});
```

---

## Methods

### getAuthorizationUrl()

Generates the authorization URL to redirect users to John Deere's login page.

```typescript
getAuthorizationUrl(options: AuthorizationUrlOptions): AuthorizationUrlResult
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options.scopes` | `JohnDeereScope[]` | Yes | Array of OAuth scopes to request |
| `options.state` | `string` | No | Custom state parameter (auto-generated if not provided) |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `url` | `string` | The full authorization URL to redirect to |
| `state` | `string` | The state parameter (save this for verification) |

#### Example

```typescript
const { url, state } = oauth.getAuthorizationUrl({
  scopes: ['ag1', 'ag2', 'ag3', 'offline_access'],
});

// Save state for verification later
session.oauthState = state;

// Redirect user
res.redirect(url);
```

#### Available Scopes

| Scope | Description |
|-------|-------------|
| `'ag1'` | View Locations (fields, boundaries) |
| `'ag2'` | Analyze Production Data |
| `'ag3'` | Manage Locations & Production Data |
| `'eq1'` | View Equipment |
| `'eq2'` | Manage Equipment |
| `'org1'` | View Staff, Operators, Partners |
| `'org2'` | Modify Staff, Operators, Partners |
| `'files'` | Access Files API |
| `'offline_access'` | Request Refresh Token (**required**) |

---

### exchangeCodeForTokens()

Exchanges an authorization code for access and refresh tokens. Also checks organization connections.

```typescript
async exchangeCodeForTokens(code: string): Promise<TokenExchangeResult>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | `string` | The authorization code from the callback |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `accessToken` | `string` | Token for API calls (expires in 12 hours) |
| `refreshToken` | `string` | Token for getting new access tokens |
| `tokenType` | `string` | Token type (usually "Bearer") |
| `expiresIn` | `number` | Seconds until access token expires |
| `scope` | `string` | Granted scopes (space-separated) |
| `organizations` | `OrganizationConnectionInfo[]` | List of user's organizations |
| `connectionsUrl` | `string \| null` | URL to complete org setup (if needed) |

#### Example

```typescript
try {
  const result = await oauth.exchangeCodeForTokens(code);
  
  // Save refresh token
  await db.saveToken(userId, result.refreshToken);
  
  // Check if org connection is needed
  if (result.connectionsUrl) {
    return res.redirect(result.connectionsUrl);
  }
  
  // Success!
  console.log('Connected organizations:', result.organizations);
  
} catch (error) {
  if (error instanceof JohnDeereError) {
    console.error('OAuth error:', error.code, error.message);
  }
}
```

#### OrganizationConnectionInfo

```typescript
interface OrganizationConnectionInfo {
  id: string;              // Organization ID
  name: string;            // Organization name
  type?: string;           // e.g., "customer"
  needsConnection: boolean; // true if user must complete setup
  connectionsUrl?: string;  // URL for setup (if needsConnection)
}
```

---

### revokeToken()

Revokes a refresh token, disconnecting the user from your application.

```typescript
async revokeToken(refreshToken: string): Promise<void>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `refreshToken` | `string` | The refresh token to revoke |

#### Example

```typescript
try {
  await oauth.revokeToken(savedRefreshToken);
  
  // Clean up your database
  await db.deleteToken(userId);
  
  console.log('User disconnected successfully');
} catch (error) {
  // Token may already be invalid - usually safe to ignore
}
```

---

### refreshAccessToken()

Manually refresh an access token. This is typically handled automatically by `createJohnDeereClient()`, but available for advanced use cases.

```typescript
async refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}>
```

#### Example

```typescript
const newTokens = await oauth.refreshAccessToken(savedRefreshToken);

// Update saved refresh token (JD may issue a new one)
if (newTokens.refreshToken !== savedRefreshToken) {
  await db.updateToken(userId, newTokens.refreshToken);
}
```

---

### getConnectedOrganizations()

Check which organizations are connected after the user returns from the organization connection flow at `connections.deere.com`.

**Important:** This is used when handling the redirect back from org selection, NOT during the initial OAuth callback.

```typescript
async getConnectedOrganizations(refreshToken: string): Promise<ConnectedOrganizationsResult>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `refreshToken` | `string` | The user's stored refresh token |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `connectedOrganizations` | `OrganizationConnectionInfo[]` | Orgs that are fully connected (accessible) |
| `pendingOrganizations` | `OrganizationConnectionInfo[]` | Orgs that still need connection |
| `connectionsUrl` | `string \| null` | URL to continue org setup (if pending orgs exist) |
| `refreshToken` | `string` | The refresh token (may be updated if JD issued a new one) |

#### Example

```typescript
// Handler for: /api/auth/org-connected
// Called when user returns from connections.deere.com (NO code parameter)

export async function GET(request: Request) {
  const refreshToken = getStoredRefreshToken(); // From cookie/session

  const oauth = new JohnDeereOAuth({
    clientId: process.env.JD_CLIENT_ID,
    clientSecret: process.env.JD_CLIENT_SECRET,
    redirectUri: request.url, // Use current URL for any further redirects
    apiBaseUrl: process.env.USE_SANDBOX === 'true'
      ? JD_API_BASE_URLS.SANDBOX
      : JD_API_BASE_URLS.PRODUCTION,
  });

  const result = await oauth.getConnectedOrganizations(refreshToken);

  // Update stored token (in case JD issued a new one)
  await updateStoredRefreshToken(result.refreshToken);

  if (result.connectionsUrl) {
    // User has more orgs to connect
    return redirect(result.connectionsUrl);
  }

  // All done - user has these connected orgs
  console.log('Connected:', result.connectedOrganizations.map(o => o.id));

  return redirect('/?success=true');
}
```

#### When to Use This Method

- **Use `exchangeCodeForTokens()`** when: Your OAuth callback receives a `code` parameter
- **Use `getConnectedOrganizations()`** when: Your callback does NOT have a `code` (user returning from org selection)

---

## Error Handling

All methods may throw `JohnDeereError`:

```typescript
import { JohnDeereError } from '@acreblitz/platform-integrations';

try {
  await oauth.exchangeCodeForTokens(code);
} catch (error) {
  if (error instanceof JohnDeereError) {
    console.error('Error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
    });
  }
}
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `TOKEN_EXCHANGE_FAILED` | Code exchange failed | Check code validity |
| `NO_REFRESH_TOKEN` | No refresh token received | Add `offline_access` scope |
| `REFRESH_FAILED` | Token refresh failed | User needs to re-authenticate |
| `HTTP_401` | Invalid credentials | Check client ID/secret |
| `HTTP_403` | Access denied | User hasn't completed org setup |

---

## Default Endpoints

The class uses these John Deere endpoints by default:

```typescript
{
  authorization: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize',
  token: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token',
  revoke: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/revoke',
  api: 'https://api.deere.com/platform',
}
```

For sandbox testing, override `apiBaseUrl`:

```typescript
const oauth = new JohnDeereOAuth({
  // ...
  apiBaseUrl: 'https://sandboxapi.deere.com/platform',
});
```

