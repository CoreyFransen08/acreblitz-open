import { NextResponse } from "next/server";
import {
  JohnDeereOAuth,
  JD_API_BASE_URLS,
} from "@acreblitz/platform-integrations";

export async function GET() {
  try {
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

    const { url, state } = oauth.getAuthorizationUrl({
      scopes: [
        "ag1", // View Locations (fields, boundaries)
        "ag2", // Analyze Production Data
        "ag3", // Manage Locations & Production Data
        "work1", // View Work Plans
        "work2", // Manage Work Plans
        "offline_access", // Refresh tokens
      ],
    });

    // In a production app, you'd save the state to verify later
    // For single-user app, we can skip this
    console.log("OAuth state:", state);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}
