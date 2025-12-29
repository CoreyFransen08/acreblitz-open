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

[View Documentation](./packages/react-components/README.md)

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
