import { NextRequest, NextResponse } from "next/server";
import { JohnDeereOAuth } from "@acreblitz/platform-integrations";

interface ServerLog {
  type: "info" | "success" | "error";
  message: string;
  details?: unknown;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  const logs: ServerLog[] = [];
  const log = (type: ServerLog["type"], message: string, details?: unknown) => {
    logs.push({ type, message, details, timestamp: new Date().toISOString() });
  };

  // Check if this is a re-auth request (after org connection)
  const isReauth = request.nextUrl.searchParams.get("reauth") === "true";
  const baseUrl = request.nextUrl.origin;

  const clientId = process.env.JD_CLIENT_ID;
  const clientSecret = process.env.JD_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;

  log("info", `Initiating OAuth connection request${isReauth ? " (re-auth after org connection)" : ""}`);
  log("info", `Client ID: ${clientId ? clientId.substring(0, 8) + "..." : "MISSING"}`);
  log("info", `Redirect URI: ${redirectUri || "MISSING"}`);

  if (!clientId || !clientSecret || !redirectUri) {
    log("error", "Missing OAuth configuration", {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUri: !!redirectUri,
    });
    
    if (isReauth) {
      // For re-auth, redirect to home with error
      return NextResponse.redirect(`${baseUrl}?error=${encodeURIComponent("Missing OAuth configuration")}`);
    }
    
    return NextResponse.json(
      { error: "Missing OAuth configuration. Check your .env file.", logs },
      { status: 500 }
    );
  }

  try {
    log("info", "Creating JohnDeereOAuth instance");
    const oauth = new JohnDeereOAuth({
      clientId,
      clientSecret,
      redirectUri,
    });

    log("info", "Generating authorization URL with scopes: ag1, ag2, ag3, eq1, work1, offline_access");
    const { url, state } = oauth.getAuthorizationUrl({
      scopes: ["ag1", "ag2", "ag3", "eq1", "work1", "offline_access"],
    });

    log("success", "Authorization URL generated successfully");
    log("info", `State param generated: ${state.substring(0, 16)}...`);

    // If this is a re-auth after org connection, redirect directly
    if (isReauth) {
      console.log("[Auth Connect] Re-auth flow: redirecting directly to John Deere");
      return NextResponse.redirect(url);
    }

    // Normal flow: return JSON for client-side redirect
    return NextResponse.json({ url, state, logs });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    log("error", `Failed to generate auth URL: ${errorMsg}`, err);
    
    if (isReauth) {
      return NextResponse.redirect(`${baseUrl}?error=${encodeURIComponent(errorMsg)}`);
    }
    
    return NextResponse.json(
      { error: errorMsg, logs },
      { status: 500 }
    );
  }
}
