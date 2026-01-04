# Code Examples

Working examples for common use cases with `@acreblitz/platform-integrations`.

## Examples Index

- [Next.js Integration](#nextjs-integration)
- [Express.js Integration](#expressjs-integration)
- [Fetching Farm Data](#fetching-farm-data)
- [Syncing Field Boundaries](#syncing-field-boundaries)
- [Background Token Refresh](#background-token-refresh)

---

## Next.js Integration

Complete OAuth flow in Next.js App Router.

### API Route: Connect

```typescript
// app/api/auth/jd/connect/route.ts
import { NextResponse } from 'next/server';
import { JohnDeereOAuth } from '@acreblitz/platform-integrations';
import { cookies } from 'next/headers';

export async function GET() {
  const oauth = new JohnDeereOAuth({
    clientId: process.env.JD_CLIENT_ID!,
    clientSecret: process.env.JD_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/jd/callback`,
  });

  const { url, state } = oauth.getAuthorizationUrl({
    scopes: ['ag1', 'ag2', 'ag3', 'offline_access'],
  });

  // Store state in cookie for verification
  cookies().set('jd_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  });

  return NextResponse.redirect(url);
}
```

### API Route: Callback

```typescript
// app/api/auth/jd/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { JohnDeereOAuth, JohnDeereError } from '@acreblitz/platform-integrations';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Handle errors from JD
  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=${encodeURIComponent(error)}`
    );
  }

  // Verify state
  const savedState = cookies().get('jd_oauth_state')?.value;
  if (!state || state !== savedState) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=invalid_state`
    );
  }

  // Clear state cookie
  cookies().delete('jd_oauth_state');

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=no_code`
    );
  }

  try {
    const oauth = new JohnDeereOAuth({
      clientId: process.env.JD_CLIENT_ID!,
      clientSecret: process.env.JD_CLIENT_SECRET!,
      redirectUri: `${baseUrl}/api/auth/jd/callback`,
    });

    const result = await oauth.exchangeCodeForTokens(code);

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    // Save token to database
    await db.integration.upsert({
      where: { userId_provider: { userId: user.id, provider: 'john-deere' } },
      create: {
        userId: user.id,
        provider: 'john-deere',
        refreshToken: result.refreshToken, // Encrypt in production!
        status: 'active',
      },
      update: {
        refreshToken: result.refreshToken,
        status: 'active',
      },
    });

    // Check if org connection needed
    if (result.connectionsUrl) {
      return NextResponse.redirect(result.connectionsUrl);
    }

    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?success=john-deere`
    );

  } catch (err) {
    const message = err instanceof JohnDeereError ? err.message : 'Unknown error';
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=${encodeURIComponent(message)}`
    );
  }
}
```

### Server Action: Fetch Data

```typescript
// app/actions/john-deere.ts
'use server';

import { createJohnDeereClient, JohnDeereError } from '@acreblitz/platform-integrations';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function getJohnDeereFields() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const integration = await db.integration.findUnique({
    where: { userId_provider: { userId: user.id, provider: 'john-deere' } },
  });

  if (!integration) {
    return { error: 'not_connected', fields: [] };
  }

  try {
    const client = await createJohnDeereClient({
      clientId: process.env.JD_CLIENT_ID!,
      clientSecret: process.env.JD_CLIENT_SECRET!,
      refreshToken: integration.refreshToken,
      onTokenRefresh: async (newToken) => {
        await db.integration.update({
          where: { id: integration.id },
          data: { refreshToken: newToken },
        });
      },
    });

    const orgs = await client.organizations.list();
    const allFields = [];

    for (const org of orgs) {
      const fields = await client.fields.list(org.id);
      allFields.push(...fields.map(f => ({
        ...f,
        organizationId: org.id,
        organizationName: org.name,
      })));
    }

    return { error: null, fields: allFields };

  } catch (error) {
    if (error instanceof JohnDeereError && error.status === 401) {
      // Token expired
      await db.integration.update({
        where: { id: integration.id },
        data: { status: 'expired' },
      });
      return { error: 'token_expired', fields: [] };
    }
    throw error;
  }
}
```

---

## Express.js Integration

Traditional Express.js OAuth flow.

```typescript
// routes/john-deere.ts
import express from 'express';
import { JohnDeereOAuth, createJohnDeereClient } from '@acreblitz/platform-integrations';

const router = express.Router();

const oauth = new JohnDeereOAuth({
  clientId: process.env.JD_CLIENT_ID!,
  clientSecret: process.env.JD_CLIENT_SECRET!,
  redirectUri: `${process.env.APP_URL}/auth/jd/callback`,
});

// Initiate OAuth
router.get('/connect', (req, res) => {
  const { url, state } = oauth.getAuthorizationUrl({
    scopes: ['ag1', 'ag2', 'ag3', 'offline_access'],
  });

  // Store state in session
  req.session.jdOAuthState = state;
  
  res.redirect(url);
});

// Handle callback
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/settings?error=${error}`);
  }

  // Verify state
  if (state !== req.session.jdOAuthState) {
    return res.redirect('/settings?error=invalid_state');
  }
  delete req.session.jdOAuthState;

  try {
    const result = await oauth.exchangeCodeForTokens(code as string);

    // Save to database
    await db.saveJDToken(req.user.id, result.refreshToken);

    if (result.connectionsUrl) {
      return res.redirect(result.connectionsUrl);
    }

    res.redirect('/settings?success=true');

  } catch (err) {
    res.redirect(`/settings?error=${encodeURIComponent(err.message)}`);
  }
});

