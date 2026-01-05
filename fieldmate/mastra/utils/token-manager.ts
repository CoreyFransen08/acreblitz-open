import { db } from "@/db/client";
import { johnDeereConnections } from "@/db/schema/oauth-tokens";
import { eq } from "drizzle-orm";

const DEFAULT_USER_ID = "default";

export class TokenManager {
  /**
   * Get the current connection for the single user
   */
  static async getConnection() {
    const connections = await db
      .select()
      .from(johnDeereConnections)
      .where(eq(johnDeereConnections.userId, DEFAULT_USER_ID))
      .limit(1);

    return connections[0] || null;
  }

  /**
   * Check if a connection exists
   */
  static async isConnected(): Promise<boolean> {
    const connection = await this.getConnection();
    return connection !== null;
  }

  /**
   * Save or update connection tokens
   */
  static async saveConnection(data: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresAt: Date;
    scopes: string[];
    organizationIds?: string[];
  }) {
    const existing = await this.getConnection();

    if (existing) {
      await db
        .update(johnDeereConnections)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(johnDeereConnections.id, existing.id));
    } else {
      await db.insert(johnDeereConnections).values({
        userId: DEFAULT_USER_ID,
        ...data,
      });
    }
  }

  /**
   * Update tokens after refresh
   */
  static async updateTokens(data: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }) {
    const existing = await this.getConnection();
    if (!existing) {
      throw new Error("No connection found to update");
    }

    await db
      .update(johnDeereConnections)
      .set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      })
      .where(eq(johnDeereConnections.id, existing.id));
  }

  /**
   * Update organization IDs
   */
  static async updateOrganizationIds(organizationIds: string[]) {
    const existing = await this.getConnection();
    if (!existing) {
      throw new Error("No connection found to update");
    }

    await db
      .update(johnDeereConnections)
      .set({
        organizationIds,
        updatedAt: new Date(),
      })
      .where(eq(johnDeereConnections.id, existing.id));
  }

  /**
   * Update last used timestamp
   */
  static async touchConnection() {
    const existing = await this.getConnection();
    if (existing) {
      await db
        .update(johnDeereConnections)
        .set({ lastUsedAt: new Date() })
        .where(eq(johnDeereConnections.id, existing.id));
    }
  }

  /**
   * Delete connection
   */
  static async deleteConnection() {
    await db
      .delete(johnDeereConnections)
      .where(eq(johnDeereConnections.userId, DEFAULT_USER_ID));
  }
}
