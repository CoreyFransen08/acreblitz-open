import {
  createJohnDeereClient,
  JD_API_BASE_URLS,
} from "@acreblitz/platform-integrations";
import { TokenManager } from "./token-manager";

export async function getJohnDeereClient() {
  const connection = await TokenManager.getConnection();

  if (!connection) {
    throw new Error(
      "No John Deere connection found. Please connect your account first."
    );
  }

  const baseUrl =
    process.env.JOHN_DEERE_USE_SANDBOX === "true"
      ? JD_API_BASE_URLS.SANDBOX
      : JD_API_BASE_URLS.PRODUCTION;

  const client = await createJohnDeereClient({
    clientId: process.env.JOHN_DEERE_CLIENT_ID!,
    clientSecret: process.env.JOHN_DEERE_CLIENT_SECRET!,
    refreshToken: connection.refreshToken,
    baseUrl,
    onTokenRefresh: async (newToken: string) => {
      // Calculate expiration time (JD tokens expire in 12 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 12);

      await TokenManager.updateTokens({
        accessToken: newToken,
        refreshToken: newToken,
        expiresAt,
      });
    },
  });

  // Touch the connection to update last used timestamp
  await TokenManager.touchConnection();

  return client;
}

/**
 * Check if we have a valid John Deere connection
 */
export async function hasValidConnection(): Promise<boolean> {
  try {
    const connection = await TokenManager.getConnection();
    if (!connection) return false;

    // Check if token is expired
    if (new Date() > connection.expiresAt) {
      // Token expired, but we can still try to refresh it
      // The createJohnDeereClient will handle the refresh
      return true;
    }

    return true;
  } catch {
    return false;
  }
}
