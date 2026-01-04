# Your First Integration: A Guide for Vibecoders

Welcome! This guide is specifically written for developers who are learning to code with AI assistance. We'll go step-by-step, explaining not just *what* to do, but *why* we're doing it.

## What We're Building

We're going to connect your app to John Deere Operations Center so farmers can share their field data with your application. Think of it like "Login with Google" but for farm data.

## Prerequisites (What You Need First)

### 1. A John Deere Developer Account

Go to [developer.deere.com](https://developer.deere.com) and create an account. This is free.

### 2. Create an Application

After signing in:
1. Click "My Applications"
2. Click "Create Application"
3. Fill in the details:
   - **App Name**: Your app's name
   - **Redirect URIs**: `http://localhost:3000/api/auth/callback` (for testing)
4. Save it and copy your **Client ID** and **Client Secret**

> ⚠️ **Keep your Client Secret private!** Never commit it to GitHub or share it publicly.

### 3. A Node.js Project

If you don't have one yet, create a simple project:

```bash
mkdir my-farm-app
cd my-farm-app
npm init -y
npm install @acreblitz/platform-integrations
```

---

## Understanding the Flow (The "Why")

Before we write code, let's understand what's happening:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Your App   │────▶│  John Deere  │────▶│   Farmer    │
│             │◀────│    Login     │◀────│   Grants    │
│ Gets tokens │     │    Page      │     │   Access    │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                        │
       │            ┌──────────────┐            │
       │            │  Connections │◀───────────┘
       │◀───────────│    Page      │   (if needed)
       │            │ (Select Orgs)│
       │            └──────────────┘
       ▼
 Store tokens &
 organization IDs
```

1. **User clicks "Connect"** → You redirect them to John Deere's login page
2. **User logs in and approves** → John Deere redirects back to your app with a code
3. **You exchange the code** → You get tokens (like keys to access their data)
4. **Check for `connectionsUrl`** → If present, redirect user to select organizations
5. **User selects organizations** → They return to your `/org-connected` endpoint
6. **Store tokens AND organization IDs** → You need the org ID for API calls
7. **Use the tokens** → Make API calls with the organization ID

---

## Step 1: Set Up Your Environment

Create a file called `.env` in your project root:

```env
# Get these from developer.deere.com
JD_CLIENT_ID=your_client_id_here
JD_CLIENT_SECRET=your_client_secret_here

# This must match what you entered in the JD developer portal
REDIRECT_URI=http://localhost:3000/api/auth/callback
```

> 💡 **Why .env?** We keep secrets in `.env` files so they don't accidentally get shared. Add `.env` to your `.gitignore` file!

---

## Step 2: Create the Connect Button Handler

This is the code that runs when someone clicks "Connect to John Deere":

```typescript
// File: connect.ts
import { JohnDeereOAuth } from '@acreblitz/platform-integrations';

// Create the OAuth helper
const oauth = new JohnDeereOAuth({
  clientId: process.env.JD_CLIENT_ID!,        // The ! tells TypeScript we know it exists
  clientSecret: process.env.JD_CLIENT_SECRET!,
  redirectUri: process.env.REDIRECT_URI!,
});

export function getConnectUrl() {
  // Generate the URL to send users to
  const { url, state } = oauth.getAuthorizationUrl({
    scopes: ['ag1', 'ag2', 'ag3', 'offline_access'],
  });

  // IMPORTANT: Save 'state' somewhere (session, cookie, database)
  // We'll need it later to verify the callback is legitimate
  
  return { url, state };
}
```

**What's happening here?**
- `JohnDeereOAuth` is a helper class that handles the tricky OAuth stuff
- `getAuthorizationUrl` creates a special URL with your app info embedded
- `scopes` tell John Deere what data permissions you're requesting
- `state` is a random string we use to prevent attacks

---

## Step 3: Handle the Callback

After the user approves, John Deere redirects them back to your app:

```typescript
// File: callback.ts
import { JohnDeereOAuth, JD_API_BASE_URLS } from '@acreblitz/platform-integrations';

const oauth = new JohnDeereOAuth({
  clientId: process.env.JD_CLIENT_ID!,
  clientSecret: process.env.JD_CLIENT_SECRET!,
  redirectUri: process.env.REDIRECT_URI!,
  applicationId: process.env.JD_APPLICATION_ID,  // Optional but recommended
  apiBaseUrl: JD_API_BASE_URLS.PRODUCTION,       // Or SANDBOX for testing
});

export async function handleCallback(code: string, state: string, baseUrl: string) {
  // First, verify the state matches what we saved earlier
  // (Skip for now, but DO THIS in production!)

  // Exchange the code for tokens
  const result = await oauth.exchangeCodeForTokens(code);

  // result contains:
  // - accessToken: Use this for API calls (expires in 12 hours)
  // - refreshToken: Use this to get new access tokens (save this!)
  // - organizations: List of orgs the user has access to (may be empty!)
  // - connectionsUrl: If not null, user needs to select which orgs to share

  // SAVE THE REFRESH TOKEN!
  // This is the key that lets you access their data later
  await saveRefreshTokenToDatabase(userId, result.refreshToken);

  // Check if they need to do extra setup
  if (result.connectionsUrl) {
    // IMPORTANT: Modify the redirect_uri in the connections URL!
    // After org selection, JD will redirect back. We need it to go to a
    // DIFFERENT endpoint than the OAuth callback (which expects a code).
    const connectionsUrl = new URL(result.connectionsUrl);
    connectionsUrl.searchParams.set('redirect_uri', `${baseUrl}/api/auth/org-connected`);

    return { needsOrgSetup: true, url: connectionsUrl.toString() };
  }

  // Save organization IDs for later API calls
  if (result.organizations.length > 0) {
    await saveOrganizationIds(userId, result.organizations);
  }

  return { success: true, organizations: result.organizations };
}
```

**What's happening here?**
- `code` is a one-time code that John Deere sends back
- We exchange it for real tokens (like trading a ticket for a prize)
- `refreshToken` is what you save - it lasts up to a year
- `connectionsUrl` appears when users need to choose which farms to share
- **Critical**: We modify the `redirect_uri` in the connections URL to point to a different endpoint (`/api/auth/org-connected`) because the org connection redirect does NOT include an authorization code

### TokenExchangeResult Type

Here's the exact TypeScript type returned by `exchangeCodeForTokens()`:

```typescript
interface TokenExchangeResult {
  /** The access token for API calls (expires in ~12 hours) */
  accessToken: string;
  /** The refresh token for obtaining new access tokens (save this!) */
  refreshToken: string;
  /** Token type (usually "Bearer") */
  tokenType: string;
  /** Time in seconds until the access token expires */
  expiresIn: number;
  /** Granted scopes */
  scope?: string;
  /** List of organizations the user has access to */
  organizations: OrganizationConnectionInfo[];
  /**
   * If any organization needs connection setup, this URL is provided.
   * Redirect the user to this URL to complete org selection.
   * Will be null if all orgs are already connected.
   */
  connectionsUrl: string | null;
}

interface OrganizationConnectionInfo {
  /** Organization ID - USE THIS FOR API CALLS */
  id: string;
  /** Organization name (e.g., "Smith Family Farms") */
  name: string;
  /** Organization type (e.g., "customer", "dealer") */
  type?: string;
  /** Whether this organization needs the user to complete connection setup */
  needsConnection: boolean;
  /** The connections URL if needsConnection is true */
  connectionsUrl?: string;
}
```

**Example response:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "v1.MjU2OmFkNjg0OGNm...",
  "tokenType": "Bearer",
  "expiresIn": 43200,
  "scope": "ag1 ag2 ag3 offline_access",
  "organizations": [
    {
      "id": "123456",
      "name": "Smith Family Farms",
      "type": "customer",
      "needsConnection": false
    }
  ],
  "connectionsUrl": null
}
```

---

## Step 3b: Handle Organization Connection Return

When users return from the organization connection page, they come back to your `org-connected` endpoint (NOT the OAuth callback). This endpoint doesn't receive a code - it just needs to check which organizations are now connected:

```typescript
// File: org-connected.ts
import { JohnDeereOAuth, JD_API_BASE_URLS } from '@acreblitz/platform-integrations';

export async function handleOrgConnected(userId: string, baseUrl: string) {
  // Get the existing refresh token you saved during the initial callback
  const refreshToken = await getRefreshTokenFromDatabase(userId);

  if (!refreshToken) {
    // User's session expired - they need to start over
    throw new Error('Session expired. Please connect to John Deere again.');
  }

  const oauth = new JohnDeereOAuth({
    clientId: process.env.JD_CLIENT_ID!,
    clientSecret: process.env.JD_CLIENT_SECRET!,
    // Use org-connected as redirect URI so if there are MORE pending orgs,
    // the user will return here again after connecting them
    redirectUri: `${baseUrl}/api/auth/org-connected`,
    applicationId: process.env.JD_APPLICATION_ID,
    apiBaseUrl: JD_API_BASE_URLS.PRODUCTION,
  });

  // Check which organizations are now connected
  const result = await oauth.getConnectedOrganizations(refreshToken);

  // result contains:
  // - connectedOrganizations: Orgs that are fully connected
  // - pendingOrganizations: Orgs that still need connection
  // - connectionsUrl: If not null, there are still pending orgs
  // - refreshToken: Save this - it may be a new token!

  // Always update the refresh token (JD may issue a new one)
  await saveRefreshTokenToDatabase(userId, result.refreshToken);

  // Save connected organization IDs for API calls
  if (result.connectedOrganizations.length > 0) {
    await saveOrganizationIds(userId, result.connectedOrganizations);
  }

  // Check if there are still pending orgs
  if (result.connectionsUrl) {
    // Still have orgs to connect - redirect back to connections page
    return { needsMoreOrgs: true, url: result.connectionsUrl };
  }

  return {
    success: true,
    organizations: result.connectedOrganizations
  };
}
```

**Why is this a separate endpoint?**
- The OAuth callback (`/api/auth/callback`) expects an authorization `code` parameter
- The org connection page redirects WITHOUT a code - it's just a redirect back to your app
- If you use the same endpoint, you'll get errors about missing codes
- Having a separate endpoint makes the flow clear and prevents confusion

### ConnectedOrganizationsResult Type

Here's the exact TypeScript type returned by `getConnectedOrganizations()`:

```typescript
interface ConnectedOrganizationsResult {
  /** Organizations that are fully connected and ready for API calls */
  connectedOrganizations: OrganizationConnectionInfo[];
  /** Organizations that still need the user to complete connection */
  pendingOrganizations: OrganizationConnectionInfo[];
  /**
   * If there are still pending organizations, this URL is provided.
   * Redirect the user to complete remaining org connections.
   */
  connectionsUrl: string | null;
  /** The refresh token (may be updated - always save this!) */
  refreshToken: string;
}
```

**Example response (all orgs connected):**
```json
{
  "connectedOrganizations": [
    {
      "id": "123456",
      "name": "Smith Family Farms",
      "type": "customer",
      "needsConnection": false
    },
    {
      "id": "789012",
      "name": "Smith Consulting",
      "type": "customer",
      "needsConnection": false
    }
  ],
  "pendingOrganizations": [],
  "connectionsUrl": null,
  "refreshToken": "v1.MjU2OmFkNjg0OGNm..."
}
```

**Example response (still has pending orgs):**
```json
{
  "connectedOrganizations": [
    {
      "id": "123456",
      "name": "Smith Family Farms",
      "type": "customer",
      "needsConnection": false
    }
  ],
  "pendingOrganizations": [
    {
      "id": "789012",
      "name": "Partner Co-op",
      "type": "customer",
      "needsConnection": true,
      "connectionsUrl": "https://connections.deere.com/..."
    }
  ],
  "connectionsUrl": "https://connections.deere.com/connections/abc-123/select-organizations?redirect_uri=...",
  "refreshToken": "v1.MjU2OmFkNjg0OGNm..."
}
```

---

## Step 4: Use the API Client

Now for the fun part - actually getting farm data!

```typescript
// File: get-fields.ts
import { createJohnDeereClient } from '@acreblitz/platform-integrations';

export async function getUserFields(userId: string) {
  // Get the refresh token you saved earlier
  const refreshToken = await getRefreshTokenFromDatabase(userId);

  // Get the organization ID you saved during auth flow
  // IMPORTANT: Most API calls require an organization ID!
  const organizationId = await getOrganizationIdFromDatabase(userId);

  // Create an API client
  // This automatically gets a fresh access token for you!
  const client = await createJohnDeereClient({
    clientId: process.env.JD_CLIENT_ID!,
    clientSecret: process.env.JD_CLIENT_SECRET!,
    refreshToken: refreshToken,
    onTokenRefresh: async (newToken) => {
      // John Deere sometimes gives us a new refresh token
      // We need to save it when that happens
      await updateRefreshTokenInDatabase(userId, newToken);
    },
  });

  // If you need to list all organizations the user has access to:
  const orgs = await client.organizations.list();

  // Get fields for a specific organization
  // The organizationId is required for most API calls!
  const fields = await client.fields.list(organizationId);

  // Get boundaries for a specific field
  const boundaries = await client.boundaries.listForField(
    organizationId,
    fields[0].id,
    { embed: 'multipolygons' }  // Include the actual shape data
  );

  return { orgs, fields, boundaries };
}
```

**What's happening here?**
- `createJohnDeereClient` handles all the token management for you
- It automatically refreshes expired tokens
- You just call methods like `client.fields.list()` to get data
- The `onTokenRefresh` callback is important - sometimes JD issues new refresh tokens

### Understanding Organization IDs

The organization ID is crucial - **almost every API call requires it**. Here's how to manage it:

```typescript
// Organization object structure (what you get from auth flow)
interface Organization {
  id: string;        // e.g., "123456" - THIS is what you need for API calls
  name: string;      // e.g., "Smith Family Farms"
  type: string;      // e.g., "customer"
}

// Example: Storing organization during auth callback
async function saveOrganizationIds(userId: string, orgs: Organization[]) {
  // Store in your database - you'll need the ID for every API call!
  // Consider storing the full org object so you can display the name to users
  await database.users.update({
    where: { id: userId },
    data: {
      // If user has multiple orgs, you might want to let them choose
      // For now, we'll just save the first one as their "active" org
      activeOrganizationId: orgs[0].id,
      // Optionally store all org IDs if user has multiple
      organizationIds: orgs.map(org => org.id),
    }
  });
}

// Example: Using organization ID for API calls
async function getFieldsForUser(userId: string) {
  const user = await database.users.findUnique({ where: { id: userId }});
  const organizationId = user.activeOrganizationId;

  const client = await createJohnDeereClient({ /* ... */ });

  // Pass organizationId to API methods
  const fields = await client.fields.list(organizationId);
  const machines = await client.machines.list(organizationId);

  return { fields, machines };
}
```

> 💡 **Why is organization ID needed?** Farmers can belong to multiple organizations (their own farm, a co-op, a consulting business, etc.). The organization ID tells John Deere which organization's data you want to access.

---

## Common Mistakes (And How to Avoid Them)

### ❌ Mistake 1: Forgetting `offline_access` Scope

```typescript
// BAD - won't get a refresh token!
scopes: ['ag1', 'ag2']

// GOOD - includes offline_access
scopes: ['ag1', 'ag2', 'offline_access']
```

### ❌ Mistake 2: Not Saving the Refresh Token

```typescript
// BAD - token is lost when function ends!
const result = await oauth.exchangeCodeForTokens(code);
// ...forgot to save result.refreshToken

// GOOD - save it somewhere permanent
await database.users.update({
  where: { id: userId },
  data: { jdRefreshToken: result.refreshToken }
});
```

### ❌ Mistake 3: Ignoring `onTokenRefresh`

```typescript
// BAD - you'll lose access when JD issues a new token
const client = await createJohnDeereClient({
  clientId: '...',
  clientSecret: '...',
  refreshToken: savedToken,
  // No onTokenRefresh callback!
});

// GOOD - update your saved token when JD issues a new one
const client = await createJohnDeereClient({
  // ...
  onTokenRefresh: async (newToken) => {
    await updateTokenInDatabase(userId, newToken);
  },
});
```

### ❌ Mistake 4: Skipping Organization Connection

```typescript
// BAD - assuming connection is complete
const result = await oauth.exchangeCodeForTokens(code);
// Immediately try to use API... get 403 errors!

// GOOD - check if org setup is needed
if (result.connectionsUrl) {
  // Redirect user to complete setup
  redirect(result.connectionsUrl);
}
```

### ❌ Mistake 5: Using OAuth Callback for Org Connection Return

```typescript
// BAD - using the same endpoint for OAuth callback AND org connection return
// The org connection redirect does NOT include a code!
export async function handleCallback(code: string) {
  // This will fail when user returns from org connection
  // because there's no code parameter!
}

// GOOD - use separate endpoints
// /api/auth/callback - handles OAuth with code exchange
// /api/auth/org-connected - handles return from org selection (no code)
if (result.connectionsUrl) {
  const url = new URL(result.connectionsUrl);
  url.searchParams.set('redirect_uri', `${baseUrl}/api/auth/org-connected`);
  redirect(url.toString());
}
```

### ❌ Mistake 6: Not Saving Organization IDs

```typescript
// BAD - throwing away the org info from auth flow
const result = await oauth.exchangeCodeForTokens(code);
await saveRefreshToken(result.refreshToken);
// Forgot to save organization IDs!

// Later... how do I know which org to use for API calls?
const fields = await client.fields.list(???); // 🤷

// GOOD - save organization info during auth
const result = await oauth.exchangeCodeForTokens(code);
await saveRefreshToken(result.refreshToken);
await saveOrganizations(result.organizations);  // Save these!

// Later... I know exactly which org to use
const orgId = await getActiveOrganizationId(userId);
const fields = await client.fields.list(orgId);  // ✅
```

---

## Testing Your Integration

### 1. Use the Test App

We provide a test app at `opensrc/jd-test-app` that you can run locally to test the OAuth flow without building everything yourself.

### 2. Use Console Logging

Add logs to understand what's happening:

```typescript
const result = await oauth.exchangeCodeForTokens(code);
console.log('Token exchange result:', {
  hasRefreshToken: !!result.refreshToken,
  orgCount: result.organizations.length,
  needsConnection: !!result.connectionsUrl,
});
```

### 3. Test with Sandbox (Optional)

John Deere has a sandbox environment for testing:

```typescript
const oauth = new JohnDeereOAuth({
  // ... your config
  apiBaseUrl: 'https://sandboxapi.deere.com/platform',
});
```

---

## What's Next?

Now that you understand the basics:

1. **Build a real UI** - Create buttons and pages for users to connect
2. **Handle errors** - See [Error Handling Guide](./error-handling.md)
3. **Store tokens securely** - See [Token Management](./token-management.md)
4. **Explore the API** - See [API Reference](../api/john-deere-client.md)

---

## Getting Help

Stuck? Here are your options:

1. **Check [Troubleshooting](./troubleshooting.md)** - Common issues and solutions
2. **Look at [Examples](../examples/README.md)** - Working code you can copy
3. **Read the [API Docs](../api/README.md)** - Detailed method documentation

Remember: Every developer was a beginner once. Take your time, read the errors carefully, and don't be afraid to ask your AI assistant for help!

