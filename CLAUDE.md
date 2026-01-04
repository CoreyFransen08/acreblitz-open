# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies (root)
npm install

# Build all packages
npm run build

# Development mode (all workspaces)
npm run dev

# Run specific demo apps
npm run dev:demo    # demo_app on port 3000
npm run dev:map     # map-demo on port 3001

# Lint all workspaces
npm run lint
```

### Package-specific Commands (in packages/react-components or packages/platform-integrations)

```bash
npm run build         # Build with tsup (ESM + CJS output)
npm run dev           # Watch mode
npm run typecheck     # Type check only (tsc --noEmit)
npm run test          # Run vitest once
npm run test:watch    # Run vitest in watch mode
npm run test:coverage # Generate coverage report
```

### Gateway Commands

```bash
cd gateway
docker-compose up -d      # Start all services
docker-compose logs -f    # View logs

# Individual services (for development)
cd node-service && npm run dev
cd python-service && uvicorn main:app --reload --port 8000
```

## Architecture

This is an npm workspaces monorepo with two publishable libraries, demo applications, and a Dockerized API gateway.

### Packages

- **@acreblitz/react-components** - React component library with Map (Leaflet-based with drawing, measurement, data overlays) and Weather (NWS API) components. Uses tsup for dual ESM/CJS output.

- **@acreblitz/platform-integrations** - John Deere Operations Center API integration with OAuth helpers and type-safe client. Zero external dependencies (uses native fetch).

### Demo Apps

- **demo_app** - Full component demo (Vite + React Router + Tailwind)
- **map-demo** - Map component showcase

### Gateway

Docker Compose stack with Nginx reverse proxy (port 8080), Node.js/Express service (port 3001), and Python/FastAPI service (port 8000). All services provide weather endpoints using the National Weather Service API.

## Testing

Tests use Vitest with jsdom environment and MSW for HTTP mocking. Test files live in `src/__tests__/` within each package.

```bash
# Run a specific test file
cd packages/react-components
npx vitest run src/__tests__/Map.test.tsx
```

## Key Technical Details

- **Node.js 18+** required (uses native fetch)
- **TypeScript strict mode** enabled via tsconfig.base.json
- Libraries export both ESM (.js) and CommonJS (.cjs) with separate CSS output
- Weather components use the free National Weather Service API (US-only, no API key required)
- Map component uses Leaflet with react-leaflet, supports SSURGO soil data and USGS 3DHP hydro overlays
- platform-integrations uses Drizzle ORM as optional peer dependency for database schema

## Import Patterns

```tsx
// React components
import { Map, Weather, useMapInstance, useWeather } from '@acreblitz/react-components';
import '@acreblitz/react-components/styles.css';

// Platform integrations
import { createJohnDeereClient, JohnDeereOAuth } from '@acreblitz/platform-integrations';
```
