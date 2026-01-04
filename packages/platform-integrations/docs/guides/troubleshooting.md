# Troubleshooting Guide

Common issues and their solutions when using `@acreblitz/platform-integrations`.

## Quick Diagnostics

Before diving into specific issues, check these common problems:

```typescript
// Diagnostic helper
async function diagnoseConnection(userId: string) {
  const results = {
    hasToken: false,
    tokenValid: false,
    canListOrgs: false,
    orgCount: 0,
    errors: [] as string[],
  };

  try {
    const token = await db.getRefreshToken(userId);
    results.hasToken = !!token;
    
    if (!token) {
      results.errors.push('No refresh token found');
      return results;
    }

    const client = await createJohnDeereClient({
      clientId: process.env.JD_CLIENT_ID!,
      clientSecret: process.env.JD_CLIENT_SECRET!,
      refreshToken: token,
    });
    results.tokenValid = true;

    const orgs = await client.organizations.list();
    results.canListOrgs = true;
    results.orgCount = orgs.length;

  } catch (error) {
    if (error instanceof JohnDeereError) {
      results.errors.push(`${error.code}: ${error.message}`);
    } else {
      results.errors.push(String(error));
    }
  }

  return results;
}
```

---

## Common Issues

### "Invalid redirect_uri" Error

**Symptoms:**
- Error during OAuth callback
- Browser shows "400 Bad Request" or "Invalid redirect URI"

**Causes:**
1. Redirect URI doesn't exactly match what's registered
2. URL encoding issues
3. Protocol mismatch (http vs https)

**Solutions:**

```typescript
// Check your redirect URI matches EXACTLY
// In JD Developer Portal: http://localhost:3000/api/auth/callback
// In your code:
const oauth = new JohnDeereOAuth({
  redirectUri: 'http://localhost:3000/api/auth/callback', // Must match!
});

// Common mistakes:
// ❌ 'http://localhost:3000/api/auth/callback/'  (trailing slash)
// ❌ 'https://localhost:3000/api/auth/callback'  (wrong protocol)
// ❌ 'http://127.0.0.1:3000/api/auth/callback'   (localhost vs IP)
```

---

### 403 Forbidden on API Calls

**Symptoms:**
- OAuth completes successfully
- All API calls return 403 Forbidden

**Cause:**
User hasn't completed organization connection setup.

**Solution:**

```typescript
// After token exchange, check for connectionsUrl
const result = await oauth.exchangeCodeForTokens(code);

if (result.connectionsUrl) {
  // User MUST complete this step
  console.log('Redirect user to:', result.connectionsUrl);
  return redirect(result.connectionsUrl);
}

// Even if connectionsUrl is null, verify by listing orgs
const client = await createJohnDeereClient({ ... });
const orgs = await client.organizations.list();

if (orgs.length === 0) {
  console.log('No organizations accessible');
}
```

---

### "No refresh token received"

**Symptoms:**
- `TokenExchangeResult.refreshToken` is undefined
- `NO_REFRESH_TOKEN` error

**Cause:**
Missing `offline_access` scope.

**Solution:**

```typescript
// ALWAYS include offline_access
const { url } = oauth.getAuthorizationUrl({
  scopes: ['ag1', 'ag2', 'ag3', 'offline_access'], // ← Required!
});
```

---

### Token Refresh Fails

**Symptoms:**
- `createJohnDeereClient()` throws error
- `invalid_grant` or `401` errors

**Causes:**
1. Refresh token expired (365 days of no use)
2. User revoked access in JD Operations Center
3. Token was already used (some edge cases)

**Solution:**

```typescript
try {
  const client = await createJohnDeereClient({
    clientId: process.env.JD_CLIENT_ID!,
    clientSecret: process.env.JD_CLIENT_SECRET!,
    refreshToken: savedToken,
  });
} catch (error) {
  if (error instanceof JohnDeereError) {
    if (error.status === 401 || error.code === 'REFRESH_FAILED') {
      // Token is invalid - user must reconnect
      await db.deleteToken(userId);
      throw new Error('Please reconnect to John Deere');
    }
  }
  throw error;
}
```

---

### Rate Limiting (429 Errors)

**Symptoms:**
- API calls intermittently fail with 429
- "Too Many Requests" errors

**Cause:**
Making too many API requests too quickly.

**Solution:**

```typescript
// Implement request throttling
import pLimit from 'p-limit';

const limit = pLimit(5); // Max 5 concurrent requests

async function fetchAllFields(client: JohnDeereClient, orgIds: string[]) {
  const results = await Promise.all(
    orgIds.map(orgId => 
      limit(() => client.fields.list(orgId))
    )
  );
  return results.flat();
}

// Add delays between batches
async function fetchWithDelay<T>(
  items: string[],
  fetcher: (id: string) => Promise<T>,
  delayMs = 100
): Promise<T[]> {
  const results: T[] = [];
  for (const item of items) {
    results.push(await fetcher(item));
    await new Promise(r => setTimeout(r, delayMs));
  }
  return results;
}
```

---

### Empty Organizations List

**Symptoms:**
- `client.organizations.list()` returns empty array
- Token exchange succeeded

