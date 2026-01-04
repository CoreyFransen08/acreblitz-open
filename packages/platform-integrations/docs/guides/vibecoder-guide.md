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
```

1. **User clicks "Connect"** → You redirect them to John Deere's login page
2. **User logs in and approves** → John Deere redirects back to your app with a code
3. **You exchange the code** → You get tokens (like keys to access their data)
4. **You use the tokens** → Make API calls to get their farm data

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
import { JohnDeereOAuth } from '@acreblitz/platform-integrations';

const oauth = new JohnDeereOAuth({
  clientId: process.env.JD_CLIENT_ID!,
  clientSecret: process.env.JD_CLIENT_SECRET!,
  redirectUri: process.env.REDIRECT_URI!,
});

export async function handleCallback(code: string, state: string) {
  // First, verify the state matches what we saved earlier
  // (Skip for now, but DO THIS in production!)

  // Exchange the code for tokens
  const result = await oauth.exchangeCodeForTokens(code);

  // result contains:
  // - accessToken: Use this for API calls (expires in 12 hours)
  // - refreshToken: Use this to get new access tokens (save this!)
  // - organizations: List of farms the user has access to
  // - connectionsUrl: If not null, user needs to select which orgs to share

  // SAVE THE REFRESH TOKEN!
  // This is the key that lets you access their data later
  await saveRefreshTokenToDatabase(userId, result.refreshToken);

  // Check if they need to do extra setup
  if (result.connectionsUrl) {
    // Redirect them to complete organization selection
    return { needsOrgSetup: true, url: result.connectionsUrl };
  }

  return { success: true, organizations: result.organizations };
}
```

**What's happening here?**
- `code` is a one-time code that John Deere sends back
- We exchange it for real tokens (like trading a ticket for a prize)
- `refreshToken` is what you save - it lasts up to a year
- `connectionsUrl` appears when users need to choose which farms to share

---

## Step 4: Use the API Client

Now for the fun part - actually getting farm data!

```typescript
// File: get-fields.ts
import { createJohnDeereClient } from '@acreblitz/platform-integrations';

export async function getUserFields(userId: string) {
  // Get the refresh token you saved earlier
  const refreshToken = await getRefreshTokenFromDatabase(userId);

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

  // Get their organizations (farms/operations they manage)
  const orgs = await client.organizations.list();
  
  // Get fields for the first organization
  const fields = await client.fields.list(orgs[0].id);
  
  // Get boundaries for a specific field
  const boundaries = await client.boundaries.listForField(
    orgs[0].id,
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

