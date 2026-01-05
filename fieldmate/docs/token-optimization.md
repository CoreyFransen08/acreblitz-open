# Token Optimization for LLM Context

This document describes the implementations used to reduce token consumption and avoid rate limits in the FieldMate agent.

## Problem Statement

OpenAI's GPT-4o model has a 30,000 tokens per minute (TPM) rate limit. With tool calls returning large payloads (GeoJSON, hourly data arrays), a single tool call could consume 6,000-75,000 tokens, causing:

1. Immediate rate limit errors on follow-up requests
2. Expensive API costs (~$0.01-0.05 per request)
3. Poor user experience with frequent "rate limit" errors

## Solutions Implemented

### 1. Model Selection

**File:** `mastra/agents/field-mate-agent.ts`

Switched from `gpt-4o` to `gpt-4o-mini`:
- GPT-4o: 30K TPM rate limit
- GPT-4o-mini: 200K+ TPM rate limit (~7x higher)
- Cost reduction: ~10x cheaper
- Quality: Sufficient for tool-calling agents

```typescript
model: openai.chat("gpt-4o-mini"),
```

### 2. UI Data Cache Pattern

The core optimization that prevents large payloads from going to the LLM while still delivering them to the UI.

#### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                      TOOL EXECUTION                              │
├─────────────────────────────────────────────────────────────────┤
│  1. Tool generates uiData (6,000-75,000 tokens)                 │
│  2. Tool stores uiData in cache → receives UUID                 │
│  3. Tool returns { success, agentSummary, uiDataRef: "uuid" }   │
│     └─ Only ~100 tokens sent to LLM!                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LLM PROCESSING                              │
├─────────────────────────────────────────────────────────────────┤
│  4. Mastra sends minimal tool result to LLM                     │
│  5. LLM generates response based on agentSummary text           │
│     └─ No large GeoJSON or arrays in context!                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STREAM PROCESSING                           │
├─────────────────────────────────────────────────────────────────┤
│  6. Stream processor intercepts tool results                    │
│  7. Resolves uiDataRef → actual uiData from cache               │
│  8. Client receives full uiData for chart/map rendering         │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation Files

**Cache Utility:** `mastra/utils/ui-data-cache.ts`

```typescript
// Store large uiData, get back a small UUID reference
const uiDataRef = storeUIData(largePayload);

// Later, retrieve the data (used by stream processor)
const uiData = getUIData(uiDataRef);

// Clean up after use
removeUIData(uiDataRef);
```

Features:
- In-memory Map storage
- 5-minute TTL (auto-cleanup)
- UUID-based references

**Stream Processor:** `app/api/chat/route.ts`

```typescript
function resolveUIDataRefs(value: unknown): unknown {
  // Recursively find uiDataRef in stream values
  // Replace with actual uiData from cache
  // Return modified value to client
}
```

**Tool Pattern:**

```typescript
// Before (sends 6,000+ tokens to LLM)
return {
  success: true,
  agentSummary,
  uiData: { /* large payload */ }
};

// After (sends ~100 tokens to LLM)
const uiDataRef = storeUIData({ /* large payload */ });
return {
  success: true,
  agentSummary,
  uiDataRef,
};
```

### 3. Text-Based Agent Summaries

Changed `agentSummary` from structured objects to minimal text strings.

**Before:**
```typescript
agentSummary: {
  fieldName: "North Field",
  currentTemperatureCelsius: 11.3,
  currentTemperatureFahrenheit: 52.3,
  temperatureDescription: "Cool-season crops",
  // ... more fields
}
```

**After:**
```typescript
agentSummary: "North Field. Current: 52.3°F (11.3°C). Cool-season crops. Range: 45-58°F. Trend: warming. 168 hours of data."
```

Token savings: ~50-200 tokens per tool call

### 4. Memory Processors

**File:** `mastra/agents/field-mate-agent.ts`

```typescript
const fieldMateMemory = new Memory({
  processors: [
    // Strip verbose tool calls from conversation history
    new ToolCallFilter({
      exclude: [
        "getSoilData",           // Large GeoJSON
        "showFieldsOnMap",       // Full FeatureCollections
        "getHourlyPrecipitation", // Up to 336 hourly records
        "getSoilTemperature",    // Hourly trend data
        "getSoilMoisture",       // Daily trend data
        "getRainForecast",       // Forecast arrays
        "get_field_boundaries",  // Full geometry data
      ],
    }),
    // Limit conversation history to 8K tokens
    new TokenLimiter(8000),
  ],
});
```

### 5. Historical Message Stripping

**File:** `app/api/chat/route.ts`

Removes `uiData` from historical tool results before sending to LLM:

```typescript
function stripUIDataFromMessages(messages: CoreMessage[]): CoreMessage[] {
  // Deep clone messages
  // Find tool results with uiData
  // Delete uiData from historical messages
  // Return cleaned messages for LLM
}
```

This helps on subsequent turns when the client sends back conversation history.

## Token Savings Summary

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| getSoilTemperature | ~6,600 tokens | ~100 tokens | 98.5% |
| getSoilMoisture | ~3,000 tokens | ~100 tokens | 96.7% |
| getHourlyPrecipitation | ~5,000 tokens | ~100 tokens | 98% |
| getSoilData | ~25,000-75,000 tokens | ~100 tokens | 99.6%+ |
| showFieldsOnMap | ~12,000-50,000 tokens | ~100 tokens | 99%+ |

## Estimated Per-Request Token Usage

| Component | Tokens |
|-----------|--------|
| System prompt | ~1,900 |
| Tool definitions | ~1,000 |
| Conversation history (max) | 8,000 |
| Current tool result | ~100-200 |
| **Total per request** | ~11,000-11,200 |

With gpt-4o-mini's 200K+ TPM limit, this allows ~18 requests per minute without rate limiting.

## Files Modified

### Core Implementation
- `mastra/utils/ui-data-cache.ts` - New cache utility
- `app/api/chat/route.ts` - Stream processor, message stripping

### Tools Updated
- `mastra/tools/soil-temperature-tools.ts`
- `mastra/tools/soil-moisture-tools.ts`
- `mastra/tools/precipitation-tools.ts`
- `mastra/tools/soil-tools.ts`
- `mastra/tools/map-tools.ts`

### UI Components Updated
- `components/assistant-ui/tools/soil-temperature-tool-ui.tsx`
- `components/assistant-ui/tools/soil-moisture-tool-ui.tsx`
- `components/assistant-ui/tools/precipitation-tool-ui.tsx`
- `components/assistant-ui/tools/soil-tool-ui.tsx`

### Agent Configuration
- `mastra/agents/field-mate-agent.ts` - Model, memory processors

## Debugging

### Token Logger

**File:** `mastra/utils/token-logger.ts`

Logs token counts for tool inputs/outputs:

```typescript
logToolTokens("getSoilTemperature", context, { success: true, agentSummary });
// Output: [TokenLogger] getSoilTemperature - input: 67, output: 50, total: 117
```

Warnings are logged for outputs over 5,000 tokens, critical warnings over 10,000.

### Cache Stats

```typescript
import { getCacheStats } from "@/mastra/utils/ui-data-cache";

const stats = getCacheStats();
// { size: 3, oldestAge: 45000 } // 3 entries, oldest is 45 seconds
```

## Future Considerations

1. **Redis Cache**: For multi-instance deployments, replace in-memory cache with Redis
2. **Streaming uiData**: Consider streaming large uiData separately from LLM response
3. **Compression**: Compress GeoJSON payloads before caching
4. **Model Routing**: Use gpt-4o for complex reasoning, gpt-4o-mini for tool calls
