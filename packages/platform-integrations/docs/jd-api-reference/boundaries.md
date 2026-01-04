# John Deere Boundaries API

> Reference: [developer.deere.com/dev-docs/boundaries](https://developer.deere.com/dev-docs/boundaries)

## Overview

Boundaries define the geographic extent of fields using multipolygon geometries. A field can have multiple boundaries, but only one can be `active` at a time.

**Required Scopes:** `ag1` (view), `ag3` (create/update/delete)

---

## Endpoints

### List Boundaries for Organization

```
GET /organizations/{orgId}/boundaries
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `embed` | string | — | Include geometry: `multipolygons` |
| `recordFilter` | string | `active` | Filter: `active`, `archived`, `all` |

**Headers:**

| Header | Values | Default | Description |
|--------|--------|---------|-------------|
| `Accept-UOM-System` | `METRIC`, `ENGLISH` | `METRIC` | Unit system for area values |

**Response:** `200 OK`

```json
{
  "links": [
    { "rel": "self", "uri": "..." },
    { "rel": "nextPage", "uri": "..." }
  ],
  "total": 85,
  "values": [
    {
      "@type": "Boundary",
      "id": "519dcf9a-9931-4789-9eaa-3dc7399f2840",
      "name": "North Field - 2024",
      "sourceType": "HandDrawn",
      "createdTime": "2024-03-15T14:30:00Z",
      "modifiedTime": "2024-03-15T14:30:00Z",
      "area": {
        "@type": "MeasurementAsDouble",
        "valueAsDouble": 32.45,
        "unit": "ha"
      },
      "active": true,
      "archived": false,
      "links": [...]
    }
  ]
}
```

> ⚠️ **Note:** Geometry (`multipolygons`) is **not included by default**. Use `?embed=multipolygons` to include it.

---

### List Boundaries for Field

```
GET /organizations/{orgId}/fields/{fieldId}/boundaries
```

Same parameters and response as org-level endpoint, filtered to specific field.

---

### Get Boundary

```
GET /organizations/{orgId}/boundaries/{boundaryId}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `embed` | string | Include geometry: `multipolygons` |

**Response:** `200 OK` — Single boundary object

---

### Create Boundary

```
POST /organizations/{orgId}/fields/{fieldId}/boundaries
```

**Request Body:**

```json
{
  "name": "North Field - Spring 2024",
  "multipolygons": [
    {
      "@type": "Polygon",
      "rings": [
        {
          "@type": "Ring",
          "points": [
            { "@type": "Point", "lat": 41.6510, "lon": -93.7679 },
            { "@type": "Point", "lat": 41.6508, "lon": -93.7692 },
            { "@type": "Point", "lat": 41.6505, "lon": -93.7704 },
            { "@type": "Point", "lat": 41.6510, "lon": -93.7679 }
          ],
          "type": "exterior",
          "passable": false
        }
      ]
    }
  ],
  "active": true
}
```

**Response:** `201 Created` with `Location` header

---

### Update Boundary

```
PUT /organizations/{orgId}/boundaries/{boundaryId}
```

**Response:** `200 OK`

---

### Delete Boundary

```
DELETE /organizations/{orgId}/boundaries/{boundaryId}
```

**Response:** `204 No Content`

---

## Geometry Representation

### Structure Overview

```
Boundary
└── multipolygons[]           (array of Polygons)
    └── Polygon
        └── rings[]           (array of Rings)
            └── Ring
                ├── type      (exterior | interior)
                ├── passable  (boolean)
                └── points[]  (array of Points)
                    └── Point
                        ├── lat (double)
                        └── lon (double)
```

### Full Geometry Example

```json
{
  "multipolygons": [
    {
      "@type": "Polygon",
      "rings": [
        {
          "@type": "Ring",
          "type": "exterior",
          "passable": false,
          "points": [
            { "@type": "Point", "lat": 41.6510781, "lon": -93.7679886 },
            { "@type": "Point", "lat": 41.6508212, "lon": -93.7692896 },
            { "@type": "Point", "lat": 41.6505221, "lon": -93.7704892 },
            { "@type": "Point", "lat": 41.6502118, "lon": -93.7694231 },
            { "@type": "Point", "lat": 41.6510781, "lon": -93.7679886 }
          ]
        },
        {
          "@type": "Ring",
          "type": "interior",
          "passable": true,
          "points": [
            { "@type": "Point", "lat": 41.6507, "lon": -93.7688 },
            { "@type": "Point", "lat": 41.6506, "lon": -93.7690 },
            { "@type": "Point", "lat": 41.6505, "lon": -93.7688 },
            { "@type": "Point", "lat": 41.6507, "lon": -93.7688 }
          ]
        }
      ]
    }
  ]
}
```

### Ring Types

| Type | Description |
|------|-------------|
| `exterior` | Outer boundary of the polygon (field edge) |
| `interior` | Hole/exclusion zone (waterway, rock pile, pond) |

### Passable Flag

| Value | Meaning |
|-------|---------|
| `false` | Impassable obstacle (boulder, building) |
| `true` | Passable exclusion (waterway, grass strip) |

---

## Response Schema

### Boundary Object

| Property | Type | Description |
|----------|------|-------------|
| `@type` | string | Always `"Boundary"` |
| `id` | string | UUID identifier |
| `name` | string | Boundary name |
| `sourceType` | string | Origin of boundary data |
| `createdTime` | datetime | ISO 8601 creation timestamp |
| `modifiedTime` | datetime | ISO 8601 last modified timestamp |
| `area` | Measurement | Total boundary area |
| `workableArea` | Measurement | Area minus exclusions |
| `active` | boolean | Is this the active boundary for the field |
| `archived` | boolean | Soft-delete status |
| `irrigated` | boolean | Irrigation flag |
| `signalType` | string | GPS signal type used |
| `multipolygons` | Polygon[] | Geometry (only with `embed`) |
| `boundingBox` | BoundingBox | Envelope rectangle |
| `links` | ApiLink[] | HATEOAS navigation |

### Source Types

| Value | Description |
|-------|-------------|
| `HandDrawn` | Manually drawn in Operations Center |
| `MachineMeasured` | Captured from machine operation |
| `Imported` | Uploaded via file or API |
| `Generated` | Auto-generated from operations |

### Signal Types

| Value | Description |
|-------|-------------|
| `dtiSignalTypeRTK` | RTK GPS (centimeter accuracy) |
| `dtiSignalTypeSF1` | SF1 (decimeter accuracy) |
| `dtiSignalTypeSF2` | SF2 (sub-decimeter accuracy) |
| `dtiSignalTypeWAAS` | WAAS (meter accuracy) |

---

## Edge Cases & Gotchas

### Geometry Not Included by Default
```
GET /organizations/{orgId}/boundaries              → No geometry
GET /organizations/{orgId}/boundaries?embed=multipolygons → With geometry
```
**Always use `embed=multipolygons`** when you need the actual shape data.

### Ring Closure
- First and last point of each ring **must be identical** (closed loop)
- API may reject or auto-close rings that aren't properly closed

### Winding Order
- **Exterior rings:** Counter-clockwise (CCW)
- **Interior rings:** Clockwise (CW)
- Some APIs are lenient, but follow convention for compatibility

### Coordinate Precision
- Coordinates use WGS84 (EPSG:4326)
- 7+ decimal places recommended for accuracy
- Order is **lat, lon** (not GeoJSON's lon, lat!)

### Multiple Polygons
- A boundary can contain **multiple disconnected polygons**
- Example: Field split by a road = 2 polygons, 1 boundary
- Each polygon in `multipolygons[]` is independent

### Active Boundary
- Only **one boundary per field** can be `active: true`
- Setting a new boundary as active automatically deactivates the previous one
- Operations typically reference the active boundary

### Area Calculations
- `area`: Total area including holes
- `workableArea`: Area minus interior rings (actual farmable area)
- Values depend on `Accept-UOM-System` header

### Archived Boundaries
- Archiving preserves history while hiding from default lists
- Operations linked to archived boundaries retain those links
- Use `recordFilter=all` for complete data sync

### Boundary vs Field Relationship
- Boundaries belong to fields via `links[rel=field]`
- A field can have 0+ boundaries (history of field shape changes)
- Deleting a field does NOT delete its boundaries (orphaned)

---

## Converting to GeoJSON

JD's format differs from standard GeoJSON. Here's the conversion:

**John Deere Format:**
```json
{
  "multipolygons": [{
    "rings": [{
      "points": [
        { "lat": 41.65, "lon": -93.76 },
        { "lat": 41.64, "lon": -93.77 }
      ]
    }]
  }]
}
```

**GeoJSON Equivalent:**
```json
{
  "type": "MultiPolygon",
  "coordinates": [
    [
      [
        [-93.76, 41.65],
        [-93.77, 41.64]
      ]
    ]
  ]
}
```

**Key differences:**
1. GeoJSON uses `[lon, lat]`, JD uses `{ lat, lon }`
2. GeoJSON nests as `coordinates[polygon][ring][point]`
3. GeoJSON uses `type: "MultiPolygon"`, JD uses `@type: "Polygon"` per polygon

---

## Headers

**Request:**
```
Authorization: Bearer {access_token}
Accept: application/vnd.deere.axiom.v3+json
Accept-UOM-System: METRIC
Content-Type: application/json
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | Deleted |
| 400 | Invalid geometry or request |
| 401 | Token expired/invalid |
| 403 | Insufficient permissions |
| 404 | Boundary/field/org not found |
| 409 | Conflict (e.g., duplicate active boundary) |
| 422 | Invalid geometry (self-intersecting, etc.) |

