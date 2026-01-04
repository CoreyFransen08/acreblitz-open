# Token Management Best Practices

This guide covers how to securely store and manage John Deere OAuth tokens.

## Token Overview

| Token | Purpose | Lifespan | Storage |
|-------|---------|----------|---------|
| Access Token | API calls | 12 hours | Memory (handled by client) |
| Refresh Token | Get new access tokens | 365 days* | Database (your responsibility) |

*Refresh tokens expire after 365 days of **no use**. Regular use keeps them active indefinitely.

## The Golden Rule

> **You only need to store the refresh token.** The access token is handled automatically by `createJohnDeereClient()`.

## Storage Requirements

### Refresh Token Security

The refresh token is sensitive - anyone with it can access the user's farm data. Treat it like a password.

**Must:**
- ✅ Store encrypted in your database
- ✅ Use environment-specific encryption keys
- ✅ Associate with user ID (1:1 relationship)
- ✅ Delete when user disconnects

**Must Not:**
- ❌ Store in browser localStorage/sessionStorage
- ❌ Store in cookies (even httpOnly)
- ❌ Log in plain text
- ❌ Include in API responses to frontend

## Implementation Examples

### Basic Database Storage

```typescript
// Saving after OAuth
const result = await oauth.exchangeCodeForTokens(code);

await db.userIntegrations.upsert({
  where: { userId_provider: { userId, provider: 'john-deere' } },
  create: {
    userId,
    provider: 'john-deere',
    refreshToken: encrypt(result.refreshToken),
    status: 'active',
    connectedAt: new Date(),
  },
  update: {
    refreshToken: encrypt(result.refreshToken),
    status: 'active',
    updatedAt: new Date(),
  },
});
```

### Encrypted Storage

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Complete Storage Service

```typescript
// services/john-deere-tokens.ts

interface StoredToken {
  userId: string;
  refreshToken: string;
  status: 'active' | 'expired' | 'revoked';
  connectedAt: Date;
  lastUsedAt: Date;
}

class JohnDeereTokenService {
  constructor(private db: Database) {}

  async saveToken(userId: string, refreshToken: string): Promise<void> {
    await this.db.jdTokens.upsert({
      where: { userId },
      create: {
        userId,
        refreshToken: encrypt(refreshToken),
        status: 'active',
        connectedAt: new Date(),
        lastUsedAt: new Date(),
      },
      update: {
        refreshToken: encrypt(refreshToken),
        status: 'active',
        lastUsedAt: new Date(),
      },
    });
  }

  async getToken(userId: string): Promise<string | null> {
    const record = await this.db.jdTokens.findUnique({
      where: { userId },
    });

    if (!record || record.status !== 'active') {
      return null;
    }

    // Update last used
    await this.db.jdTokens.update({
      where: { userId },
      data: { lastUsedAt: new Date() },
    });

    return decrypt(record.refreshToken);
  }

  async updateToken(userId: string, newRefreshToken: string): Promise<void> {
    await this.db.jdTokens.update({
      where: { userId },
      data: {
        refreshToken: encrypt(newRefreshToken),
        lastUsedAt: new Date(),
      },
    });
  }

  async revokeToken(userId: string): Promise<void> {
    await this.db.jdTokens.update({
      where: { userId },
      data: { status: 'revoked' },
    });
  }

  async deleteToken(userId: string): Promise<void> {
    await this.db.jdTokens.delete({
      where: { userId },
    });
  }
}
```

## Handling Token Refresh

John Deere may issue a new refresh token during access token refresh. **Always handle this:**

```typescript
const tokenService = new JohnDeereTokenService(db);

async function getJohnDeereClient(userId: string) {
  const refreshToken = await tokenService.getToken(userId);
  
  if (!refreshToken) {
    throw new Error('User not connected to John Deere');
  }

  return createJohnDeereClient({
    clientId: process.env.JD_CLIENT_ID!,
    clientSecret: process.env.JD_CLIENT_SECRET!,
    refreshToken,
    onTokenRefresh: async (newToken) => {
      // CRITICAL: Save the new token
      await tokenService.updateToken(userId, newToken);
    },
  });
}
```

## Token Lifecycle Management

### Checking Connection Status

```typescript
async function isUserConnected(userId: string): Promise<boolean> {
  const token = await tokenService.getToken(userId);
  return token !== null;
}
```

### Handling Disconnection

```typescript
async function disconnectJohnDeere(userId: string): Promise<void> {
  const refreshToken = await tokenService.getToken(userId);
  
  if (refreshToken) {
    // Revoke token with John Deere
    const oauth = new JohnDeereOAuth({
      clientId: process.env.JD_CLIENT_ID!,
      clientSecret: process.env.JD_CLIENT_SECRET!,
      redirectUri: process.env.JD_REDIRECT_URI!,
    });
    
    try {
      await oauth.revokeToken(refreshToken);
    } catch (error) {
      // Token may already be invalid - continue cleanup
      console.warn('Token revocation failed:', error);
    }
  }
  
  // Clean up local storage
  await tokenService.deleteToken(userId);
}
```

### Handling Expired Tokens

```typescript
async function handleExpiredToken(userId: string): Promise<void> {
  await tokenService.revokeToken(userId);
  
  // Notify user they need to reconnect
  await notificationService.send(userId, {
    type: 'john-deere-expired',
    message: 'Your John Deere connection has expired. Please reconnect.',
    action: '/settings/integrations',
  });
}
```

## Database Schema Example

### PostgreSQL

```sql
CREATE TABLE john_deere_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,  -- Encrypted
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jd_tokens_user_id ON john_deere_tokens(user_id);
CREATE INDEX idx_jd_tokens_status ON john_deere_tokens(status);
```

### Prisma Schema

```prisma
model JohnDeereToken {
  id           String   @id @default(uuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshToken String   @db.Text
  status       String   @default("active")
  connectedAt  DateTime @default(now())
  lastUsedAt   DateTime @default(now())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([userId])
  @@index([status])
}
```

## Monitoring & Alerting

### Track Token Usage

```typescript
// Log token usage for monitoring
async function trackTokenUsage(userId: string, action: string) {
  await analytics.track('john_deere_token_usage', {
    userId,
    action,  // 'create', 'refresh', 'revoke', 'use'
    timestamp: new Date().toISOString(),
  });
}
```

### Alert on Failures

```typescript
async function handleTokenFailure(userId: string, error: Error) {
  // Log the error
  logger.error('John Deere token failure', {
    userId,
    error: error.message,
    // Don't log the actual token!
  });
  
  // Alert if many failures
  const recentFailures = await getRecentFailures(userId);
  if (recentFailures > 3) {
    await alerting.send('john-deere-token-failures', {
      userId,
      failureCount: recentFailures,
    });
  }
}
```

## Security Checklist

- [ ] Refresh tokens are encrypted at rest
- [ ] Encryption keys are stored in environment variables
- [ ] Tokens are not logged in plain text
- [ ] Tokens are not exposed to frontend
- [ ] `onTokenRefresh` callback is implemented
- [ ] Token deletion is handled on user disconnect
- [ ] Token deletion cascades on user deletion
- [ ] Database connections use TLS
- [ ] Access to token table is restricted

