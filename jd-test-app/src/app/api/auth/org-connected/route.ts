import { NextRequest, NextResponse } from "next/server";
import { JohnDeereOAuth, JD_API_BASE_URLS } from "@acreblitz/platform-integrations";

/**
 * Handler for when a user returns from John Deere's organization connection page.
 *
 * This endpoint is called AFTER the user has selected which organizations to
 * share with your application. It does NOT receive an authorization code -
 * it's just a redirect back to your app.
 *
 * Flow:
 * 1. User completes org selection on connections.deere.com
 * 2. John Deere redirects to this endpoint (no code, just a redirect)
 * 3. We use the existing refresh token to check which orgs are now connected
 * 4. Redirect to home page with the connected org info
 */
export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;

  console.log("[JD Org Connected] User returned from org connection flow");

  // Get the existing refresh token from cookie
  const refreshToken = request.cookies.get("jd_refresh_token")?.value;

  if (!refreshToken) {
    console.error("[JD Org Connected] No refresh token found - user needs to re-authenticate");
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent("Session expired. Please connect to John Deere again.")}`
    );
  }

  const clientId = process.env.JD_CLIENT_ID;
  const clientSecret = process.env.JD_CLIENT_SECRET;
  const applicationId = process.env.JD_APPLICATION_ID;
  const useSandbox = process.env.JD_USE_SANDBOX === "true";

  // Use this endpoint as the redirect URI so if there are still pending orgs,
  // the user will return here after completing more org connections
  const redirectUri = `${baseUrl}/api/auth/org-connected`;

  if (!clientId || !clientSecret) {
    console.error("[JD Org Connected] Missing OAuth configuration");
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent("Missing OAuth configuration")}`
    );
  }

  try {
    const apiBaseUrl = useSandbox ? JD_API_BASE_URLS.SANDBOX : JD_API_BASE_URLS.PRODUCTION;
    console.log("[JD Org Connected] Checking connected organizations...");
    console.log("[JD Org Connected] Using API:", apiBaseUrl);

    const oauth = new JohnDeereOAuth({
      clientId,
      clientSecret,
      redirectUri,
      applicationId,
      apiBaseUrl,
    });

    // Use the new method to check which orgs are now connected
    const result = await oauth.getConnectedOrganizations(refreshToken);

    console.log("[JD Org Connected] Connected orgs:", result.connectedOrganizations.length);
    console.log("[JD Org Connected] Pending orgs:", result.pendingOrganizations.length);

    // Update refresh token if a new one was issued
    const response = NextResponse.redirect(
      result.connectionsUrl
        ? // Still have pending orgs - redirect back to connections
          result.connectionsUrl
        : // All done - redirect to home with success
          `${baseUrl}?orgConnected=true&organizations=${encodeURIComponent(
            JSON.stringify(result.connectedOrganizations)
          )}`
    );

    // Update the refresh token cookie (in case a new one was issued)
    response.cookies.set("jd_refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    // Update preview cookie
    response.cookies.set(
      "jd_token_preview",
      result.refreshToken.substring(0, 20) + "...",
      {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      }
    );

    if (result.connectionsUrl) {
      console.log("[JD Org Connected] Still have pending orgs, redirecting back to connections");
    } else {
      console.log("[JD Org Connected] All orgs connected, redirecting to home");
    }

    return response;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to check organization connections";
    console.error("[JD Org Connected] Error:", errorMsg);
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent(errorMsg)}`
    );
  }
}
