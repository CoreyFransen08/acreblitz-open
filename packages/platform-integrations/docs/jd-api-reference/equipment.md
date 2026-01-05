# John Deere Equipment API

> Reference: [developer.deere.com/dev-docs/equipment](https://developer.deere.com/dev-docs/equipment)

## Overview

The Equipment API provides unified access to machines and implements within the John Deere Operations Center. This API consolidates the previous separate Machine and Implement APIs into a single interface for managing tractors, combines, planters, sprayers, and other agricultural equipment.

**Required Scopes:** `eq1` (view), `eq2` (create/update)

**Base URL:** `https://equipmentapi.deere.com/isg`

> ⚠️ **Important:** The Equipment API uses a **different base URL** than other John Deere APIs (`partnerapi.deere.com`). Make sure your client is configured to route equipment requests to `equipmentapi.deere.com`.

> ⚠️ **Deprecation Notice:** The legacy Machine and Implement APIs are deprecated as of January 2025. Use this unified Equipment API for all new integrations.

---

## Endpoints

### List Equipment

```
GET /equipment
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `organizationIds` | string | — | Filter by org ID(s), comma-separated |
| `equipmentIds` | string | — | Filter by equipment ID(s), comma-separated |
| `serialNumbers` | string | — | Filter by serial number(s), comma-separated |
| `category` | string | — | Filter: `machine` or `implement` |
| `archived` | boolean | `false` | Include archived equipment |
| `embed` | string | — | Include related data: `connectedDevices`, `pairedEquipment` |
| `itemLimit` | integer | 10 | Results per page |
| `pageOffset` | integer | 0 | Pagination offset |

**Response:** `200 OK`

```json
{
  "links": [
    { "rel": "self", "uri": "..." },
    { "rel": "nextPage", "uri": "..." }
  ],
  "total": 24,
  "values": [
    {
      "@type": "Equipment",
      "id": "eq-12345678-abcd",
      "name": "8R 410 Tractor",
      "category": "machine",
      "make": {
        "id": "make-jd",
        "name": "John Deere"
      },
      "type": {
        "id": "type-tractor",
        "name": "Tractor"
      },
      "model": {
        "id": "model-8r410",
        "name": "8R 410"
      },
      "serialNumber": "1RW8410RXPD012345",
      "modelYear": 2025,
      "archived": false,
      "telematicsState": "ACTIVATED",
      "links": [
        { "rel": "self", "uri": "..." },
        { "rel": "organizations", "uri": "..." },
        { "rel": "connectedDevices", "uri": "..." },
        { "rel": "pairedEquipment", "uri": "..." }
      ]
    }
  ]
}
```

---

### List Equipment for Organization

```
GET /organizations/{orgId}/equipment
```

Same parameters as base endpoint, scoped to a single organization.

---

### Get Equipment

```
GET /equipment/{id}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `embed` | string | Include: `connectedDevices`, `pairedEquipment`, `measurements` |

**Response:** `200 OK`

```json
{
  "@type": "Equipment",
  "id": "eq-12345678-abcd",
  "name": "8R 410 Tractor",
  "category": "machine",
  "make": {
    "id": "make-jd",
    "name": "John Deere"
  },
  "type": {
    "id": "type-tractor",
    "name": "Tractor"
  },
  "model": {
    "id": "model-8r410",
    "name": "8R 410"
  },
  "serialNumber": "1RW8410RXPD012345",
  "modelYear": 2025,
  "engineHours": {
    "@type": "MeasurementAsDouble",
    "valueAsDouble": 1247.5,
    "unit": "hr"
  },
  "archived": false,
  "telematicsState": "ACTIVATED",
  "connectedDevices": [
    {
      "@type": "ConnectedDevice",
      "id": "dev-abcd1234",
      "deviceType": "JDLink",
      "serialNumber": "JDLINK12345"
    }
  ],
  "pairedEquipment": [
    {
      "@type": "Equipment",
      "id": "eq-impl-5678",
      "name": "DB60 36-Row Planter",
      "category": "implement"
    }
  ],
  "links": [
    { "rel": "self", "uri": "..." },
    { "rel": "organizations", "uri": "..." },
    { "rel": "fieldOperations", "uri": "..." },
    { "rel": "measurements", "uri": "..." }
  ]
}
```

---

### Create Equipment

```
POST /organizations/{orgId}/equipment
```

**Request Body:**

```json
{
  "name": "Custom Sprayer",
  "category": "machine",
  "make": {
    "id": "make-apache"
  },
  "type": {
    "id": "type-sprayer"
  },
  "model": {
    "id": "model-as1240"
  },
  "serialNumber": "AP1240XYZ789",
  "modelYear": 2024
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name (max 100 chars) |
| `category` | Yes | `machine` or `implement` |
| `make.id` | Yes | Equipment make ID (from `/equipmentMakes`) |
| `type.id` | Yes | Equipment type ID (from `/equipmentTypes`) |
| `model.id` | No | Equipment model ID (from `/equipmentModels`) |
| `serialNumber` | No | Unique serial number |
| `modelYear` | No | Model year |

**Response:** `201 Created` with `Location` header

---

### Update Equipment

```
PUT /equipment/{id}
```

**Request Body:** Same structure as Create (partial updates supported)

**Response:** `200 OK` — Updated equipment object

---

### Archive Equipment

```
PUT /equipment/{id}
```

```json
{
  "archived": true
}
```

**Response:** `200 OK`

---

## Equipment Metadata Endpoints

### List Equipment Makes

```
GET /equipmentMakes
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter: `machine` or `implement` |

**Response:** `200 OK`

```json
{
  "values": [
    { "id": "make-jd", "name": "John Deere" },
    { "id": "make-case", "name": "Case IH" },
    { "id": "make-agco", "name": "AGCO" },
    { "id": "make-cnhi", "name": "New Holland" }
  ]
}
```

---

### List Equipment Types

```
GET /equipmentMakes/{makeId}/equipmentTypes
```

**Response:** `200 OK`

```json
{
  "values": [
    { "id": "type-tractor", "name": "Tractor", "category": "machine" },
    { "id": "type-combine", "name": "Combine", "category": "machine" },
    { "id": "type-sprayer", "name": "Sprayer", "category": "machine" },
    { "id": "type-planter", "name": "Planter", "category": "implement" },
    { "id": "type-tillage", "name": "Tillage", "category": "implement" }
  ]
}
```

---

### List Equipment Models

```
GET /equipmentMakes/{makeId}/equipmentTypes/{typeId}/equipmentModels
```

**Response:** `200 OK`

```json
{
  "values": [
    { "id": "model-8r410", "name": "8R 410" },
    { "id": "model-8r370", "name": "8R 370" },
    { "id": "model-8r340", "name": "8R 340" }
  ]
}
```

---

## Equipment Measurements

### Contribute Measurements (Third-Party Equipment)

```
POST /organizations/{orgId}/equipment/{equipmentId}/measurements
```

For third-party (non-JDLink) equipment, contribute telematics data.

**Request Body:**

```json
{
  "measurements": [
    {
      "type": "engineHours",
      "value": 1250.5,
      "unit": "hr",
      "timestamp": "2026-01-04T14:30:00Z"
    },
    {
      "type": "fuelLevel",
      "value": 75,
      "unit": "percent",
      "timestamp": "2026-01-04T14:30:00Z"
    },
    {
      "type": "location",
      "latitude": 41.6510,
      "longitude": -93.7679,
      "timestamp": "2026-01-04T14:30:00Z"
    }
  ]
}
```

**Response:** `202 Accepted`

> ⏱️ Data typically reflects in Operations Center within 30 seconds.

---

### Get Equipment Measurements

```
GET /equipment/{id}/measurements
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `measurementType` | string | Filter by type |
| `startTime` | datetime | Filter from timestamp |
| `endTime` | datetime | Filter to timestamp |

**Response:** `200 OK`

```json
{
  "values": [
    {
      "@type": "EquipmentMeasurement",
      "type": "engineHours",
      "value": 1247.5,
      "unit": "hr",
      "timestamp": "2026-01-04T12:00:00Z"
    },
    {
      "@type": "EquipmentMeasurement",
      "type": "location",
      "latitude": 41.6508,
      "longitude": -93.7692,
      "timestamp": "2026-01-04T12:00:00Z"
    }
  ]
}
```

---

## Equipment Categories

| Category | Description |
|----------|-------------|
| `machine` | Self-propelled equipment (tractors, combines, sprayers) |
| `implement` | Towed/attached equipment (planters, tillage, headers) |

---

## Common Equipment Types

### Machines

| Type | Description |
|------|-------------|
| `Tractor` | Row crop, utility, and compact tractors |
| `Combine` | Combine harvesters |
| `Sprayer` | Self-propelled sprayers |
| `Windrower` | Self-propelled windrowers |
| `Cotton Picker` | Cotton harvesting equipment |
| `Sugarcane Harvester` | Sugarcane equipment |
| `Forage Harvester` | Silage/forage harvesters |

### Implements

| Type | Description |
|------|-------------|
| `Planter` | Row planters |
| `Seeder` | Air seeders, drills |
| `Tillage` | Discs, rippers, cultivators |
| `Sprayer` | Pull-type sprayers |
| `Header` | Combine headers |
| `Baler` | Round/square balers |
| `Spreader` | Fertilizer spreaders |

---

## Telematics States

| State | Description |
|-------|-------------|
| `ACTIVATED` | JDLink telematics active and transmitting |
| `NOT_ACTIVATED` | Equipment capable but not activated |
| `NOT_AVAILABLE` | Equipment doesn't support telematics |
| `THIRD_PARTY` | Non-JDLink telematics device connected |

---

## Measurement Types

| Type | Unit | Description |
|------|------|-------------|
| `engineHours` | `hr` | Total engine hours |
| `fuelLevel` | `percent` | Current fuel level percentage |
| `fuelUsed` | `gal` or `L` | Fuel consumed |
| `location` | lat/lon | GPS coordinates |
| `speed` | `mph` or `km/h` | Current speed |
| `defLevel` | `percent` | DEF/AdBlue level |
| `oilPressure` | `psi` or `kPa` | Engine oil pressure |
| `coolantTemp` | `°F` or `°C` | Engine coolant temperature |

---

## Response Schema

### Equipment Object

| Property | Type | Description |
|----------|------|-------------|
| `@type` | string | Always `"Equipment"` |
| `id` | string | UUID identifier |
| `name` | string | Display name |
| `category` | string | `machine` or `implement` |
| `make` | Make | Manufacturer info |
| `type` | Type | Equipment type info |
| `model` | Model | Model info |
| `serialNumber` | string | Equipment serial number |
| `modelYear` | integer | Model year |
| `engineHours` | Measurement | Current engine hours |
| `archived` | boolean | Archived status |
| `telematicsState` | string | Telematics connection status |
| `connectedDevices` | Device[] | JDLink/telematics devices |
| `pairedEquipment` | Equipment[] | Paired implements/machines |
| `links` | ApiLink[] | HATEOAS navigation |

### ConnectedDevice Object

| Property | Type | Description |
|----------|------|-------------|
| `@type` | string | `"ConnectedDevice"` |
| `id` | string | Device identifier |
| `deviceType` | string | `JDLink`, `MTG`, `ThirdParty` |
| `serialNumber` | string | Device serial number |

---

## Edge Cases & Gotchas

### Different Base URL

> ⚠️ The Equipment API uses a **separate domain** from other JD APIs:

| API | Base URL |
|-----|----------|
| Equipment | `https://equipmentapi.deere.com/isg` |
| All Others | `https://partnerapi.deere.com` |

**Example full URLs:**
```
GET https://equipmentapi.deere.com/isg/equipment
GET https://equipmentapi.deere.com/isg/organizations/{orgId}/equipment
POST https://equipmentapi.deere.com/isg/organizations/{orgId}/equipment/{id}/measurements
```

Authentication still uses the same OAuth tokens—only the base URL differs.

---

### Machine vs Implement API Deprecation

> ⚠️ The legacy `/machines` and `/implements` endpoints are deprecated as of January 2025. Migrate to `/equipment` with `category` filter.

**Legacy (deprecated):**
```
GET /machines
GET /implements
```

**New (use this):**
```
GET /equipment?category=machine
GET /equipment?category=implement
```

### Serial Number Uniqueness

- Serial numbers must be unique **within an organization**
- Same serial number can exist in different organizations
- Creating duplicate serial numbers returns `409 Conflict`

### Name Uniqueness

- Equipment names should be unique within an organization
- Duplicates allowed but not recommended (causes confusion)
- Use serial number for programmatic identification

### Third-Party Equipment

- Non-John Deere equipment requires manual creation via API
- Telematics data must be contributed via measurements endpoint
- `telematicsState` will be `THIRD_PARTY` or `NOT_AVAILABLE`

### Paired Equipment

- Pairing links machines to implements (e.g., tractor → planter)
- Pairings are typically automatic when equipment operates together
- Pairings affect which operations are associated with which equipment

### Equipment in Multiple Organizations

- Same physical equipment can be shared across organizations
- Each org sees the equipment with its own permissions
- Updates affect all organizations that have access

### Archived Equipment

- Archived equipment excluded from default queries
- Use `archived=true` to include in results
- Historical operations retain equipment references

### Measurements Delay

- Contributed measurements take up to 30 seconds to appear
- JDLink data may have longer delays depending on cellular connectivity
- Real-time tracking not guaranteed

### Model Year vs Serial Number

- Model year is informational only
- Serial number encodes actual build date for JD equipment
- Third-party equipment may not have standard serial format

---

## Headers

**Request:**
```
Authorization: Bearer {access_token}
Accept: application/vnd.deere.axiom.v3+json
Content-Type: application/json
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (POST) |
| 202 | Accepted (measurements contribution) |
| 204 | No Content (DELETE) |
| 400 | Invalid request (bad make/type/model ID) |
| 401 | Token expired or invalid |
| 403 | Insufficient permissions or org access not granted |
| 404 | Equipment not found |
| 409 | Conflict (duplicate serial number) |
| 429 | Rate limited |
| 500 | Server error |

---

## Common Use Cases

### Get All Tractors for Organization

```
GET /equipment?organizationIds={orgId}&category=machine
```
Then filter client-side by `type.name === "Tractor"`.

### Create Third-Party Equipment

```json
POST /organizations/{orgId}/equipment
{
  "name": "Apache AS1240",
  "category": "machine",
  "make": { "id": "make-apache" },
  "type": { "id": "type-sprayer" },
  "serialNumber": "AP1240XYZ789"
}
```

### Contribute Telematics Data

```json
POST /organizations/{orgId}/equipment/{equipmentId}/measurements
{
  "measurements": [
    {
      "type": "engineHours",
      "value": 1250,
      "unit": "hr",
      "timestamp": "2026-01-04T14:30:00Z"
    }
  ]
}
```

### Find Equipment with Connected Telematics

```
GET /equipment?organizationIds={orgId}&embed=connectedDevices
```
Filter results where `telematicsState === "ACTIVATED"`.

---

## Related Endpoints

- [Fields](./fields.md) - Field metadata
- [Field Operations](./field-operations.md) - Operations performed by equipment
- [Products](./products.md) - Products used by equipment
- [Boundaries](./boundaries.md) - Field geometry