// Disconnect
router.post('/disconnect', async (req, res) => {
  const token = await db.getJDToken(req.user.id);
  
  if (token) {
    try {
      await oauth.revokeToken(token);
    } catch (err) {
      // Ignore - token may already be invalid
    }
    await db.deleteJDToken(req.user.id);
  }

  res.json({ success: true });
});

export default router;
```

---

## Fetching Farm Data

Complete example of fetching and organizing farm data.

```typescript
// services/farm-data.ts
import { createJohnDeereClient, JohnDeereClient } from '@acreblitz/platform-integrations';

interface FarmData {
  organizations: Array<{
    id: string;
    name: string;
    fields: Array<{
      id: string;
      name: string;
      acres: number;
      boundaries: Array<{
        id: string;
        coordinates: number[][][][];
      }>;
    }>;
  }>;
}

export async function fetchFarmData(
  refreshToken: string,
  onTokenRefresh: (token: string) => Promise<void>
): Promise<FarmData> {
  const client = await createJohnDeereClient({
    clientId: process.env.JD_CLIENT_ID!,
    clientSecret: process.env.JD_CLIENT_SECRET!,
    refreshToken,
    onTokenRefresh,
  });

  const organizations = await client.organizations.list();
  
  const result: FarmData = { organizations: [] };

  for (const org of organizations) {
    const orgData = {
      id: org.id,
      name: org.name,
      fields: [] as FarmData['organizations'][0]['fields'],
    };

    const fields = await client.fields.list(org.id, { recordFilter: 'active' });

    for (const field of fields) {
      const boundaries = await client.boundaries.listForField(
        org.id,
        field.id,
        { embed: 'multipolygons', recordFilter: 'active' }
      );

      orgData.fields.push({
        id: field.id,
        name: field.name,
        acres: field.area?.value ?? 0,
        boundaries: boundaries
          .filter(b => b.multipolygons?.length)
          .map(b => ({
            id: b.id,
            coordinates: b.multipolygons![0].coordinates,
          })),
      });
    }

    result.organizations.push(orgData);
  }

  return result;
}
```

---

## Syncing Field Boundaries

Sync boundaries to your database with change detection.

```typescript
// services/boundary-sync.ts
import { createJohnDeereClient } from '@acreblitz/platform-integrations';
import crypto from 'crypto';

interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
}

