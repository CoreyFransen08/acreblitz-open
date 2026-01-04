# OAuth 2.0 Explained Simply

This guide explains OAuth 2.0 in plain English, specifically how it works with John Deere.

## What is OAuth?

**OAuth is a way to let users share their data with your app without giving you their password.**

Think of it like a hotel key card:
- You don't get a copy of the master key
- You get a card that opens specific rooms
- The card expires after checkout
- The hotel can revoke it anytime

## The Players

| Term | What It Is | In Our Case |
|------|-----------|-------------|
| **Resource Owner** | The user who owns the data | The farmer |
| **Client** | Your application | Your app |
| **Authorization Server** | Issues tokens | John Deere signin |
| **Resource Server** | Holds the data | John Deere API |

## The Flow (Step by Step)

### 1. User Clicks "Connect"

Your app creates a special URL and redirects the user:

```
https://signin.johndeere.com/oauth2/.../authorize
  ?client_id=YOUR_APP_ID
  &redirect_uri=https://yourapp.com/callback
  &scope=ag1 ag2 offline_access
  &state=random_string_12345
  &response_type=code
```

**What each part means:**
- `client_id` - Identifies your app
- `redirect_uri` - Where to send the user after login
- `scope` - What permissions you're asking for
- `state` - A random string to prevent attacks
- `response_type=code` - We want an authorization code

### 2. User Logs In & Approves

John Deere shows:
1. A login page (if not already logged in)
2. A consent screen listing what your app wants to access

The user can approve or deny.

### 3. John Deere Redirects Back

If approved, John Deere redirects to your callback URL:

```
https://yourapp.com/callback
  ?code=AUTHORIZATION_CODE_HERE
  &state=random_string_12345
```

**Important:** Verify that `state` matches what you sent! This prevents CSRF attacks.

### 4. Exchange Code for Tokens

Your **server** (not browser!) exchanges the code for tokens:

```http
POST https://signin.johndeere.com/oauth2/.../token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTHORIZATION_CODE_HERE
&redirect_uri=https://yourapp.com/callback
&client_id=YOUR_APP_ID
&client_secret=YOUR_SECRET
```

Response:
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "abc123...",
  "token_type": "Bearer",
  "expires_in": 43200
}
```

### 5. Use the Access Token

Include it in API requests:

```http
GET https://api.deere.com/platform/organizations
Authorization: Bearer eyJhbG...
```

### 6. Refresh When Expired

Access tokens expire (12 hours for John Deere). Use the refresh token to get a new one:

```http
POST https://signin.johndeere.com/oauth2/.../token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=abc123...
&client_id=YOUR_APP_ID
&client_secret=YOUR_SECRET
```

## Tokens Explained

### Access Token
- **What:** A credential to access the API
- **Lifespan:** 12 hours
- **Store:** Can be in memory (temporary)
- **Risk if leaked:** Limited damage (expires soon)

### Refresh Token
- **What:** A credential to get new access tokens
- **Lifespan:** 365 days (if used regularly)
- **Store:** MUST be saved securely (database)
- **Risk if leaked:** Can generate access tokens

## John Deere Specific: Organization Connections

John Deere has an extra step. After OAuth, users must:

1. Select which organizations (farms) to share
2. Set permission levels for your app

This happens at `connections.deere.com`. The package detects this automatically and gives you a URL to redirect to.

### The Organization Connection Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Organization Connection Flow                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. OAuth callback → exchangeCodeForTokens()                             │
│           ↓                                                              │
│  2. Check result.connectionsUrl                                          │
│           ↓                                                              │
│  3. Redirect user to connections.deere.com                               │
│           ↓                                                              │
│  4. User selects organizations to share                                  │
│           ↓                                                              │
│  5. JD redirects back to YOUR app (same redirectUri, but NO code!)       │
│           ↓                                                              │
│  6. Call getConnectedOrganizations() to see what was connected           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Implementation

```typescript
// Step 1: OAuth callback (receives code)
// /api/auth/callback
const result = await oauth.exchangeCodeForTokens(code);

// Save refresh token
await db.saveToken(userId, result.refreshToken);

if (result.connectionsUrl) {
  // Step 2: Modify redirect_uri to point to your org-connected handler
  // IMPORTANT: The return from connections does NOT include a code parameter
  const connectionsUrl = new URL(result.connectionsUrl);
  connectionsUrl.searchParams.set('redirect_uri', 'https://yourapp.com/api/auth/org-connected');

  // Step 3: Redirect user to select orgs
  return redirect(connectionsUrl.toString());
}

