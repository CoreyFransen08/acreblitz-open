# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server with Turbopack (port 3000)
npm run build            # Production build
npm run typecheck        # TypeScript type checking (tsc --noEmit)
npm run lint             # ESLint
npm run prettier         # Check formatting
npm run prettier:fix     # Fix formatting

# Database
npm run docker:dev       # Start PostgreSQL container (port 5432)
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run migrations
npm run db:studio        # Open Drizzle Studio

# Docker
npm run docker:build     # Build production image
npm run docker:up        # Start full stack (app + postgres)
npm run docker:down      # Stop stack
```

## Architecture

Next.js 16 app with Mastra AI agent for John Deere Operations Center integration.

### Core Flow

```
User ─► Assistant UI ─► /api/chat ─► Mastra Agent ─► Tools ─► John Deere API
                                         │                        │
                                         └──► Tool Results ◄──────┘
                                                   │
                                         ┌────────┴────────┐
                                         │                 │
                                    agentSummary       uiData
                                    (for LLM)     (for UI components)
```

### Key Directories

- `app/api/chat/route.ts` - Chat endpoint with rate limit retry, message sanitization, and uiDataRef resolution
- `mastra/agents/` - Agent configuration with memory processors (TokenLimiter, ToolCallFilter)
- `mastra/tools/` - Mastra tools for John Deere, weather, soil, precipitation data
- `mastra/utils/ui-data-cache.ts` - In-memory cache for large UI payloads (bypasses LLM context)
- `components/assistant-ui/tools/` - React components for rendering tool results
- `db/schema/` - Drizzle schema for OAuth tokens and cached boundaries

### Token Optimization Pattern

Large tool payloads (GeoJSON, hourly data) bypass LLM context to avoid rate limits:

1. Tool stores large `uiData` in cache, returns `uiDataRef` UUID
2. LLM receives only `agentSummary` (text string, ~100 tokens)
3. Stream processor resolves `uiDataRef` → full `uiData` for client

```typescript
// Tool returns minimal data for LLM
const uiDataRef = storeUIData({ /* large payload */ });
return { success: true, agentSummary: "Brief text summary", uiDataRef };
```

See `docs/token-optimization.md` for details.

### Tool UI Pattern

Tools return two data structures:

```typescript
{
  success: true,
  agentSummary: "Text for LLM response generation",  // Keep small
  uiData: { /* full data for charts/maps */ }        // Cached via uiDataRef
}
```

Register tool UIs in `components/assistant-ui/thread.tsx` via `by_name`:

```typescript
by_name: { getSoilData: SoilToolUI, getWeather: WeatherToolUI, ... }
```

See `docs/tool-ui-implementation.md` for component patterns.

### Database Schema

- Uses UUIDv7 for primary keys (time-sortable)
- OAuth tokens stored in `john_deere_connections`
- Field boundaries cached in `cached_boundaries`
- Drizzle ORM with postgres-js driver

### External APIs

- **John Deere Operations Center** - OAuth 2.0, requires developer.deere.com credentials
- **National Weather Service** - Free, US-only, no key required
- **Precip AI** - Precipitation forecast API (optional)
- **USDA SSURGO** - Soil data via WFS (lib/ssurgo-wfs.ts)

## Data Fetching

Use TanStack React Query for all client-side data fetching:

- Wrap `useQuery` in custom hooks (`hooks/useFields.ts`), never use directly in components
- Include all variables in query keys: `['fields', companyId, filters]`
- Use `enabled` option to control when queries run (dependent queries, conditional fetching)
- Use `select` option for data transformations, not in `queryFn`
- After mutations, use `queryClient.invalidateQueries()` - never manually update cache
- Configure appropriate `staleTime` based on data volatility:
  - Static reference data: 30 minutes
  - User-specific data: 5 minutes
  - Processing/status data: 5-second polling

## Geospatial Conventions

**Coordinate Order:**
- GeoJSON uses `[longitude, latitude]` (X, Y)
- Leaflet uses `[latitude, longitude]` (Y, X)
- Always convert explicitly using utility functions in `lib/geo-utils.ts`
- Store all coordinates in WGS84 (EPSG:4326)

**Geometry Operations:**
- Use Turf.js for client-side operations
- Import specific modules: `import area from '@turf/area'` (not entire library)
- Common: `@turf/area`, `@turf/helpers`, `@turf/bbox`, `@turf/intersect`

**PostGIS:**
- Use `ST_SetSRID(ST_GeomFromGeoJSON(geojson), 4326)` for imports
- Use `ST_AsGeoJSON(geom)::jsonb` for exports
- Create GIST indexes on geometry columns

## UI Conventions

**Components:**
- Use shadcn/ui components (New York variant)
- Install new components: `npx shadcn-ui@latest add [component]`
- Use `cn()` from `lib/utils.ts` for conditional class merging
- Use Lucide React for icons

**Tailwind:**
- Mobile-first: base styles for mobile, `md:` `lg:` for larger screens
- Prefer semantic colors: `bg-primary`, `text-muted-foreground`
- Class order: layout → spacing → sizing → typography → colors → effects

**Tool UI Components:**
- Memoize with `React.memo()` to prevent re-renders during streaming
- Use `useMemo` for data references
- Use `next/dynamic` with `ssr: false` for map/chart components
- Handle all status states: `running`, `complete`, `incomplete`

## Environment Variables

Required in `.env`:

```bash
OPENAI_API_KEY          # GPT-4o-mini for agent
DATABASE_URL            # PostgreSQL connection string
JOHN_DEERE_CLIENT_ID    # From developer.deere.com
JOHN_DEERE_CLIENT_SECRET
JOHN_DEERE_APPLICATION_ID
JOHN_DEERE_REDIRECT_URI # http://localhost:3000/api/auth/callback
JOHN_DEERE_USE_SANDBOX  # true for sandbox
NEXT_PUBLIC_APP_URL     # http://localhost:3000
```

## Post-Implementation

After changes, always run:

```bash
npm run build           # Catch type errors and build issues
npm run typecheck       # If build doesn't include tsc
```
