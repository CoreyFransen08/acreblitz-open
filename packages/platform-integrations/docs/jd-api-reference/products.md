# John Deere Products API

> Reference: [developer.deere.com/dev-docs/products](https://developer.deere.com/dev-docs/products)

## Overview

Products represent agricultural inputs used in field operations—seeds, fertilizers, chemicals, carriers, and adjuvants. Products are organization-scoped and referenced by Field Operations for tracking what was applied, planted, or harvested.

**Required Scopes:** `ag1` (view), `ag3` (create/update/delete)

**Base URL:** `https://partnerapi.deere.com`

---

## Endpoints

### List Products for Organization

```
GET /organizations/{orgId}/products
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | — | Filter by product type (see Product Types) |
| `active` | boolean | — | Filter by active status |
| `recordFilter` | string | `active` | Filter: `active`, `archived`, `all` |
| `itemLimit` | integer | 10 | Results per page |
| `pageOffset` | integer | 0 | Pagination offset |

**Response:** `200 OK`

```json
{
  "links": [
    { "rel": "self", "uri": "..." },
    { "rel": "nextPage", "uri": "..." }
  ],
  "total": 156,
  "values": [
    {
      "@type": "Product",
      "id": "prod-12345678-abcd",
      "name": "DKC62-08 RIB",
      "type": "seed",
      "category": "corn",
      "manufacturer": "DEKALB",
      "active": true,
      "archived": false,
      "createdTime": "2024-01-15T10:30:00Z",
      "modifiedTime": "2024-03-20T14:45:00Z",
      "links": [
        { "rel": "self", "uri": "..." },
        { "rel": "owningOrganization", "uri": "..." }
      ]
    }
  ]
}
```

---

### Get Product

```
GET /organizations/{orgId}/products/{productId}
```

**Response:** `200 OK`

```json
{
  "@type": "Product",
  "id": "prod-12345678-abcd",
  "name": "DKC62-08 RIB",
  "type": "seed",
  "category": "corn",
  "manufacturer": "DEKALB",
  "description": "High-yield corn hybrid with drought tolerance",
  "active": true,
  "archived": false,
  "defaultRate": {
    "@type": "MeasurementAsDouble",
    "valueAsDouble": 34000,
    "unit": "seeds/ac"
  },
  "density": {
    "@type": "MeasurementAsDouble",
    "valueAsDouble": 56,
    "unit": "lb/bu"
  },
  "createdTime": "2024-01-15T10:30:00Z",
  "modifiedTime": "2024-03-20T14:45:00Z",
  "links": [
    { "rel": "self", "uri": "..." },
    { "rel": "owningOrganization", "uri": "..." },
    { "rel": "fieldOperations", "uri": "..." }
  ]
}
```

---

### Create Product

```
POST /organizations/{orgId}/products
```

**Request Body:**

```json
{
  "name": "28-0-0 UAN",
  "type": "fertilizer",
  "category": "nitrogen",
  "manufacturer": "CF Industries",
  "description": "Liquid nitrogen solution",
  "active": true,
  "defaultRate": {
    "@type": "MeasurementAsDouble",
    "valueAsDouble": 30,
    "unit": "gal/ac"
  },
  "density": {
    "@type": "MeasurementAsDouble",
    "valueAsDouble": 10.67,
    "unit": "lb/gal"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Product name (max 200 chars) |
| `type` | Yes | Product type (see Product Types) |
| `category` | No | Subcategory within type |
| `manufacturer` | No | Product manufacturer/brand |
| `description` | No | Product description |
| `active` | No | Default: `true` |
| `defaultRate` | No | Default application rate |
| `density` | No | Product density for unit conversion |

**Response:** `201 Created` with `Location` header

```
Location: https://partnerapi.deere.com/organizations/{orgId}/products/{newProductId}
```

---

### Update Product

```
PUT /organizations/{orgId}/products/{productId}
```

**Request Body:** Same structure as Create

**Response:** `200 OK` — Updated product object

---

### Delete Product

```
DELETE /organizations/{orgId}/products/{productId}
```

**Response:** `204 No Content`

---

## Product Types

| Type | Description | Common Categories |
|------|-------------|-------------------|
| `seed` | Seeds, hybrids, varieties | corn, soybean, wheat, cotton |
| `fertilizer` | Fertilizers and nutrients | nitrogen, phosphorus, potassium, micronutrient |
| `chemical` | Pesticides, herbicides, fungicides | herbicide, insecticide, fungicide |
| `carrier` | Application carriers | water, liquid fertilizer |
| `adjuvant` | Spray adjuvants | surfactant, drift retardant |
| `fuel` | Equipment fuel | diesel, gasoline |
| `other` | Miscellaneous products | — |

---

## Common Product Categories

### Seed Categories

| Category | Description |
|----------|-------------|
| `corn` | Field corn varieties/hybrids |
| `soybean` | Soybean varieties |
| `wheat` | Winter/spring wheat |
| `cotton` | Cotton varieties |
| `sorghum` | Grain sorghum |
| `canola` | Canola/rapeseed |
| `rice` | Rice varieties |
| `alfalfa` | Alfalfa/hay |

### Fertilizer Categories

| Category | Description |
|----------|-------------|
| `nitrogen` | N fertilizers (urea, UAN, anhydrous) |
| `phosphorus` | P fertilizers (MAP, DAP) |
| `potassium` | K fertilizers (potash) |
| `sulfur` | Sulfur products |
| `micronutrient` | Zinc, boron, manganese, etc. |
| `blend` | Custom NPK blends |
| `organic` | Organic fertilizers, manure |

### Chemical Categories

| Category | Description |
|----------|-------------|
| `herbicide` | Weed control |
| `insecticide` | Insect control |
| `fungicide` | Disease control |
| `growth_regulator` | Plant growth regulators |
| `desiccant` | Harvest aids |
| `nematicide` | Nematode control |

---

## Response Schema

### Product Object

| Property | Type | Description |
|----------|------|-------------|
| `@type` | string | Always `"Product"` |
| `id` | string | UUID identifier |
| `name` | string | Product name |
| `type` | string | Product type (see Product Types) |
| `category` | string | Subcategory |
| `manufacturer` | string | Manufacturer/brand name |
| `description` | string | Product description |
| `active` | boolean | Is product available for use |
| `archived` | boolean | Soft-delete status |
| `defaultRate` | Measurement | Default application rate |
| `density` | Measurement | Product density |
| `createdTime` | datetime | ISO 8601 creation timestamp |
| `modifiedTime` | datetime | ISO 8601 last modified |
| `links` | ApiLink[] | HATEOAS navigation |

### Measurement Object

```json
{
  "@type": "MeasurementAsDouble",
  "valueAsDouble": 34000,
  "unit": "seeds/ac"
}
```

| Property | Type | Description |
|----------|------|-------------|
| `@type` | string | `"MeasurementAsDouble"` or `"MeasurementAsInt"` |
| `valueAsDouble` | number | Numeric value |
| `unit` | string | Unit of measure |

---

## Common Units

### Seed Units

| Unit | Description |
|------|-------------|
| `seeds/ac` | Seeds per acre |
| `seeds/ha` | Seeds per hectare |
| `seeds/m` | Seeds per meter of row |
| `bu/ac` | Bushels per acre |
| `lb/ac` | Pounds per acre |

### Fertilizer Units

| Unit | Description |
|------|-------------|
| `lb/ac` | Pounds per acre |
| `gal/ac` | Gallons per acre |
| `ton/ac` | Tons per acre |
| `kg/ha` | Kilograms per hectare |
| `L/ha` | Liters per hectare |

### Chemical Units

| Unit | Description |
|------|-------------|
| `oz/ac` | Ounces per acre |
| `pt/ac` | Pints per acre |
| `qt/ac` | Quarts per acre |
| `gal/ac` | Gallons per acre |
| `mL/ha` | Milliliters per hectare |
| `L/ha` | Liters per hectare |

### Density Units

| Unit | Description |
|------|-------------|
| `lb/bu` | Pounds per bushel |
| `lb/gal` | Pounds per gallon |
| `kg/L` | Kilograms per liter |

---

## Edge Cases & Gotchas

### Duplicate Product Names

- Product names **don't need to be unique** within an organization
- Products are identified by UUID, not name
- Same product may exist multiple times with different IDs
- Use manufacturer + name combination for human identification

### Product References in Operations

- Products referenced by Field Operations retain links even if archived
- Deleting a product **does not** delete it from historical operations
- Use `archived: true` instead of DELETE to preserve history

### Default Rate vs Applied Rate

- `defaultRate` is a suggestion/default value
- Actual applied rates in operations may differ
- Operations store their own rate data, not references to product defaults

### Unit Mismatches

- Products and operations may use different units
- API does **not** auto-convert units
- Client must handle unit conversion (e.g., gal/ac → L/ha)

### Density for Unit Conversion

- `density` enables conversions between volume/weight units
- Example: 28% UAN at 10.67 lb/gal allows gal/ac ↔ lb N/ac conversion
- Not all products have density defined

### Inactive Products

- Setting `active: false` hides product from dropdowns/pickers
- Inactive products still appear in historical operations
- Can reactivate by setting `active: true`

### Organization Scope

- Products are scoped to a single organization
- No sharing between organizations
- Users must recreate products in each org they manage

### Tank Mixes

- Individual products, not tank mixes, are stored in this API
- Tank mixes are defined at the operation level as arrays of products
- Each product in a tank mix has its own rate

### Case Sensitivity

- Product names are case-sensitive for exact matching
- Search/filtering may be case-insensitive depending on endpoint
- "Roundup PowerMAX" ≠ "roundup powermax"

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
| 204 | No Content (DELETE) |
| 400 | Invalid request (bad JSON, missing required field, invalid type) |
| 401 | Token expired or invalid |
| 403 | Insufficient permissions or org access not granted |
| 404 | Product or organization not found |
| 409 | Conflict (rare—typically on concurrent updates) |
| 429 | Rate limited |
| 500 | Server error |

---

## Common Use Cases

### Sync All Products for Organization

```
GET /organizations/{orgId}/products?recordFilter=all&itemLimit=100
```
Follow `nextPage` links for complete list.

### Find Products by Type

```
GET /organizations/{orgId}/products?type=seed&category=corn
```

### Create Seed Product with Default Rate

```json
POST /organizations/{orgId}/products
{
  "name": "P1093AM",
  "type": "seed",
  "category": "corn",
  "manufacturer": "Pioneer",
  "defaultRate": {
    "@type": "MeasurementAsDouble",
    "valueAsDouble": 32000,
    "unit": "seeds/ac"
  }
}
```

### Archive Product Instead of Delete

```json
PUT /organizations/{orgId}/products/{productId}
{
  "archived": true
}
```

---

## Related Endpoints

- [Fields](./fields.md) - Field metadata
- [Field Operations](./field-operations.md) - Operations that reference products
- [Boundaries](./boundaries.md) - Field geometry
- Work Plans - Planned operations with product prescriptions

