# AcreBlitz API Gateway

A Dockerized API gateway that provides weather data through Node.js (Express) and Python (FastAPI) services.

## Quick Start

```bash
# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Check health
curl http://localhost:8080/health
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (Port 8080)                     │
│                     Reverse Proxy + CORS                     │
├─────────────────────────────────────────────────────────────┤
│                              │                               │
│         /api/node/*          │         /api/python/*         │
│              │               │               │               │
│              ▼               │               ▼               │
│   ┌──────────────────┐       │    ┌──────────────────┐       │
│   │   Node Service   │       │    │  Python Service  │       │
│   │    (Express)     │       │    │    (FastAPI)     │       │
│   │    Port 3001     │       │    │    Port 8000     │       │
│   └──────────────────┘       │    └──────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Endpoints

### Gateway

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Gateway health check |
| `GET /` | Gateway info |

### Node.js Service (`/api/node/*`)

| Endpoint | Description |
|----------|-------------|
| `GET /api/node/health` | Service health check |
| `GET /api/node/weather/forecast?lat=X&lon=Y` | Get weather forecast |

### Python Service (`/api/python/*`)

| Endpoint | Description |
|----------|-------------|
| `GET /api/python/health` | Service health check |
| `GET /api/python/weather/forecast?lat=X&lon=Y` | Get weather forecast |

## Weather API

Get current conditions and 7-day hourly forecast for a location.

**Request:**
```bash
curl "http://localhost:8080/api/node/weather/forecast?lat=39.7456&lon=-97.0892"
# or
curl "http://localhost:8080/api/python/weather/forecast?lat=39.7456&lon=-97.0892"
```

**Response:**
```json
{
  "location": {
    "city": "Lebanon",
    "state": "KS",
    "gridId": "TOP",
    "gridX": 32,
    "gridY": 81
  },
  "currentConditions": {
    "timestamp": "2024-01-15T12:00:00Z",
    "temperature": 45,
    "temperatureUnit": "F",
    "description": "Partly Cloudy",
    "icon": "https://api.weather.gov/icons/...",
    "humidity": 65,
    "windSpeed": 5.2,
    "windDirection": 180,
    "pressure": 101325
  },
  "hourlyForecast": [
    {
      "time": "2024-01-15T13:00:00-06:00",
      "temperature": 46,
      "temperatureUnit": "F",
      "precipitationChance": 10,
      "relativeHumidity": 62,
      "windSpeed": "10 mph",
      "windDirection": "S",
      "icon": "https://api.weather.gov/icons/...",
      "shortForecast": "Partly Sunny",
      "isDaytime": true
    }
  ],
  "updated": "2024-01-15T12:05:00Z"
}
```

**Parameters:**
- `lat` (required): Latitude (-90 to 90)
- `lon` (required): Longitude (-180 to 180)

**Notes:**
- Uses the National Weather Service API (US locations only)
- Grid point data is cached for 24 hours
- Current conditions may be unavailable for some locations

## Development

### Running Individual Services

**Node Service:**
```bash
cd node-service
npm install
npm run dev
```

**Python Service:**
```bash
cd python-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Building Images

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build node-service
docker-compose build python-service
docker-compose build nginx
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f node-service
docker-compose logs -f python-service
docker-compose logs -f nginx
```

## Configuration

Environment variables (`.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_PORT` | `8080` | Port for the gateway |
| `NODE_ENV` | `production` | Node.js environment |
| `ENVIRONMENT` | `production` | Python environment |

## License

MIT
