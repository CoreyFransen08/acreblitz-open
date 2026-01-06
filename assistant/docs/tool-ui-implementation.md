# Tool UI Implementation Guide

This guide covers best practices for implementing custom tool UIs in FieldMate using Mastra agents and Assistant UI.

## Architecture Overview

When building tools that fetch and display data, there are two consumers of tool results:

1. **The Agent** - Needs a concise summary to form responses (context-aware)
2. **The UI Component** - Needs full data for rich visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                        Tool Execution                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. Validate inputs                                            │
│   2. Fetch data from API/database                               │
│   3. Transform for two outputs:                                 │
│                                                                 │
│      ┌──────────────────┐    ┌──────────────────────────────┐  │
│      │  Agent Summary   │    │      UI Data Payload         │  │
│      │  (abbreviated)   │    │      (full/structured)       │  │
│      └────────┬─────────┘    └──────────────┬───────────────┘  │
│               │                             │                   │
│               ▼                             ▼                   │
│      Agent uses this to         Tool UI component renders       │
│      form its response          rich visualization              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Tool Response Structure

Every tool that displays a UI should return a structured response with separate fields for the agent and UI:

```typescript
interface ToolResponse<TUIData, TSummary> {
  success: boolean;
  error?: string;

  // Data for the UI component to render
  uiData: TUIData;

  // Abbreviated summary for agent context
  agentSummary: TSummary;
}
```

### Example: Soil Data Tool Response

```typescript
interface SoilToolResponse {
  success: boolean;
  error?: string;

  // Full data for UI visualization
  uiData: {
    fieldId: string;
    fieldName: string;
    coordinates: { latitude: number; longitude: number };
    soilUnits: Array<{
      mukey: string;
      name: string;
      percentage: number;
      properties: {
        texture: string;
        drainage: string;
        pH: number;
        organicMatter: number;
        // ... many more properties
      };
      layers: Array<{
        depth: string;
        texture: string;
        // ... detailed layer data
      }>;
    }>;
  };

  // Abbreviated summary for agent (keeps context small)
  agentSummary: {
    fieldName: string;
    dominantSoilType: string;
    soilCount: number;
    avgPH: number;
    drainageClass: string;
    suitability: string;
  };
}
```

## Implementation Pattern

### Step 1: Create the Mastra Tool

```typescript
// mastra/tools/soil-tools.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const getSoilDataTool = createTool({
  id: "getSoilData",
  description: "Get soil composition and properties for a field location.",
  inputSchema: z.object({
    fieldId: z.string().describe("Field ID to look up"),
    fieldName: z.string().optional().describe("Field name for display"),
  }),
  execute: async ({ context }) => {
    const { fieldId, fieldName } = context;

    try {
      // 1. Fetch full soil data from API
      const soilData = await fetchSoilData(fieldId);

      // 2. Transform into UI-friendly structure
      const uiData = transformForUI(soilData);

      // 3. Create abbreviated summary for agent
      const agentSummary = createAgentSummary(soilData);

      return {
        success: true,
        uiData,
        agentSummary,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch soil data: ${error.message}`,
      };
    }
  },
});

// Helper: Create concise summary for agent context
function createAgentSummary(soilData: RawSoilData) {
  const dominant = soilData.units.reduce((a, b) =>
    a.percentage > b.percentage ? a : b
  );

  return {
    fieldName: soilData.fieldName,
    dominantSoilType: dominant.name,
    dominantPercentage: dominant.percentage,
    soilCount: soilData.units.length,
    avgPH: calculateAvgPH(soilData.units),
    drainageClass: dominant.properties.drainage,
    // Keep it brief - only what agent needs to respond intelligently
  };
}

// Helper: Transform full data for UI rendering
function transformForUI(soilData: RawSoilData) {
  return {
    fieldId: soilData.fieldId,
    fieldName: soilData.fieldName,
    coordinates: soilData.coordinates,
    soilUnits: soilData.units.map(unit => ({
      mukey: unit.mukey,
      name: unit.name,
      percentage: unit.percentage,
      properties: unit.properties,
      layers: unit.layers,
      // Full data for charts, maps, detailed views
    })),
  };
}
```

### Step 2: Create the Tool UI Component

```typescript
// components/assistant-ui/tools/soil-tool-ui.tsx
"use client";

import { memo, useMemo } from "react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import dynamic from "next/dynamic";