export async function syncBoundaries(
  userId: string,
  refreshToken: string
): Promise<SyncResult> {
  const client = await createJohnDeereClient({
    clientId: process.env.JD_CLIENT_ID!,
    clientSecret: process.env.JD_CLIENT_SECRET!,
    refreshToken,
    onTokenRefresh: async (token) => {
      await db.updateToken(userId, token);
    },
  });

  const result: SyncResult = { created: 0, updated: 0, deleted: 0 };

  // Get existing boundaries from our DB
  const existingBoundaries = await db.boundaries.findMany({
    where: { userId },
    select: { jdBoundaryId: true, contentHash: true },
  });
  const existingMap = new Map(
    existingBoundaries.map(b => [b.jdBoundaryId, b.contentHash])
  );

  // Fetch from John Deere
  const orgs = await client.organizations.list();
  const seenIds = new Set<string>();

  for (const org of orgs) {
    const boundaries = await client.boundaries.listForOrg(org.id, {
      embed: 'multipolygons',
      recordFilter: 'active',
    });

    for (const boundary of boundaries) {
      seenIds.add(boundary.id);

      // Calculate hash of content for change detection
      const contentHash = crypto
        .createHash('md5')
        .update(JSON.stringify(boundary.multipolygons))
        .digest('hex');

      const existing = existingMap.get(boundary.id);

      if (!existing) {
        // New boundary
        await db.boundaries.create({
          data: {
            userId,
            jdBoundaryId: boundary.id,
            jdOrgId: org.id,
            name: boundary.name || 'Unnamed',
            geometry: boundary.multipolygons?.[0] || null,
            contentHash,
          },
        });
        result.created++;
      } else if (existing !== contentHash) {
        // Updated boundary
        await db.boundaries.update({
          where: { jdBoundaryId: boundary.id },
          data: {
            name: boundary.name || 'Unnamed',
            geometry: boundary.multipolygons?.[0] || null,
            contentHash,
            updatedAt: new Date(),
          },
        });
        result.updated++;
      }
    }
  }

  // Delete boundaries no longer in JD
  const toDelete = existingBoundaries
    .filter(b => !seenIds.has(b.jdBoundaryId))
    .map(b => b.jdBoundaryId);

  if (toDelete.length > 0) {
    await db.boundaries.deleteMany({
      where: { jdBoundaryId: { in: toDelete } },
    });
    result.deleted = toDelete.length;
  }

  return result;
}
```

---

## Background Token Refresh

Keep tokens fresh with a background job.

```typescript
// jobs/refresh-tokens.ts
import { JohnDeereOAuth } from '@acreblitz/platform-integrations';

/**
 * Run this job periodically (e.g., every 6 hours) to keep tokens fresh.
 * This prevents refresh tokens from expiring due to inactivity.
 */
export async function refreshAllTokens() {
  const oauth = new JohnDeereOAuth({
    clientId: process.env.JD_CLIENT_ID!,
    clientSecret: process.env.JD_CLIENT_SECRET!,
    redirectUri: process.env.JD_REDIRECT_URI!,
  });

  // Get all active integrations
  const integrations = await db.integration.findMany({
    where: {
      provider: 'john-deere',
      status: 'active',
    },
  });

  console.log(`Refreshing ${integrations.length} John Deere tokens`);

  const results = { success: 0, failed: 0 };

  for (const integration of integrations) {
    try {
      const newTokens = await oauth.refreshAccessToken(integration.refreshToken);

      // Update if new refresh token issued
      if (newTokens.refreshToken !== integration.refreshToken) {
        await db.integration.update({
          where: { id: integration.id },
          data: {
            refreshToken: newTokens.refreshToken,
            lastRefreshedAt: new Date(),
          },
        });
      } else {
        await db.integration.update({
          where: { id: integration.id },
          data: { lastRefreshedAt: new Date() },
        });
      }

      results.success++;
    } catch (error) {
      console.error(`Failed to refresh token for user ${integration.userId}:`, error);
      
      // Mark as expired
      await db.integration.update({
        where: { id: integration.id },
        data: { status: 'expired' },
      });

      results.failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`Token refresh complete: ${results.success} success, ${results.failed} failed`);
  return results;
}
```

### Cron Setup (Node-Cron)

```typescript
import cron from 'node-cron';
import { refreshAllTokens } from './jobs/refresh-tokens';

// Run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Starting token refresh job');
  await refreshAllTokens();
});
```

### Cron Setup (Vercel Cron)

```typescript
// app/api/cron/refresh-tokens/route.ts
import { NextResponse } from 'next/server';
import { refreshAllTokens } from '@/jobs/refresh-tokens';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await refreshAllTokens();
  return NextResponse.json(results);
}
```

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/refresh-tokens",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

