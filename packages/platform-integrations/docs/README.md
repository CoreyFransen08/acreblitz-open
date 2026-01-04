# Documentation

Welcome to the `@acreblitz/platform-integrations` documentation.

## Quick Navigation

### For Everyone
- [Getting Started](./guides/getting-started.md) - First-time setup and basic usage
- [Examples](./examples/README.md) - Working code examples

### For Beginners (Vibecoders)
- [Your First Integration](./guides/vibecoder-guide.md) - Step-by-step guide for AI-assisted developers
- [Understanding OAuth](./guides/oauth-explained.md) - OAuth concepts explained simply

### Unified Services (Provider-Agnostic)
- [Provider Adapter Architecture](./guides/provider-adapters.md) - How the multi-provider system works
- [Unified Services API](./api/services.md) - `listFields()`, `listBoundaries()`, etc.
- [Provider Registry](./api/provider-registry.md) - Adapter management

### Provider-Specific Reference
- [JohnDeereOAuth](./api/john-deere-oauth.md) - OAuth helper class
- [createJohnDeereClient](./api/john-deere-client.md) - API client factory
- [Types Reference](./api/types.md) - TypeScript type definitions

### Advanced Topics
- [Adding New Providers](./guides/adding-providers.md) - Step-by-step provider implementation guide
- [Error Handling](./guides/error-handling.md) - Working with errors
- [Token Management](./guides/token-management.md) - Best practices for token storage

## Package Overview

```
@acreblitz/platform-integrations
├── Unified Services        # Provider-agnostic field/boundary operations
│   ├── listFields()        # List fields with pagination & geometry
│   ├── getField()          # Get single field
│   ├── listBoundaries()    # List boundaries
│   └── getBoundary()       # Get single boundary
│
├── Provider Adapters       # Provider-specific implementations
│   ├── john-deere/         # John Deere adapter
│   └── climate-fieldview/  # (planned)
│
├── Provider Registry       # Adapter management
│   ├── getFieldAdapter()
│   └── getBoundaryAdapter()
│
├── John Deere Client       # Direct API access
│   ├── JohnDeereOAuth
│   └── createJohnDeereClient
│
└── Types & Constants       # TypeScript definitions
```

## Supported Platforms

| Platform | Status | Field Adapter | Boundary Adapter | Documentation |
|----------|--------|---------------|------------------|---------------|
| John Deere Operations Center | ✅ Supported | ✅ | ✅ | [Guide](./guides/getting-started.md) |
| Climate FieldView | 🔜 Planned | - | - | - |
| CNHi | 🔜 Planned | - | - | - |
| Trimble | 🔜 Planned | - | - | - |

## Quick Start

### Using Unified Services (Recommended)

```typescript
import { 
  createJohnDeereClient, 
  listFields 
} from '@acreblitz/platform-integrations';

// Create authenticated client
const client = await createJohnDeereClient({
  clientId: process.env.JD_CLIENT_ID!,
  clientSecret: process.env.JD_CLIENT_SECRET!,
  refreshToken: savedToken,
});

// Use unified services - works with any provider!
const fields = await listFields({
  context: { provider: 'john_deere', client },
  organizationId: 'org-123',
  geometry: { includeGeometry: true },
});

fields.data.forEach(field => {
  console.log(`${field.name}: ${field.area?.value} ${field.area?.unit}`);
});
```

## Need Help?

- Check the [Troubleshooting Guide](./guides/troubleshooting.md)
- Review [Common Issues](./guides/troubleshooting.md#common-issues)
- Look at the [Examples](./examples/README.md)

