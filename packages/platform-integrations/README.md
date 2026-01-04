# @acreblitz/platform-integrations

Platform integrations for agricultural data providers. Currently supports John Deere Operations Center.

## Installation

```bash
npm install @acreblitz/platform-integrations
```

## Features

- **OAuth 2.0 Helpers**: Generate authorization URLs, exchange codes for tokens, handle organization connections
- **Client Factory**: Simple pattern where you manage refresh tokens, the client handles access token lifecycle
- **Type-Safe API**: Full TypeScript support with typed responses
- **Zero Dependencies**: Uses native `fetch` - works in Node.js 18+, Deno, and modern browsers

## Quick Start

### 1. OAuth Flow

First, implement the OAuth flow to get a refresh token:

```typescript
import { JohnDeereOAuth, JD_API_BASE_URLS } from '@acreblitz/platform-integrations';

const useSandbox = process.env.JD_USE_SANDBOX === 'true';

const oauth = new JohnDeereOAuth({
  clientId: process.env.JD_CLIENT_ID,
  clientSecret: process.env.JD_CLIENT_SECRET,
  redirectUri: 'https://yourapp.com/api/auth/callback',
  // Use sandbox for development, production for live apps
  apiBaseUrl: useSandbox ? JD_API_BASE_URLS.SANDBOX : JD_API_BASE_URLS.PRODUCTION,
});

// Generate authorization URL
const { url, state } = oauth.getAuthorizationUrl({
  scopes: ['ag1', 'ag2', 'ag3', 'offline_access'],
});

// Save state for verification, redirect user to `url`
```

### 2. Handle OAuth Callback

In your `/api/auth/callback` endpoint (receives the authorization code):

```typescript
// Exchange code for tokens (includes organization connection check)
const result = await oauth.exchangeCodeForTokens(authCode);

// Save refresh token to your database
await db.saveRefreshToken(userId, result.refreshToken);

// Check if user needs to grant organization access
if (result.connectionsUrl) {
  // Modify redirect_uri to point to your org-connected handler
  // IMPORTANT: The return from org selection does NOT include a code!
  const connectionsUrl = new URL(result.connectionsUrl);
  connectionsUrl.searchParams.set('redirect_uri', 'https://yourapp.com/api/auth/org-connected');
  return redirect(connectionsUrl.toString());
}

// OAuth complete - user has connected orgs!
```

### 3. Handle Organization Connection Completion

In your `/api/auth/org-connected` endpoint (where users return after selecting orgs):

```typescript
// This endpoint does NOT receive an authorization code - it's just a redirect
// Use the existing refresh token to check which orgs are now connected
const result = await oauth.getConnectedOrganizations(refreshToken);

// Update refresh token if a new one was issued
await db.updateRefreshToken(userId, result.refreshToken);

// Check if all orgs are connected
if (result.connectionsUrl) {
  // User still has pending orgs - redirect back to connections
  return redirect(result.connectionsUrl);
}

// All done! User has connected orgs
console.log('Connected orgs:', result.connectedOrganizations);
```

### 4. Use the API Client

```typescript
import { createJohnDeereClient } from '@acreblitz/platform-integrations';

// Create client with refresh token
const client = await createJohnDeereClient({
  clientId: process.env.JD_CLIENT_ID,
  clientSecret: process.env.JD_CLIENT_SECRET,
  refreshToken: savedRefreshToken,
  onTokenRefresh: async (newToken) => {
    // John Deere may issue a new refresh token
    await db.updateRefreshToken(userId, newToken);
  },
});

// Make API calls
const orgs = await client.organizations.list();
const fields = await client.fields.list(orgs[0].id);
const boundaries = await client.boundaries.listForField(orgs[0].id, fields[0].id);
```

## API Reference

### JohnDeereOAuth

OAuth helper class for the authorization flow.

```typescript
import { JohnDeereOAuth, JD_API_BASE_URLS } from '@acreblitz/platform-integrations';

const oauth = new JohnDeereOAuth({
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  // Optional: override default endpoints
  authorizationUrl?: string,
  tokenUrl?: string,
  revokeUrl?: string,
  apiBaseUrl?: string,        // Use JD_API_BASE_URLS.SANDBOX for development
  applicationId?: string,     // Your app UUID (for fallback connections URL)
});
```

