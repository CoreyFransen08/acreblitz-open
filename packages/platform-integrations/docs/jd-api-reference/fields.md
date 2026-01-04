# John Deere Fields API

> Reference: [developer.deere.com/dev-docs/fields](https://developer.deere.com/dev-docs/fields)

## Overview

Fields represent agricultural land units within an organization. Fields are scoped to organizations and can contain multiple boundaries.

**Required Scopes:** `ag1` (view), `ag3` (create/update/delete)

---

## Endpoints

### List Fields

```
GET /organizations/{orgId}/fields
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `recordFilter` | string | `active` | Filter: `active`, `archived`, or `all` |

**Response:** `200 OK`

```json
{
  "links": [
    { "rel": "self", "uri": "https://api.deere.com/platform/organizations/{orgId}/fields" },
    { "rel": "nextPage", "uri": "https://api.deere.com/platform/organizations/{orgId}/fields?start=10" }
  ],
  "total": 150,
  "values": [
    {
      "@type": "Field",
      "id": "12345678-abcd-1234-abcd-123456789abc",
      "name": "North Field",
      "archived": false,
      "links": [
        { "rel": "self", "uri": "..." },
        { "rel": "clients", "uri": "..." },
        { "rel": "farms", "uri": "..." },
        { "rel": "boundaries", "uri": "..." },
        { "rel": "owningOrganization", "uri": "..." }
      ]
    }
  ]
}
```

---

### Get Field

```
GET /organizations/{orgId}/fields/{fieldId}
```

**Response:** `200 OK`

```json
{
  "@type": "Field",
  "id": "12345678-abcd-1234-abcd-123456789abc",
  "name": "North Field",
  "archived": false,
  "links": [
    { "rel": "self", "uri": "..." },
    { "rel": "clients", "uri": "..." },
    { "rel": "farms", "uri": "..." },
    { "rel": "boundaries", "uri": "..." },
    { "rel": "owningOrganization", "uri": "..." }
  ]
}
```

---

### Create Field

```
POST /organizations/{orgId}/fields
```

**Request Body:**

```json
{
  "name": "South Field",
  "links": [
    {
      "@type": "Link",
      "rel": "farms",
      "uri": "https://api.deere.com/platform/organizations/{orgId}/farms/{farmId}"
    }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Field name (max 100 chars) |
| `links[rel=farms]` | Yes | Reference to parent farm |

**Response:** `201 Created` with `Location` header

---

### Update Field

```
PUT /organizations/{orgId}/fields/{fieldId}
```

**Request Body:**

```json
{
  "name": "Updated Field Name",
  "archived": false
}
```

**Response:** `200 OK`

---

### Delete Field

```
DELETE /organizations/{orgId}/fields/{fieldId}
```

**Response:** `204 No Content`

---

## Response Schema

### Field Object

| Property | Type | Description |
|----------|------|-------------|
| `@type` | string | Always `"Field"` |
| `id` | string | UUID identifier |
| `name` | string | Field name |
| `archived` | boolean | Soft-delete status |
| `links` | ApiLink[] | HATEOAS navigation |

### Common Link Relations

| `rel` | Description |
|-------|-------------|
| `self` | This field resource |
| `boundaries` | Field boundaries collection |
| `farms` | Parent farm |
| `clients` | Associated client |
| `owningOrganization` | Parent organization |
| `operations` | Field operations |

---

## Edge Cases & Gotchas

### Pagination
- Default page size varies (typically 10-50 items)
- Use `links[rel=nextPage]` to iterate—**do not manually construct pagination URLs**
- Empty `values` array with no `nextPage` link = end of results

### Archived Records
- Default `recordFilter=active` excludes archived fields
- Archived fields retain their boundaries and operations
- Use `recordFilter=all` when syncing to ensure complete data

### Farm Association
- **Creating a field requires a valid farm link**
- The farm must exist and belong to the same organization
- Fields cannot be moved between farms after creation

### Permissions
- 403 returned if org hasn't granted your app access (connections flow incomplete)
- Fields may exist but return 403 if user lacks org-level permission

### Name Constraints
- Max 100 characters
- Duplicate names allowed within same org (identified by UUID)
- Empty/whitespace-only names rejected

### Deletion Behavior
- Deleting a field **does not** delete its boundaries or operations
- Operations become orphaned but remain accessible via operations endpoints
- Consider archiving instead of deleting for data integrity

### HATEOAS Links
- Always use `links` for navigation—URL structure may change
- Missing `rel` in `links` array means that action isn't available
- Example: No `boundaries` link = field has no boundaries yet

---

## Headers

**Request:**
```
Authorization: Bearer {access_token}
Accept: application/vnd.deere.axiom.v3+json
Content-Type: application/json
```

**Response:**
```
Content-Type: application/vnd.deere.axiom.v3+json
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Invalid request (bad JSON, missing required field) |
| 401 | Token expired or invalid |
| 403 | Insufficient permissions or org access not granted |
| 404 | Field or organization not found |
| 409 | Conflict (e.g., duplicate operation in progress) |
| 429 | Rate limited |
| 500 | Server error |

---

## Rate Limits

- **Standard:** 120 requests/minute per access token
- **Burst:** Short bursts above limit may be allowed
- Use exponential backoff on 429 responses
- Consider caching field lists—they change infrequently