**Causes:**
1. User hasn't completed org connection
2. User has no organizations in JD
3. Scopes don't include org access
4. **Using wrong API URL (sandbox vs production)**

**Solution:**

```typescript
// Check for connection requirement
const result = await oauth.exchangeCodeForTokens(code);

if (result.connectionsUrl) {
  // This is the issue - redirect user
  return { needsSetup: true, url: result.connectionsUrl };
}

// If no connectionsUrl but still empty, check scopes
// Ensure you requested at least 'ag1' scope
```

---

### Sandbox vs Production API Mismatch

**Symptoms:**
- API calls return empty responses `{}`
- Organizations list is always empty
- Token exchange succeeds but API calls fail silently

**Cause:**
Your app credentials are for sandbox but you're calling the production API, or vice versa.

**Solution:**

```typescript
import { JohnDeereOAuth, JD_API_BASE_URLS } from '@acreblitz/platform-integrations';

// Check which environment your credentials are for!
const useSandbox = process.env.JD_USE_SANDBOX === 'true';

const oauth = new JohnDeereOAuth({
  clientId: process.env.JD_CLIENT_ID,
  clientSecret: process.env.JD_CLIENT_SECRET,
  redirectUri: 'https://myapp.com/callback',
  // IMPORTANT: Use the correct API URL for your credentials
  apiBaseUrl: useSandbox
    ? JD_API_BASE_URLS.SANDBOX    // https://sandboxapi.deere.com/platform
    : JD_API_BASE_URLS.PRODUCTION, // https://api.deere.com/platform
});

// Same for the client
const client = await createJohnDeereClient({
  clientId: process.env.JD_CLIENT_ID,
  clientSecret: process.env.JD_CLIENT_SECRET,
  refreshToken: savedToken,
  baseUrl: useSandbox
    ? JD_API_BASE_URLS.SANDBOX
    : JD_API_BASE_URLS.PRODUCTION,
});
```

**How to tell which environment your credentials are for:**
- Check your app settings at [developer.deere.com](https://developer.deere.com)
- Sandbox apps are created in the sandbox environment
- Production apps require approval from John Deere

---

### State Mismatch Error

**Symptoms:**
- "Invalid state" error on callback
- CSRF protection triggered

**Causes:**
1. State wasn't saved before redirect
2. State storage expired
3. User opened multiple auth tabs

**Solution:**

```typescript
// Properly save state before redirect
app.get('/connect', async (req, res) => {
  const { url, state } = oauth.getAuthorizationUrl({
    scopes: ['ag1', 'ag2', 'offline_access'],
  });
  
  // Save state in session
  req.session.oauthState = state;
  
  res.redirect(url);
});

// Verify on callback
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (state !== req.session.oauthState) {
    return res.status(400).send('Invalid state - possible CSRF attack');
  }
  
  // Clear state
  delete req.session.oauthState;
  
  // Continue with token exchange...
});
```

---

### Network/Timeout Errors

**Symptoms:**
- `TIMEOUT` or `NETWORK_ERROR` codes
- Intermittent failures

**Causes:**
1. Poor network connectivity
2. JD API temporarily unavailable
3. Request taking too long

**Solution:**

```typescript
// Implement retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof JohnDeereError) {
        if (error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR') {
          if (i < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            continue;
          }
        }
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Debug Mode

Enable detailed logging during development:

```typescript
// Create a wrapper that logs all operations
function createDebugClient(config: JohnDeereClientConfig) {
  return createJohnDeereClient({
    ...config,
    onTokenRefresh: async (newToken) => {
      console.log('[JD] Token refreshed');
      await config.onTokenRefresh?.(newToken);
    },
  }).then(client => {
    // Wrap each method with logging
    return new Proxy(client, {
      get(target, prop) {
        const value = target[prop as keyof typeof target];
        if (typeof value === 'object' && value !== null) {
          return new Proxy(value, {
            get(t, p) {
              const method = t[p as keyof typeof t];
              if (typeof method === 'function') {
                return async (...args: unknown[]) => {
                  console.log(`[JD] ${String(prop)}.${String(p)}`, args);
                  const start = Date.now();
                  try {
                    const result = await method.apply(t, args);
                    console.log(`[JD] Success (${Date.now() - start}ms)`);
                    return result;
                  } catch (error) {
                    console.error(`[JD] Error (${Date.now() - start}ms)`, error);
                    throw error;
                  }
                };
              }
              return method;
            },
          });
        }
        return value;
      },
    });
  });
}
```

---

## Getting Help

If you're still stuck:

1. **Check the error details:**
   ```typescript
   catch (error) {
     if (error instanceof JohnDeereError) {
       console.log('Full error:', JSON.stringify({
         message: error.message,
         code: error.code,
         status: error.status,
         details: error.details,
       }, null, 2));
     }
   }
   ```

2. **Verify your credentials:**
   - Client ID and Secret are correct
   - Redirect URI matches exactly
   - Scopes include what you need

3. **Test with the sandbox:**
   ```typescript
   const oauth = new JohnDeereOAuth({
     // ...
     apiBaseUrl: 'https://sandboxapi.deere.com/platform',
   });
   ```

4. **Check John Deere status:**
   - [JD Developer Portal](https://developer.deere.com)
   - Status page or announcements

