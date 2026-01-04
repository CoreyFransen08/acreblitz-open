import { NextRequest, NextResponse } from "next/server";
import { JohnDeereOAuth } from "@acreblitz/platform-integrations";

/**
 * Force refresh the access token to pick up newly connected organizations
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("jd_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: "No refresh token found" },
      { status: 401 }
    );
  }

  const clientId = process.env.JD_CLIENT_ID;
  const clientSecret = process.env.JD_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;
  const applicationId = process.env.JD_APPLICATION_ID;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "Missing OAuth configuration" },
      { status: 500 }
    );
  }

  try {
    console.log("[Auth Refresh] Refreshing access token...");
    
    const oauth = new JohnDeereOAuth({
      clientId,
      clientSecret,
      redirectUri,
      applicationId,
    });

    const result = await oauth.refreshAccessToken(refreshToken);
    
    console.log("[Auth Refresh] Token refreshed successfully");
    console.log("[Auth Refresh] New refresh token issued:", result.refreshToken !== refreshToken);

    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Token refreshed. Try accessing your fields again.",
    });

    // Update the refresh token if a new one was issued
    if (result.refreshToken !== refreshToken) {
      console.log("[Auth Refresh] Storing new refresh token");
      response.cookies.set("jd_refresh_token", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
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
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refresh token";
    console.error("[Auth Refresh] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

