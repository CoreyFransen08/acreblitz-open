# Getting Started

This guide walks you through setting up the `@acreblitz/platform-integrations` package to connect with John Deere Operations Center.

## Prerequisites

Before you begin, you'll need:

1. **Node.js 18+** - Uses native `fetch`
2. **A John Deere Developer Account** - [Create one here](https://developer.deere.com/)
3. **A registered application** on developer.deere.com with:
   - Application ID (Client ID)
   - Application Secret (Client Secret)
   - At least one Redirect URI configured

## Installation

```bash
npm install @acreblitz/platform-integrations
```

## Quick Start

### Step 1: Set Up OAuth

```typescript
import { JohnDeereOAuth } from '@acreblitz/platform-integrations';

const oauth = new JohnDeereOAuth({
  clientId: process.env.JD_CLIENT_ID,
  clientSecret: process.env.JD_CLIENT_SECRET,
  redirectUri: 'https://yourapp.com/api/auth/callback',
});
```

### Step 2: Generate Authorization URL

```typescript
// User clicks "Connect to John Deere" button
const { url, state } = oauth.getAuthorizationUrl({
  scopes: ['ag1', 'ag2', 'ag3', 'offline_access'],
});

// IMPORTANT: Save 'state' to verify callback
// Then redirect user to 'url'
```

### Step 3: Handle Callback

```typescript
// In your callback endpoint (e.g., /api/auth/callback)
const result = await oauth.exchangeCodeForTokens(authorizationCode);

// Save the refresh token securely
await saveToDatabase(userId, result.refreshToken);

// Check if organization connection is needed
if (result.connectionsUrl) {
  // Redirect user to complete org selection
  redirect(result.connectionsUrl);
}
```

### Step 4: Use the API Client

```typescript
import { createJohnDeereClient } from '@acreblitz/platform-integrations';

// Create client with saved refresh token
const client = await createJohnDeereClient({
  clientId: process.env.JD_CLIENT_ID,
  clientSecret: process.env.JD_CLIENT_SECRET,
  refreshToken: savedRefreshToken,
  onTokenRefresh: async (newToken) => {
    // John Deere may issue a new refresh token
    await updateRefreshToken(userId, newToken);
  },
});

// Make API calls
const organizations = await client.organizations.list();
const fields = await client.fields.list(organizations[0].id);
```

## Environment Variables

Create a `.env` file:

```env
JD_CLIENT_ID=your_client_id
JD_CLIENT_SECRET=your_client_secret
JD_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

## OAuth Scopes

Choose scopes based on what data you need:

| Scope | Access Level | What You Can Do |
|-------|-------------|-----------------|
| `ag1` | View | Read fields, boundaries |
| `ag2` | Analyze | Read production data |
| `ag3` | Manage | Create/edit fields, boundaries |
| `eq1` | View | Read equipment data |
| `eq2` | Manage | Edit equipment |
| `offline_access` | Required | Get refresh token |

**Always include `offline_access`** to receive a refresh token.

## Next Steps

- [OAuth Flow Explained](./oauth-explained.md) - Understand the complete flow
- [API Reference](../api/john-deere-client.md) - All available methods
- [Examples](../examples/README.md) - Working code samples
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

