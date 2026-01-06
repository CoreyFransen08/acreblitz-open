import { NextResponse } from "next/server";
import { TokenManager } from "@/mastra/utils/token-manager";
import { db } from "@/db/client";
import { cachedOrganizations } from "@/db/schema/john-deere-cache";
import { inArray } from "drizzle-orm";

export async function GET() {
  try {
    const connection = await TokenManager.getConnection();

    if (!connection) {
      return NextResponse.json({
        connected: false,
        organizations: [],
      });
    }

    // Get cached organization names
    let organizations: { id: string; name: string }[] = [];
    if (connection.organizationIds && connection.organizationIds.length > 0) {
      const cachedOrgs = await db
        .select({
          organizationId: cachedOrganizations.organizationId,
          name: cachedOrganizations.name,
        })
        .from(cachedOrganizations)
        .where(
          inArray(cachedOrganizations.organizationId, connection.organizationIds)
        );

      organizations = cachedOrgs.map((org) => ({
        id: org.organizationId,
        name: org.name,
      }));
    }

    return NextResponse.json({
      connected: true,
      organizations,
      expiresAt: connection.expiresAt,
      lastUsedAt: connection.lastUsedAt,
    });
  } catch (error) {
    console.error("Error checking status:", error);
    return NextResponse.json(
      { error: "Failed to check connection status" },
      { status: 500 }
    );
  }
}
