# John Deere Field Operations API

> Reference: [developer.deere.com/dev-docs/field-operations](https://developer.deere.com/dev-docs/field-operations)

## Overview

Field Operations represent recorded agricultural activities (planting, harvesting, spraying, tillage, etc.) captured from John Deere equipment. Operations contain timestamped data about what was done, where, by whom, and with what products/equipment.

**Required Scopes:** `ag1` (view), `ag2` (files), `ag3` (create/update/delete)

**Base URL:** `https://partnerapi.deere.com`

---

## Endpoints

### List Field Operations for Organization

```
GET /organizations/{orgId}/fieldOperations
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `modifiedFrom` | datetime | — | Filter operations modified after this ISO 8601 timestamp |
| `modifiedTo` | datetime | — | Filter operations modified before this ISO 8601 timestamp |
| `operationType` | string | — | Filter by operation type (see Operation Types) |
| `embed` | string | — | Include related data: `measurementTypes`, `products`, `boundaries` |
| `itemLimit` | integer | 10 | Number of results per page (max varies) |
| `pageOffset` | integer | 0 | Offset for pagination |

**Headers:**

| Header | Values | Default | Description |
|--------|--------|---------|-------------|
| `Accept-UOM-System` | `METRIC`, `ENGLISH` | `METRIC` | Unit system for measurements |
| `x-deere-no-paging` | `true` | — | Disable pagination (use with caution) |
| `x-deere-signature` | string | — | eTag for incremental sync |

**Response:** `200 OK`

```json
{
  "links": [
    { "rel": "self", "uri": "..." },
    { "rel": "nextPage", "uri": "..." }
  ],
  "total": 245,
  "values": [
    {
      "@type": "FieldOperation",
      "id": "12345678-abcd-1234-abcd-123456789abc",
      "operationType": "seeding",
      "startTime": "2025-04-01T08:00:00Z",
      "endTime": "2025-04-01T12:30:00Z",
      "modifiedTime": "2025-04-01T14:00:00Z",
      "links": [
        { "rel": "self", "uri": "..." },
        { "rel": "field", "uri": "..." },
        { "rel": "machines", "uri": "..." },
        { "rel": "measurements", "uri": "..." }
      ]
    }
  ]
}
```

---

### List Field Operations for Field

```
GET /organizations/{orgId}/fields/{fieldId}/fieldOperations
```

Same parameters as org-level endpoint, filtered to specific field.

---

### Get Field Operation

```
GET /fieldOperations/{operationId}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `embed` | string | Include related data: `measurementTypes`, `products`, `boundaries` |

**Response:** `200 OK`

```json
{
  "@type": "FieldOperation",
  "id": "12345678-abcd-1234-abcd-123456789abc",
  "operationType": "seeding",
  "startTime": "2025-04-01T08:00:00Z",
  "endTime": "2025-04-01T12:30:00Z",
  "modifiedTime": "2025-04-01T14:00:00Z",
  "field": {
    "id": "67890",
    "name": "North Field"
  },
  "machine": {
    "id": "54321",
    "name": "JD 8R 410"
  },
  "operator": {
    "id": "11223",
    "name": "John Doe"
  },
  "products": [
    {
      "id": "98765",
      "name": "Corn Seed DKC62-08",
      "rate": {
        "valueAsDouble": 34000,
        "unit": "seeds/ac"
      }
    }
  ],
  "area": {
    "@type": "MeasurementAsDouble",
    "valueAsDouble": 125.5,
    "unit": "ac"
  },
  "averageSpeed": {
    "@type": "MeasurementAsDouble",
    "valueAsDouble": 5.2,
    "unit": "mi/hr"
  },
  "links": [
    { "rel": "self", "uri": "..." },
    { "rel": "field", "uri": "..." },
    { "rel": "machines", "uri": "..." },
    { "rel": "measurements", "uri": "..." },
    { "rel": "operationFiles", "uri": "..." }
  ]
}
```

---

### Get Field Operation Measurements

```
GET /fieldOperations/{operationId}/measurements
```

Returns geospatial measurement data (coverage maps, as-applied data, yield data).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `measurementType` | string | Filter by measurement type |

**Response:** `200 OK`

```json
{
  "links": [...],
  "total": 3,
  "values": [
    {
      "@type": "FieldOperationMeasurement",
      "id": "meas-12345",
      "measurementType": "appliedRate",
      "applicationProductTotals": [
        {
          "product": {
            "id": "98765",
            "name": "Corn Seed DKC62-08"
          },
          "area": {
            "valueAsDouble": 125.5,
            "unit": "ac"
          },
          "averageMaterial": {
            "valueAsDouble": 34000,
            "unit": "seeds/ac"
          },
          "totalMaterial": {
            "valueAsDouble": 4267500,
            "unit": "seeds"
          }
        }
      ],
      "links": [
        { "rel": "mapLayer", "uri": "..." },
        { "rel": "mapLayerSummary", "uri": "..." }
      ]
    }
  ]
}
```

---

### Get Operation Files

```
GET /fieldOperations/{operationId}/operationFiles
```

Returns downloadable file references for the operation data.

**Response:** `200 OK`

```json
{
  "links": [...],
  "values": [
    {
      "@type": "OperationFile",
      "id": "file-12345",
      "fileName": "2025-04-01_north-field_planting.zip",
      "fileType": "ADAPTSETUP",
      "links": [
        { "rel": "fileContents", "uri": "..." }
      ]
    }
  ]
}
```

---

## Operation Types

| Type | Description |
|------|-------------|
| `seeding` | Planting/seeding operations |
| `harvest` | Crop harvest with yield data |
| `application` | Fertilizer, chemical application |
| `tillage` | Soil tillage operations |
| `baling` | Baling hay/straw |
| `mowing` | Mowing operations |
| `windrowing` | Creating windrows |
| `other` | Miscellaneous operations |

---

## Measurement Types

| Type | Description | Typical Operations |
|------|-------------|-------------------|
| `appliedRate` | As-applied product rate | seeding, application |
| `targetRate` | Prescribed target rate | seeding, application |
| `yieldVolume` | Harvest yield (volume) | harvest |
| `yieldMass` | Harvest yield (mass) | harvest |
| `moisture` | Grain moisture content | harvest |
| `coverage` | Area coverage map | all |
| `speed` | Machine speed | all |
| `elevation` | Terrain elevation | all |
| `fuelRate` | Fuel consumption rate | all |

---

## Response Schema

### FieldOperation Object

| Property | Type | Description |
|----------|------|-------------|
| `@type` | string | Always `"FieldOperation"` |
| `id` | string | UUID identifier |
| `operationType` | string | Type of operation (see Operation Types) |
| `startTime` | datetime | ISO 8601 start timestamp |
| `endTime` | datetime | ISO 8601 end timestamp |
| `modifiedTime` | datetime | ISO 8601 last modified timestamp |
| `field` | object | Field info (id, name) |
| `machine` | object | Machine info (id, name) |
| `operator` | object | Operator info (id, name) |
| `products` | Product[] | Products applied (see Products) |
| `area` | Measurement | Total area covered |
| `averageSpeed` | Measurement | Average operation speed |
| `links` | ApiLink[] | HATEOAS navigation |

### Product Object

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Product identifier |
| `name` | string | Product name |
| `rate` | Measurement | Application rate |
| `manufacturer` | string | Product manufacturer (optional) |
| `type` | string | Product type (seed, fertilizer, chemical) |

### ApplicationProductTotals Object

| Property | Type | Description |
|----------|------|-------------|
| `product` | object | Product reference (id, name) |
| `area` | Measurement | Area where product was applied |
| `averageMaterial` | Measurement | Average application rate |
| `totalMaterial` | Measurement | Total material applied |

---

## Edge Cases & Gotchas

### Products Array (Breaking Change - Nov 2023)

> ⚠️ **API Change:** The `product` field was replaced with a `products` array to support tank mixes and multi-product operations.

**Old format (deprecated):**
```json
{
  "product": { "id": "123", "name": "Corn Seed" }
}
```

**New format:**
```json
{
  "products": [
    { "id": "123", "name": "Corn Seed" },
    { "id": "456", "name": "Starter Fertilizer" }
  ]
}
```

Similarly, `productTotals` was replaced with `applicationProductTotals`.

### Operations Still Processing

- Operations sync from equipment to Operations Center asynchronously
- Recently completed operations may have incomplete data
- `endTime` being null indicates operation is still in progress
- Measurement data may arrive hours after operation completion

### Time Zone Handling

- All timestamps are UTC (ISO 8601 format)
- `startTime`/`endTime` reflect machine time converted to UTC
- Operations spanning midnight may have unexpected date splits

### Multi-Machine Operations

- Large operations may involve multiple machines
- Use `links[rel=machines]` to get all machines involved
- Each machine may have separate measurement records

### Orphaned Operations

- Operations reference fields by link, not embedded
- If a field is deleted, operations remain but `field` link returns 404
- Use the org-level operations endpoint to find all operations

### Partial Data

- Not all operations have all measurement types
- Yield data only present for harvest operations
- Product data absent for tillage operations
- Check `links` array to see what data is available

### Large Files

- Operation files can be very large (100MB+)
- Use streaming downloads for `fileContents` links
- Files are typically in ADAPT or proprietary JD formats

### Pagination for Large Farms

- Farms with years of history may have thousands of operations
- Always use `modifiedFrom`/`modifiedTo` filters for incremental sync
- Default page size is 10; increase `itemLimit` for bulk retrieval

### eTag for Incremental Sync

```
Request:  x-deere-signature: {previous_etag}
Response: x-deere-signature: {new_etag}
```
Only returns operations modified since the eTag was generated.

---

## Headers

**Request:**
```
Authorization: Bearer {access_token}
Accept: application/vnd.deere.axiom.v3+json
Accept-UOM-System: METRIC
Content-Type: application/json
```

**Optional Request Headers:**
```
Accept-Encoding: gzip
x-deere-no-paging: true
x-deere-signature: {etag}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid request (bad date format, invalid filter) |
| 401 | Token expired or invalid |
| 403 | Insufficient permissions or org access not granted |
| 404 | Operation/field/org not found |
| 429 | Rate limited |
| 500 | Server error |

---

## Common Use Cases

### Sync All Operations for a Field

```
GET /organizations/{orgId}/fields/{fieldId}/fieldOperations
    ?embed=products
    &modifiedFrom=2024-01-01T00:00:00Z
```

### Get Yield Data for Harvest

```
GET /fieldOperations/{operationId}/measurements?measurementType=yieldVolume
```

### Download Raw Operation File

```
1. GET /fieldOperations/{operationId}/operationFiles
2. Follow links[rel=fileContents] for each file
3. Stream download with appropriate Accept header
```

### Incremental Sync Pattern

```
1. First call: GET /organizations/{orgId}/fieldOperations
2. Store x-deere-signature from response
3. Next call: Include x-deere-signature header
4. Only modified operations returned
```

---

## Related Endpoints

- [Fields](./fields.md) - Field metadata
- [Boundaries](./boundaries.md) - Field geometry
- [Work Plans](./work-plans.md) - Planned operations (prescriptions)
- [Equipment](./equipment.md) - Machines and implements

