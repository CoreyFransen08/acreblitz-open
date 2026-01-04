import { NextRequest, NextResponse } from "next/server";
import {
  createJohnDeereClient,
  listFields,
  JD_API_BASE_URLS,
  type UnifiedField,
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

  try {
    const baseUrl = useSandbox ? JD_API_BASE_URLS.SANDBOX : JD_API_BASE_URLS.PRODUCTION;
    console.log("[Fields API] Creating JD client...");
    console.log("[Fields API] Using API:", baseUrl);

    // Create JD client
    const client = await createJohnDeereClient({
      clientId,
      clientSecret,
      refreshToken,
      baseUrl,
    });

    console.log("[Fields API] Client created, fetching organizations...");
    
    // Get organizations first
    const orgs = await client.organizations.list();
    
    console.log("[Fields API] Organizations found:", orgs.length);
    if (orgs.length > 0) {
      console.log("[Fields API] Org IDs:", orgs.map(o => o.id).join(", "));
    }
    
    if (orgs.length === 0) {
      console.log("[Fields API] No orgs - user may need to re-authenticate after org connection");
      return NextResponse.json(
        { 
          error: "No organizations found. After connecting organizations, you may need to disconnect and reconnect to refresh your access. Go back to the home page, click 'Disconnect', then 'Connect to John Deere' again.",
          needsReauth: true,
        },
        { status: 403 }
      );
    }

    // Fetch fields from all organizations with boundaries
    const allFields: UnifiedField[] = [];
    
    for (const org of orgs) {
      try {
        const result = await listFields({
          context: { provider: "john_deere", client },
          organizationId: org.id,
          status: "active",
          geometry: {
            includeGeometry: true,
            geometryFormat: "geojson",
          },
          units: { areaUnit: "ac" },
          pagination: { pageSize: 100 },
        });
        
        // Add org info to each field
        const fieldsWithOrg = result.data.map(field => ({
          ...field,
          organizationName: org.name,
        }));
        
        allFields.push(...fieldsWithOrg);
      } catch (orgError) {
        console.error(`[Fields API] Error fetching fields for org ${org.id}:`, orgError);
        // Continue with other orgs
      }
    }

    return NextResponse.json({
      fields: allFields,
      totalCount: allFields.length,
      organizations: orgs.map(o => ({ id: o.id, name: o.name })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch fields";
    console.error("[Fields API] Error:", message);
    console.error("[Fields API] Full error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

