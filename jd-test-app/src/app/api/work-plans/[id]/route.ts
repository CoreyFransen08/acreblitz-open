import { NextRequest, NextResponse } from "next/server";
import {
  createJohnDeereClient,
  getWorkPlan,
  JD_API_BASE_URLS,
} from "@acreblitz/platform-integrations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const refreshToken = request.cookies.get("jd_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: "Not authenticated. Please connect to John Deere first." },
      { status: 401 }
    );
  }

  const clientId = process.env.JD_CLIENT_ID;
  const clientSecret = process.env.JD_CLIENT_SECRET;
  const useSandbox = process.env.JD_USE_SANDBOX === "true";

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing OAuth configuration" },
      { status: 500 }
    );
  }

  // Get work plan ID and organization ID from params/query
  const { id: workPlanId } = await params;
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const baseUrl = useSandbox
      ? JD_API_BASE_URLS.SANDBOX
      : JD_API_BASE_URLS.PRODUCTION;
    console.log(
      `[Work Plan API] Fetching work plan ${workPlanId} for org ${organizationId}...`
    );

    // Create JD client
    const client = await createJohnDeereClient({
      clientId,
      clientSecret,
      refreshToken,
      baseUrl,
    });

    // Fetch the specific work plan
    const workPlan = await getWorkPlan({
      context: { provider: "john_deere", client },
      organizationId,
      workPlanId,
    });

    console.log(`[Work Plan API] Found work plan: ${workPlan.id}`);

    return NextResponse.json({ workPlan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch work plan";
    console.error("[Work Plan API] Error:", message);
    console.error("[Work Plan API] Full error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