// If no connectionsUrl, user already has connected orgs
console.log('Connected organizations:', result.organizations);
```

```typescript
// Step 5-6: Handle return from org selection
// /api/auth/org-connected
// NOTE: This endpoint does NOT receive a code - just a redirect

const refreshToken = getStoredRefreshToken(); // From cookie/session

// Use existing token to check which orgs are now connected
const result = await oauth.getConnectedOrganizations(refreshToken);

if (result.connectionsUrl) {
  // User still has pending orgs to connect
  return redirect(result.connectionsUrl);
}

// Success! These are the connected organization IDs
console.log('Connected orgs:', result.connectedOrganizations);
console.log('Pending orgs:', result.pendingOrganizations);
```

### Important Notes

1. **The org-connected callback does NOT receive a code** - It's just a redirect back to your app after the user selects orgs on John Deere's site.

2. **Use the same token** - After org connection, you use the SAME refresh token you already have. The org connection doesn't issue new tokens.

3. **Register both URLs** - If using separate endpoints, both `/api/auth/callback` AND `/api/auth/org-connected` must be registered as valid redirect URIs in the JD Developer Portal.

4. **Avoid redirect loops** - Only redirect to connections once per session. If the user doesn't complete org selection, inform them to do it manually in Operations Center.

## Scopes = Permissions

Scopes tell John Deere what your app can do:

```typescript
scopes: ['ag1', 'ag2', 'ag3', 'offline_access']
```

| Scope | Permission | What You Can Do |
|-------|-----------|-----------------|
| `ag1` | View Locations | Read fields, boundaries |
| `ag2` | Analyze | Access production data |
| `ag3` | Manage | Create/edit/delete data |
| `eq1` | View Equipment | Read machine data |
| `eq2` | Manage Equipment | Edit machine settings |
| `offline_access` | Refresh | Get refresh tokens |

**Best Practice:** Only request scopes you actually need. Users see these permissions and may deny access if you ask for too much.

## Security Checklist

### Do ✅
- Store refresh tokens encrypted in a database
- Verify the `state` parameter on callback
- Use HTTPS for redirect URIs
- Keep `client_secret` on your server only
- Implement `onTokenRefresh` callback

### Don't ❌
- Store tokens in localStorage/cookies (client-side)
- Skip state verification
- Log tokens in production
- Hard-code credentials in source code
- Request unnecessary scopes

## Common Errors

### "Invalid redirect_uri"
Your callback URL doesn't exactly match what's registered in the JD developer portal. Check for:
- `http` vs `https`
- Trailing slashes
- Port numbers
- Exact path match

### "403 Forbidden" on API calls
The user hasn't completed organization connection. Check for `connectionsUrl` in the token exchange result.

### "invalid_grant" when refreshing
The refresh token is:
- Expired (365 days of no use)
- Already used (some providers invalidate after use)
- Revoked by the user

User needs to re-authenticate.

## Diagram: Complete Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OAuth 2.0 Flow                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User        Your App         JD Auth Server      JD API Server    │
│   │             │                   │                   │           │
│   │──(1) Click Connect───▶│        │                   │           │
│   │             │                   │                   │           │
│   │◀──(2) Redirect to JD───│        │                   │           │
│   │             │                   │                   │           │
│   │─────────────(3) Login & Approve─────────▶│         │           │
│   │             │                   │                   │           │
│   │◀────────────(4) Redirect + Code──────────│         │           │
│   │             │                   │                   │           │
│   │──(5) Code──▶│                   │                   │           │
│   │             │──(6) Exchange────▶│                   │           │
│   │             │◀──(7) Tokens──────│                   │           │
│   │             │                   │                   │           │
│   │             │───────────(8) API Call + Token────────▶│          │
│   │             │◀──────────(9) Data────────────────────│          │
│   │◀──(10) Show Data──│             │                   │           │
│   │             │                   │                   │           │
└─────────────────────────────────────────────────────────────────────┘
```

## Summary

1. **Redirect** user to John Deere with your app info
2. **User approves** and gets redirected back with a code
3. **Exchange** the code for access + refresh tokens
4. **Check** if organization connection is needed
5. **Save** the refresh token securely
6. **Use** access token for API calls
7. **Refresh** when access token expires

