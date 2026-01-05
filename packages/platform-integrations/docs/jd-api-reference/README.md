# John Deere API Reference

This directory contains reference documentation for John Deere Operations Center API endpoints. These docs serve as a quick reference for the underlying API that our `@acreblitz/platform-integrations` package wraps.

## Purpose

- **Quick reference** for request/response schemas
- **Edge cases & gotchas** discovered through implementation
- **Mapping** between JD API and our wrapper methods

## Endpoints

| Endpoint | Doc | Our Wrapper |
|----------|-----|-------------|
| [Fields](./fields.md) | ✅ | `client.fields.list()`, `client.fields.get()` |
| [Boundaries](./boundaries.md) | ✅ | `client.boundaries.*` |
| [Field Operations](./field-operations.md) | ✅ | `client.operations.*` |
| [Products](./products.md) | ✅ | `client.products.*` |
| [Equipment](./equipment.md) | ✅ | `client.equipment.*` |
| Organizations | 🔜 | `client.organizations.*` |
| [Work Plans](./work-plans.md) | ✅ | `client.workPlans.*` |

## Base URLs

> ⚠️ John Deere APIs use **different base URLs** depending on the endpoint:

| API | Base URL |
|-----|----------|
| Fields, Boundaries, Operations, Products, Organizations | `https://partnerapi.deere.com` |
| Equipment | `https://equipmentapi.deere.com/isg` |

Authentication tokens work across both domains.

## Common Patterns

### Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer {access_token}
```

### Content Type
John Deere uses a custom media type:
```
Accept: application/vnd.deere.axiom.v3+json
Content-Type: application/json
```

### HATEOAS Navigation
JD API uses hypermedia links for navigation. **Always use `links` to discover URLs**—never hardcode paths beyond the base endpoint.

```json
{
  "links": [
    { "rel": "self", "uri": "..." },
    { "rel": "nextPage", "uri": "..." },
    { "rel": "boundaries", "uri": "..." }
  ]
}
```

### Pagination
All list endpoints return paginated responses:
```json
{
  "total": 150,
  "values": [...],
  "links": [
    { "rel": "nextPage", "uri": "..." }
  ]
}
```

Our wrapper handles pagination automatically via `fetchAllPages()`.

## Official Documentation

- [John Deere Developer Portal](https://developer.deere.com)
- [API Reference](https://developer.deere.com/dev-docs)
- [OAuth Guide](https://developer.deere.com/dev-docs/authentication)

