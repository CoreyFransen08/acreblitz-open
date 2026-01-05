import { NextResponse } from "next/server";
import { TokenManager } from "@/mastra/utils/token-manager";

export async function POST() {
  try {
    await TokenManager.deleteConnection();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
