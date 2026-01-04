# Error Handling

This guide covers how to handle errors when using `@acreblitz/platform-integrations`.

## JohnDeereError

All errors from this package are thrown as `JohnDeereError` instances:

```typescript
import { JohnDeereError } from '@acreblitz/platform-integrations';

try {
  const result = await oauth.exchangeCodeForTokens(code);
} catch (error) {
  if (error instanceof JohnDeereError) {
    console.error({
      message: error.message,   // Human-readable message
      code: error.code,         // Error code for programmatic handling
      status: error.status,     // HTTP status (if applicable)
      details: error.details,   // Raw API error response
    });
  }
}
```

## Error Codes Reference

### OAuth Errors

| Code | When It Occurs | How to Handle |
|------|---------------|---------------|
| `TOKEN_EXCHANGE_FAILED` | Code exchange failed | Check authorization code validity |
| `NO_REFRESH_TOKEN` | Missing refresh token | Add `offline_access` to scopes |
| `REFRESH_FAILED` | Token refresh failed | User needs to re-authenticate |

### HTTP Errors

| Code | Status | When It Occurs | How to Handle |
|------|--------|---------------|---------------|
| `HTTP_400` | 400 | Bad request | Check request parameters |
| `HTTP_401` | 401 | Invalid/expired token | Re-authenticate user |
| `HTTP_403` | 403 | Access denied | Complete org connection setup |
| `HTTP_404` | 404 | Resource not found | Check IDs are valid |
| `HTTP_429` | 429 | Rate limited | Implement backoff, slow down |
| `HTTP_500` | 500 | Server error | Retry with backoff |

### Network Errors

| Code | When It Occurs | How to Handle |
|------|---------------|---------------|
| `TIMEOUT` | Request timed out | Retry with backoff |
| `NETWORK_ERROR` | Network failure | Check connectivity, retry |
| `UNKNOWN_ERROR` | Unexpected error | Log and report |

## Handling Patterns

### Basic Try-Catch

```typescript
import { JohnDeereError } from '@acreblitz/platform-integrations';

async function getFields(orgId: string) {
  try {
    return await client.fields.list(orgId);
  } catch (error) {
    if (error instanceof JohnDeereError) {
      // Handle known errors
      throw new Error(`Failed to get fields: ${error.message}`);
    }
    // Re-throw unknown errors
    throw error;
  }
}
```

### Status-Based Handling

```typescript
async function getFieldsSafe(orgId: string) {
  try {
    return await client.fields.list(orgId);
  } catch (error) {
    if (!(error instanceof JohnDeereError)) throw error;
    
    switch (error.status) {
      case 401:
        // Token invalid - user needs to reconnect
        await disconnectUser(userId);
        throw new AuthError('Please reconnect to John Deere');
        
      case 403:
        // Permission denied - org setup incomplete
        throw new SetupError('Complete John Deere organization setup');
        
      case 404:
        // Resource not found
        return [];  // Or throw, depending on your needs
        
      case 429:
        // Rate limited - wait and retry
        await sleep(5000);
        return getFieldsSafe(orgId);
        
      default:
        throw error;
    }
  }
}
```

### Retry with Exponential Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof JohnDeereError) {
        // Don't retry auth errors
        if (error.status === 401 || error.status === 403) {
          throw error;
        }
        
        // Retry server errors and timeouts
        if (error.status && error.status >= 500 || error.code === 'TIMEOUT') {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

// Usage
const fields = await withRetry(() => client.fields.list(orgId));
```

## Specific Error Scenarios

### 403 Forbidden - Organization Connection Required

When users complete OAuth but haven't selected organizations:

```typescript
const result = await oauth.exchangeCodeForTokens(code);

if (result.connectionsUrl) {
  // Store the tokens (they're still valid)
  await saveRefreshToken(userId, result.refreshToken);
  
  // Redirect user to complete setup
  return redirect(result.connectionsUrl);
}

// If no connectionsUrl, check later API calls
try {
  const orgs = await client.organizations.list();
} catch (error) {
  if (error instanceof JohnDeereError && error.status === 403) {
    // User hasn't completed org connection
    throw new SetupIncompleteError();
  }
}
```

### 401 Unauthorized - Token Invalid

When refresh token is expired or revoked:

```typescript
try {
  const client = await createJohnDeereClient({
    // ...config
    refreshToken: savedToken,
  });
} catch (error) {
  if (error instanceof JohnDeereError && error.status === 401) {
    // Token is invalid - user must reconnect
    await db.deleteToken(userId);
    throw new ReconnectRequiredError('Please reconnect to John Deere');
  }
}
```

### Rate Limiting (429)

John Deere has rate limits. Handle gracefully:

```typescript
async function fetchWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof JohnDeereError && error.status === 429) {
      // Wait and retry once
      const retryAfter = 5000; // Could parse from headers
      await new Promise(r => setTimeout(r, retryAfter));
      return fn();
    }
    throw error;
  }
}
```

## Logging Best Practices

### Development

```typescript
try {
  await someOperation();
} catch (error) {
  if (error instanceof JohnDeereError) {
    console.error('JohnDeere API Error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
      stack: error.stack,
    });
  }
  throw error;
}
```

### Production

```typescript
try {
  await someOperation();
} catch (error) {
  if (error instanceof JohnDeereError) {
    // Log to your monitoring service
    logger.error('JohnDeere API Error', {
      code: error.code,
      status: error.status,
      userId: context.userId,
      // Don't log tokens or sensitive data!
    });
  }
  throw error;
}
```

## User-Facing Error Messages

Map technical errors to user-friendly messages:

```typescript
function getUserMessage(error: JohnDeereError): string {
  switch (error.code) {
    case 'TOKEN_EXCHANGE_FAILED':
      return 'Connection failed. Please try again.';
    
    case 'HTTP_401':
      return 'Your John Deere connection has expired. Please reconnect.';
    
    case 'HTTP_403':
      return 'Please complete the John Deere organization setup.';
    
    case 'HTTP_404':
      return 'The requested data was not found.';
    
    case 'HTTP_429':
      return 'Too many requests. Please wait a moment and try again.';
    
    case 'TIMEOUT':
    case 'NETWORK_ERROR':
      return 'Connection problem. Please check your internet and try again.';
    
    default:
      return 'Something went wrong. Please try again later.';
  }
}
```

## Testing Error Handling

```typescript
// Mock the JohnDeereError for testing
import { JohnDeereError } from '@acreblitz/platform-integrations';

describe('error handling', () => {
  it('handles 403 errors', async () => {
    // Mock the client to throw 403
    jest.spyOn(client.organizations, 'list').mockRejectedValue(
      new JohnDeereError('Access denied', 'HTTP_403', 403)
    );
    
    await expect(getOrganizations()).rejects.toThrow('Complete setup');
  });
});
```