#### Methods

##### `getAuthorizationUrl(options)`

Generate the authorization URL to redirect users to John Deere login.

```typescript
const { url, state } = oauth.getAuthorizationUrl({
  scopes: ['ag1', 'ag2', 'offline_access'],
  state?: string, // Optional, auto-generated if not provided
});
```

##### `exchangeCodeForTokens(code)`

Exchange an authorization code for tokens. Also checks organization connections.

```typescript
const result = await oauth.exchangeCodeForTokens(code);
// Returns:
// {
//   accessToken: string,
//   refreshToken: string,
//   tokenType: string,
//   expiresIn: number,
//   organizations: OrganizationConnectionInfo[],
//   connectionsUrl: string | null, // Redirect here if not null
// }
```

##### `getConnectedOrganizations(refreshToken)`

Check which organizations are connected after user returns from org selection.

```typescript
const result = await oauth.getConnectedOrganizations(refreshToken);
// Returns:
// {
//   connectedOrganizations: OrganizationConnectionInfo[],
//   pendingOrganizations: OrganizationConnectionInfo[],
//   connectionsUrl: string | null,
//   refreshToken: string,
// }
```

##### `revokeToken(refreshToken)`

Revoke a refresh token.

```typescript
await oauth.revokeToken(refreshToken);
```

### createJohnDeereClient

Factory function to create an API client.

```typescript
const client = await createJohnDeereClient({
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  baseUrl?: string, // Optional: defaults to production
  onTokenRefresh?: (newToken: string) => void | Promise<void>,
});
```

### JohnDeereClient

The API client returned by `createJohnDeereClient`.

#### Organizations

```typescript
// List all organizations
const orgs = await client.organizations.list();

// Get a specific organization
const org = await client.organizations.get(orgId);
```

#### Fields

```typescript
// List fields for an organization
const fields = await client.fields.list(orgId, {
  recordFilter?: 'active' | 'archived' | 'all',
});

// Get a specific field
const field = await client.fields.get(orgId, fieldId);
```

#### Boundaries

```typescript
// List boundaries for an organization
const boundaries = await client.boundaries.listForOrg(orgId, {
  embed?: 'multipolygons',
  recordFilter?: 'active' | 'archived' | 'all',
});

// List boundaries for a specific field
const fieldBoundaries = await client.boundaries.listForField(orgId, fieldId, {
  embed?: 'multipolygons',
});

// Get a specific boundary
const boundary = await client.boundaries.get(orgId, boundaryId);
```

#### Operations

```typescript
// List operations for a field
const operations = await client.operations.list(orgId, fieldId);
```

## OAuth Scopes

| Scope | Permission Level | Description |
|-------|-----------------|-------------|
| `ag1` | Locations L1 | View Locations |
| `ag2` | Locations L2 | Analyze Production Data |
| `ag3` | Locations L3 | Manage Locations & Production Data |
| `eq1` | Equipment L1 | View Equipment |
| `eq2` | Equipment L2+ | Edit/Manage Equipment |
| `org1` | Org Management L1 | View Staff, Operators, Partners |
| `org2` | Org Management L2 | Modify Staff, Operators, Partners |
| `files` | Files API | Access Files API |
| `offline_access` | - | Request Refresh Token (required!) |

## Error Handling

All API errors throw `JohnDeereError`:

```typescript
import { JohnDeereError } from '@acreblitz/platform-integrations';

try {
  const fields = await client.fields.list(orgId);
} catch (error) {
  if (error instanceof JohnDeereError) {
    console.error(`Error ${error.code}: ${error.message}`);
    console.error(`HTTP Status: ${error.status}`);
  }
}
```

## Token Lifecycle

- **Access tokens** expire after 12 hours
- **Refresh tokens** expire after 365 days of inactivity
- The client factory fetches a fresh access token on creation
- You only need to store and manage the refresh token
- Use `onTokenRefresh` callback to update stored refresh tokens

## Requirements

- Node.js 18+ (uses native `fetch`)
- Or Deno
- Or modern browsers with `fetch` support

## License

MIT