// Dynamic import for components with browser dependencies
const SoilVisualization = dynamic(
  () => import("@/components/soil-visualization"),
  { ssr: false, loading: () => <SoilSkeleton /> }
);

interface SoilToolResult {
  success: boolean;
  error?: string;
  uiData?: {
    fieldId: string;
    fieldName: string;
    soilUnits: Array<{
      name: string;
      percentage: number;
      properties: Record<string, unknown>;
    }>;
  };
  agentSummary?: {
    dominantSoilType: string;
    soilCount: number;
  };
}

// Memoized display component prevents re-renders during streaming
const MemoizedSoilDisplay = memo(function MemoizedSoilDisplay({
  data,
}: {
  data: SoilToolResult["uiData"];
}) {
  return (
    <div className="my-4 w-full max-w-2xl">
      <SoilVisualization data={data} />
    </div>
  );
});

export const SoilToolUI: ToolCallMessagePartComponent = ({
  toolName,
  result,
  status,
}) => {
  // Only handle this specific tool
  if (toolName !== "getSoilData") return null;

  const soilResult = result as SoilToolResult | undefined;

  // Memoize to prevent unnecessary re-renders
  const stableData = useMemo(() => {
    if (!soilResult?.success || !soilResult.uiData) return null;
    return soilResult.uiData;
  }, [soilResult?.success, soilResult?.uiData]);

  // Loading state
  if (status?.type === "requires-action" || status?.type === "running") {
    return <SoilSkeleton />;
  }

  // Error states
  if (status?.type === "incomplete") {
    return (
      <div className="my-4 rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load soil data</p>
      </div>
    );
  }

  if (!soilResult?.success) {
    return (
      <div className="my-4 rounded-lg border border-amber-500 bg-amber-50 p-4">
        <p className="text-sm text-amber-700">
          {soilResult?.error || "Unable to get soil data"}
        </p>
      </div>
    );
  }

  if (!stableData) return null;

  // Render the visualization with memoized data
  return (
    <MemoizedSoilDisplay
      key={`soil-${stableData.fieldId}`}
      data={stableData}
    />
  );
};

function SoilSkeleton() {
  return (
    <div className="my-4 h-64 w-full max-w-2xl animate-pulse rounded-lg bg-muted" />
  );
}
```

### Step 3: Register the Tool UI

```typescript
// components/assistant-ui/thread.tsx
import { SoilToolUI } from "@/components/assistant-ui/tools/soil-tool-ui";

// In MessagePrimitive.Parts configuration:
<MessagePrimitive.Parts
  components={{
    Text: MarkdownText,
    tools: {
      Fallback: ToolFallback,
      by_name: {
        getSoilData: SoilToolUI,
        // ... other tool UIs
      },
    },
  }}
/>
```

### Step 4: Update Agent Instructions

```typescript
// mastra/agents/field-mate-agent.ts
instructions: `
...
When using getSoilData:
- The tool returns both detailed UI data and a summary
- Use the agentSummary fields to inform your response
- Reference the visualization: "I've displayed the soil composition above"
- Highlight key findings from the summary (dominant soil type, drainage, pH)
- Do NOT repeat all the detailed data - the UI shows that

Example response after getSoilData:
"I've displayed the soil analysis for [field name] above. The field is
predominantly [dominantSoilType] ([percentage]%), with [soilCount] distinct
soil types. The average pH is [avgPH] with [drainageClass] drainage, making
it [suitability] for most crops."
...
`
```

## Best Practices

### 1. Separate Agent and UI Data

Always return two distinct data structures:

```typescript
return {
  success: true,
  // UI gets everything needed to render
  uiData: { /* full structured data */ },
  // Agent gets just what it needs to respond
  agentSummary: { /* 5-10 key fields max */ },
};
```

### 2. Keep Agent Summary Small

The agent summary should contain only what's needed for an intelligent response:

| Good | Bad |
|------|-----|
| `dominantSoilType: "Silt Loam"` | Full array of all soil types |
| `avgPH: 6.5` | pH values for every layer |
| `soilCount: 4` | Complete soil unit objects |
| `suitability: "good for corn"` | Raw API response data |

### 3. Memoize UI Components

Prevent re-renders during streaming updates:

```typescript
// Memoize the display component
const MemoizedDisplay = memo(function MemoizedDisplay({ data }) {
  return <Visualization data={data} />;
});

