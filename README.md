# AcreBlitz Open Source

This repository contains open source components and tools from AcreBlitz.

## Packages

### @acreblitz/react-components

A collection of reusable React components for agricultural applications.

```bash
npm install @acreblitz/react-components
```

**Available Components:**
- `Weather` - Display current conditions and hourly forecast using the National Weather Service API
- `Map` - Interactive Leaflet-based map with satellite imagery, drawing tools, measurement, and data overlays

[View Documentation](./packages/react-components/README.md)

## Demo App

Try out the components in an interactive demo:

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/fork/github/CoreyFransen08/acreblitz-open/tree/main/demo_app)

The demo app showcases all available components including:
- Interactive map with drawing and measurement tools
- Weather component with live data
- Data overlays (SSURGO soil data, 3DHP hydro features, weather radar)

## API Gateway

A Dockerized API gateway that provides weather data through Node.js (Express) and Python (FastAPI) services.

```bash
cd gateway
docker-compose up
```

**Endpoints:**
- `GET /api/node/weather/forecast?lat=X&lon=Y` - Weather via Node.js
- `GET /api/python/weather/forecast?lat=X&lon=Y` - Weather via Python

[View Documentation](./gateway/README.md)

## Development

This project uses npm workspaces.

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run development mode
npm run dev
```

## License

MIT License - see [LICENSE](./LICENSE) for details.
