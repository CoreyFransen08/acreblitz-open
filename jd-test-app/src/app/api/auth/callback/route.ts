import { NextRequest, NextResponse } from "next/server";
import { JohnDeereOAuth, JD_API_BASE_URLS } from "@acreblitz/platform-integrations";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = request.nextUrl.origin;

  console.log("[JD Callback] Received callback request");
  console.log("[JD Callback] Code:", code ? `${code.substring(0, 10)}...` : "none");
  console.log("[JD Callback] State:", state ? `${state.substring(0, 16)}...` : "none");

  // Handle OAuth errors from JD
  if (error) {
    console.error("[JD Callback] OAuth error:", error, errorDescription);
    const errorMsg = errorDescription || error;
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent(errorMsg)}`
    );
  }

  // This endpoint should only receive OAuth callbacks with a code
  // If there's no code, something went wrong
  if (!code) {
    console.error("[JD Callback] No authorization code received");
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent("No authorization code received. If you just completed org connection, please try again.")}`
    );
  }

  const clientId = process.env.JD_CLIENT_ID;
  const clientSecret = process.env.JD_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;
  const applicationId = process.env.JD_APPLICATION_ID;
  const useSandbox = process.env.JD_USE_SANDBOX === "true";

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("[JD Callback] Missing OAuth configuration");
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent("Missing OAuth configuration")}`
    );
  }

  try {
    const apiBaseUrl = useSandbox ? JD_API_BASE_URLS.SANDBOX : JD_API_BASE_URLS.PRODUCTION;
    console.log("[JD Callback] Exchanging code for tokens...");
    console.log("[JD Callback] Using API:", apiBaseUrl);

    const oauth = new JohnDeereOAuth({
      clientId,
      clientSecret,
      redirectUri,
      applicationId,
      apiBaseUrl,
    });

    const result = await oauth.exchangeCodeForTokens(code);
    console.log("[JD Callback] Token exchange successful");
    console.log("[JD Callback] Access token received:", result.accessToken ? "yes" : "no");
    console.log("[JD Callback] Refresh token received:", result.refreshToken ? "yes" : "no");
    console.log("[JD Callback] Expires in:", result.expiresIn, "seconds");
    console.log("[JD Callback] Organizations found:", result.organizations.length);
    console.log("[JD Callback] Connections URL:", result.connectionsUrl || "none");

    // Build redirect URL with results
    const params = new URLSearchParams({
      success: "true",
    });

    // If org connection is needed, update the redirect_uri to use the org-connected endpoint
    // This prevents the OAuth callback from being called without a code
    if (result.connectionsUrl) {
      console.log("[JD Callback] Organization connection required");
      const connectionsUrl = new URL(result.connectionsUrl);
      connectionsUrl.searchParams.set("redirect_uri", `${baseUrl}/api/auth/org-connected`);
      params.set("connectionsUrl", connectionsUrl.toString());
    }

    if (result.organizations.length > 0) {
      params.set("organizations", JSON.stringify(result.organizations));
    }

    // Create response with redirect
    const response = NextResponse.redirect(`${baseUrl}?${params.toString()}`);

    // Store refresh token in a cookie (for demo purposes)
    // In production, you'd store this securely in a database
    response.cookies.set("jd_refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    // Also set a client-accessible cookie with a truncated version for display
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

    console.log("[JD Callback] Tokens stored in cookies, redirecting to app");
    return response;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Token exchange failed";
    console.error("[JD Callback] Token exchange failed:", errorMsg);
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent(errorMsg)}`
    );
  }
}