// Memoize the data reference
const stableData = useMemo(() => {
  if (!result?.success) return null;
  return result.uiData;
}, [result?.success, result?.uiData]);
```

### 4. Use Dynamic Imports for Heavy Components

Components with browser dependencies (maps, charts) should use dynamic imports:

```typescript
const HeavyComponent = dynamic(
  () => import("./heavy-component"),
  {
    ssr: false,  // Disable server-side rendering
    loading: () => <Skeleton />,  // Show placeholder
  }
);
```

### 5. Handle All Status States

Tool UI components receive a `status` prop with these possible states:

```typescript
type ToolStatus =
  | { type: "running" }           // Tool is executing
  | { type: "requires-action" }   // Waiting for user input
  | { type: "complete" }          // Finished successfully
  | { type: "incomplete" }        // Failed or cancelled
```

Always handle loading and error states:

```typescript
if (status?.type === "running") return <Skeleton />;
if (status?.type === "incomplete") return <ErrorDisplay />;
if (!result?.success) return <ErrorMessage error={result?.error} />;
```

### 6. Use Consistent Tool Naming

Ensure the tool ID matches the export key and UI registration:

```typescript
// Tool definition
export const myTool = createTool({
  id: "getMyData",  // This ID
  // ...
});

// Tool export
export const myTools = {
  getMyData: myTool,  // Must match ID
};

// UI registration
by_name: {
  getMyData: MyToolUI,  // Must match ID
}

// UI component check
if (toolName !== "getMyData") return null;  // Must match ID
```

### 7. Provide Unique Keys

Use stable, unique keys for memoized components:

```typescript
<MemoizedDisplay
  key={`${toolName}-${data.id}`}  // Unique per tool call
  data={data}
/>
```

## Common Patterns

### Pattern: Coordinate-Based Data

For tools that fetch data based on location:

```typescript
execute: async ({ context }) => {
  const { fieldId } = context;

  // 1. Look up coordinates from cache
  const boundary = await getBoundaryFromCache(fieldId);
  const center = calculateCenterPoint(boundary.geometry);

  // 2. Fetch location-based data
  const data = await fetchDataForLocation(center.lat, center.lng);

  // 3. Return structured response
  return {
    success: true,
    uiData: {
      coordinates: center,
      fieldId,
      ...data,
    },
    agentSummary: summarize(data),
  };
}
```

### Pattern: Cached Boundary Lookup

Reuse cached field boundaries instead of re-fetching:

```typescript
import { db } from "@/db/client";
import { cachedBoundaries } from "@/db/schema";

async function getFieldCenter(fieldId: string) {
  const boundaries = await db
    .select()
    .from(cachedBoundaries)
    .where(eq(cachedBoundaries.fieldId, fieldId))
    .limit(1);

  if (boundaries.length === 0) {
    throw new Error(`No cached boundary for field ${fieldId}`);
  }

  return calculateCenterPoint(boundaries[0].geometry);
}
```

### Pattern: Graceful Degradation

When optional data fails, still return what you can:

```typescript
execute: async ({ context }) => {
  const primary = await fetchPrimaryData(context.id);

  let secondary = null;
  try {
    secondary = await fetchSecondaryData(context.id);
  } catch {
    // Secondary data is optional - continue without it
  }

  return {
    success: true,
    uiData: {
      primary,
      secondary,  // May be null
    },
    agentSummary: {
      ...summarizePrimary(primary),
      hasSecondaryData: secondary !== null,
    },
  };
}
```

## Troubleshooting

### Multiple UI Components Appearing

**Cause:** Tool name mismatch between definition and registration.

**Fix:** Ensure consistent naming:
```typescript
// All must match exactly
id: "getMyData"
export: { getMyData: tool }
by_name: { getMyData: UI }
if (toolName !== "getMyData")
```

### UI Not Appearing

**Cause:** Component returning `null` unexpectedly.

**Fix:** Add logging to debug:
```typescript
console.log("Tool UI received:", { toolName, status, result });
if (toolName !== "getMyData") {
  console.log("Skipping - wrong tool name");
  return null;
}
```

### Excessive Re-renders

**Cause:** Missing memoization or unstable references.

**Fix:** Wrap components and data:
```typescript
const MemoizedComponent = memo(MyComponent);
const stableData = useMemo(() => result?.data, [result?.data]);
```

### SSR Errors

**Cause:** Browser-only APIs used during server rendering.

**Fix:** Use dynamic imports with `ssr: false`:
```typescript
const MapComponent = dynamic(() => import("./map"), { ssr: false });
```
