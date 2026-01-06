import { NextRequest, NextResponse } from "next/server";
import {
  JohnDeereOAuth,
  JD_API_BASE_URLS,
} from "@acreblitz/platform-integrations";
import { TokenManager } from "@/mastra/utils/token-manager";
import { db } from "@/db/client";
import { cachedOrganizations } from "@/db/schema/john-deere-cache";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (error) {
      console.error("OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        `${appUrl}?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`
      );
    }

    if (!code) {
      return NextResponse.redirect(`${appUrl}?error=missing_code`);
    }

    const baseUrl =
      process.env.JOHN_DEERE_USE_SANDBOX === "true"
        ? JD_API_BASE_URLS.SANDBOX
        : JD_API_BASE_URLS.PRODUCTION;

    const oauth = new JohnDeereOAuth({
      clientId: process.env.JOHN_DEERE_CLIENT_ID!,
      clientSecret: process.env.JOHN_DEERE_CLIENT_SECRET!,
      redirectUri: process.env.JOHN_DEERE_REDIRECT_URI!,
      applicationId: process.env.JOHN_DEERE_APPLICATION_ID,
      apiBaseUrl: baseUrl,
    });

    // Exchange code for tokens
    const tokens = await oauth.exchangeCodeForTokens(code);

    // Calculate expiration (JD tokens expire in 12 hours)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expiresIn);

    // Parse scopes
    const scopes = tokens.scope ? tokens.scope.split(" ") : [];

    // Check if we need to redirect to connections page
    if (tokens.connectionsUrl) {
      // Save tokens first, then redirect to complete org connection
      await TokenManager.saveConnection({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        expiresAt,
        scopes,
        organizationIds: [],
      });

      return NextResponse.redirect(tokens.connectionsUrl);
    }

    // Get organization IDs from the token exchange result
    const organizationIds = tokens.organizations.map((org) => org.id);

    // Save tokens
    await TokenManager.saveConnection({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      expiresAt,
      scopes,
      organizationIds,
    });

    // Cache organization data
    for (const org of tokens.organizations) {
      const existing = await db
        .select()
        .from(cachedOrganizations)
        .where(eq(cachedOrganizations.organizationId, org.id))
        .limit(1);

      const orgData = {
        organizationId: org.id,
        name: org.name,
        type: org.type || null,
        rawData: org as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        await db
          .update(cachedOrganizations)
          .set(orgData)
          .where(eq(cachedOrganizations.id, existing[0].id));
      } else {
        await db.insert(cachedOrganizations).values(orgData);
      }
    }

    // Redirect back to app with success
    return NextResponse.redirect(`${appUrl}?connected=true`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}?error=callback_failed&message=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`
    );
  }
}
