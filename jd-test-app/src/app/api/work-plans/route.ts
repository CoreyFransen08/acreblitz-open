import { NextRequest, NextResponse } from "next/server";
import {
  createJohnDeereClient,
  listWorkPlans,
  JD_API_BASE_URLS,
  type UnifiedWorkPlan,
} from "@acreblitz/platform-integrations";

export async function GET(request: NextRequest) {
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

  // Get optional query params
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year")
    ? parseInt(searchParams.get("year")!, 10)
    : undefined;
  const workStatus = searchParams.get("workStatus") as
    | "planned"
    | "in_progress"
    | "completed"
    | "all"
    | undefined;

  try {
    const baseUrl = useSandbox
      ? JD_API_BASE_URLS.SANDBOX
      : JD_API_BASE_URLS.PRODUCTION;
    console.log("[Work Plans API] Creating JD client...");
    console.log("[Work Plans API] Using API:", baseUrl);

    // Create JD client
    const client = await createJohnDeereClient({
      clientId,
      clientSecret,
      refreshToken,
      baseUrl,
    });

    console.log("[Work Plans API] Client created, fetching organizations...");

    // Get organizations first
    const orgs = await client.organizations.list();

    console.log("[Work Plans API] Organizations found:", orgs.length);
    if (orgs.length > 0) {
      console.log(
        "[Work Plans API] Org IDs:",
        orgs.map((o) => o.id).join(", ")
      );
    }

    if (orgs.length === 0) {
      console.log(
        "[Work Plans API] No orgs - user may need to re-authenticate after org connection"
      );
      return NextResponse.json(
        {
          error:
            "No organizations found. After connecting organizations, you may need to disconnect and reconnect to refresh your access.",
          needsReauth: true,
        },
        { status: 403 }
      );
    }

    // Fetch work plans from all organizations
    const allWorkPlans: (UnifiedWorkPlan & { organizationName?: string })[] =
      [];

    for (const org of orgs) {
      try {
        console.log(
          `[Work Plans API] Fetching work plans for org ${org.id}...`
        );
        const result = await listWorkPlans({
          context: { provider: "john_deere", client },
          organizationId: org.id,
          year,
          workStatus: workStatus || "all",
          pagination: { pageSize: 100 },
        });

        console.log(
          `[Work Plans API] Found ${result.data.length} work plans for org ${org.name}`
        );

        // Add org info to each work plan
        const workPlansWithOrg = result.data.map((wp) => ({
          ...wp,
          organizationName: org.name,
        }));

        allWorkPlans.push(...workPlansWithOrg);
      } catch (orgError) {
        console.error(
          `[Work Plans API] Error fetching work plans for org ${org.id}:`,
          orgError
        );
        // Continue with other orgs
      }
    }

    console.log(`[Work Plans API] Total work plans: ${allWorkPlans.length}`);

    return NextResponse.json({
      workPlans: allWorkPlans,
      totalCount: allWorkPlans.length,
      organizations: orgs.map((o) => ({ id: o.id, name: o.name })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch work plans";
    console.error("[Work Plans API] Error:", message);
    console.error("[Work Plans API] Full error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
