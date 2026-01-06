# Next.js Best Practices

This document defines declarative best practices for Claude when working with Next.js applications. 

---

## Caching Strategy

- Use TanStack React Query for all server state management
- Configure global stale times based on data volatility:
  - Static reference data: 30-minute staleTime
  - User-specific data (fields, settings): 5-minute staleTime with conditional refetch
  - Frequently changing data (processing status): 5-second polling intervals
- Disable `refetchOnWindowFocus` globally to reduce unnecessary network calls
- Set `retry: 1` as default for failed queries
- Use `gcTime` (formerly cacheTime) of 5 minutes for garbage collection
- Always include user/company identifiers in query keys for proper cache isolation
- Use `queryClient.invalidateQueries()` after mutations, never manual cache updates

---

## React Query Patterns (Critical)

Data fetching is simple. Async state management is not. React Query handles race conditions, caching, deduplication, and background updates automatically.

### Never Use useEffect for Data Fetching

useEffect + fetch has five hidden bugs:
1. **Race conditions** - Responses arrive out of order when dependencies change
2. **No loading state** - Users see nothing while requests are pending
3. **Empty state confusion** - Cannot distinguish "loading" from "no data"
4. **Stale error states** - Old errors persist after new requests
5. **StrictMode double-fire** - Duplicate requests in development

### Query Keys as Dependencies

Treat query keys like useEffect dependency arrays. Include all variables used in queryFn:

```typescript
// Query automatically refetches when category changes
const { data } = useQuery({
  queryKey: ['bookmarks', category, filters],
  queryFn: () => fetchBookmarks(category, filters),
});
```

### Always Wrap useQuery in Custom Hooks

Never use useQuery directly in components. Custom hooks provide:
- Separation of concerns
- Co-located query keys
- Centralized configuration changes
- Reusability across components

```typescript
// hooks/useFields.ts
export function useFields(companyId: number) {
  return useQuery({
    queryKey: ['fields', companyId],
    queryFn: () => getFields(companyId),
    enabled: !!companyId,
  });
}
```

### The enabled Option

Use `enabled` to control when queries run:
- Dependent queries (wait for parent query)
- User input required before fetching
- Pause queries during modals
- Disable when local state takes precedence

### Data Transformations

Use the `select` option for transformations (not queryFn):
- Only runs when data exists
- Enables partial subscriptions
- Components only re-render when selected data changes

```typescript
const { data: completedTodos } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  select: (data) => data.filter(todo => todo.completed),
});
```

### Mutations

- useQuery is declarative (runs automatically)
- useMutation is imperative (you call it explicitly)
- Use `mutate()` not `mutateAsync()` unless chaining promises
- Invalidate queries after mutations; don't manually update cache
- Place query logic (invalidation) in useMutation callbacks
- Place UI logic (toasts, redirects) in mutate() callbacks

### Error Handling

- Configure global error handler on QueryCache for toast notifications
- Use `throwOnError: true` to propagate errors to Error Boundaries
- Distinguish 4xx (handle locally) from 5xx (Error Boundary)

```typescript
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => toast.error(error.message),
  }),
});
```

### Forms with Server Data

- Use `staleTime: Infinity` for form initial data to prevent unwanted refetches
- Split form into separate component that receives data as props
- Reset form state after successful mutation so server state takes over
- Disable submit button during mutation with `isPending`

### Optimistic Updates

Use sparingly and only for:
- Toggle buttons
- Simple state changes where failure is rare

Avoid for:
- Complex operations
- Dialogs that close on submission
- Sorted lists or concurrent user scenarios

---

## Data Fetching

- Never fetch data directly in components; use service layer functions
- Create a centralized service layer at `/lib/services/` for all API calls
- Use typed generic fetch utilities for consistent error handling
- In Next.js App Router, prefer Server Components for initial data fetching
- Use React Query only in Client Components for dynamic/interactive data
- For Server Components, use `fetch` with Next.js caching options
- Always type API responses using generated database types

## UI Libraries

- Use shadcn/ui as the primary component library (New York variant)
- Use Radix UI primitives for accessible, unstyled base components
- Use Tailwind CSS for all styling; avoid inline styles and CSS modules
- Use Lucide React for icons; maintain consistent icon sizing
- Use the `cn()` utility from `/lib/utils` for conditional class merging
- Install new shadcn components via CLI: `npx shadcn-ui@latest add [component]`

## Tailwind CSS

- Avoid custom CSS unless absolutely necessary; prefer utility classes
- Use mobile-first responsive design: base styles for mobile, `md:` `lg:` for larger screens
- Define design tokens (colors, spacing, fonts) in `tailwind.config.js`, not as arbitrary values
- Use CSS variables for theme colors to support light/dark mode
- Maintain consistent class ordering: layout → spacing → sizing → typography → colors → effects
- Use `cn()` from `/lib/utils` for conditional and merged classes
- Prefer semantic color names (`bg-primary`, `text-muted-foreground`) over raw colors (`bg-blue-500`)
- Extract repeated class patterns into reusable components, not `@apply` directives
- Use `@apply` sparingly; only for base element styles that can't be componentized
- Keep class strings readable; break long class lists across multiple lines
- Use Tailwind's built-in animations and transitions; avoid custom keyframes
- Leverage `group` and `peer` modifiers for parent/sibling state styling

## Component Architecture

- Use named exports only; never use default exports
- Use React.forwardRef for all base UI components
- Set displayName for all forwardRef components
- Follow atomic design: atoms (ui/), molecules (components/), organisms (features/)
- Keep components focused; extract logic into custom hooks
- Place page-specific components in feature folders, not global components
- Minimize `use client` directives; favor React Server Components
- Minimize `useEffect` and `useState`; prefer server-side data fetching
- Wrap client components in `<Suspense>` with lightweight fallbacks
- Use `next/dynamic` for non-critical components with `ssr: false` for client-only

## Component Design Principles

- Prioritize reusability: build components that work in multiple contexts
- Keep components single-purpose; split when handling multiple concerns
- Accept `className` prop on all components for style extensibility
- Use composition over configuration; prefer children and slots over many props
- Provide sensible defaults; make common use cases require minimal props
- Define explicit TypeScript interfaces for all props; avoid inline types
- Use discriminated unions for components with variant behaviors
- Document complex props with JSDoc comments
- Ensure keyboard navigation and screen reader support (a11y)
- Use semantic HTML elements (`button`, `nav`, `article`) over generic `div`
- Colocate component, types, and tests in same directory when possible

## Naming Conventions

- Use descriptive names with auxiliary verbs: `isLoading`, `hasError`, `canSubmit`
- Prefix event handlers with `handle`: `handleClick`, `handleSubmit`, `handleChange`
- Prefix boolean props with `is`, `has`, `should`: `isDisabled`, `hasItems`
- Use `const` arrow functions with explicit types
- Name files in kebab-case; name components in PascalCase
- Name hooks with `use` prefix: `useFields`, `useAuth`

## Modals and Dialogs

- Use a centralized ModalContext for modal state management
- Open modals via `openModal(Component, props)` pattern
- Modals receive `onClose` prop automatically from context
- Support modal stacking with unique IDs
- Use Radix Dialog primitives as the base for all modals
- Never manage modal state locally in components

## Z-Index Management

- Use CSS variables for z-index values in a central location
- Follow this hierarchy:
  - Base content: auto/0
  - Sticky headers: 50
  - Dropdowns/Tooltips: 100
  - Modal overlay: 9999
  - Modal content: 10000
  - Popovers inside modals: 10001
- Apply z-index overrides via global CSS targeting Radix data attributes
- Never use arbitrary z-index values inline

## State Management

- Use React Context for global app state (auth, permissions, theme)
- Memoize all context values with `useMemo`
- Wrap all context mutations with `useCallback`
- Use `useRef` to prevent duplicate fetches in effects
- Keep local component state minimal; prefer derived state
- For complex forms, use react-hook-form with zod validation

## Type Safety

- Never use `as any` in application code
- Avoid `as unknown` unless bridging external library types
- Use generated Supabase types from `supabase gen types typescript` when using supabase
- Define explicit interfaces for all component props
- Use discriminated unions for state that can be in multiple states
- Type all function parameters and return values explicitly
- Use type guards instead of type assertions where possible

## Security

- Validate all user input with zod schemas; never trust client data
- Sanitize data before rendering to prevent XSS attacks
- Use CSRF tokens for state-changing operations
- For authentication and user input handling, conduct a security review:
  - Identify potential vulnerabilities
  - Implement mitigation strategies
  - Reference OWASP guidelines when applicable
- Use secure defaults (httpOnly cookies, secure headers)
- Never use `eval()`, `dangerouslySetInnerHTML`, or similar unsafe patterns
- Store secrets in environment variables; never commit to repository
- Always verify .gitignore covers all .env files (.env.local, .env.development, etc.)
- Validate environment variables at startup; fail fast if missing

## Error Handling

- Use try-catch in service layer functions, not components
- Log errors via centralized logger that respects environment
- Show user-friendly error messages via toast notifications
- Never expose stack traces or internal errors to users
- Handle loading and error states explicitly in UI
- Always handle edge cases: empty states, network failures, timeouts
- Provide fallback UI for error states; never show blank screens
- Integrate error monitoring (Sentry) for production environments

## Routing (App Router)

- Use file-based routing conventions
- Place route handlers in `app/api/` directory
- Use route groups `(group)` to organize without affecting URL
- Protect routes via middleware, not component checks
- Use `generateMetadata` for SEO in page files
- Prefer parallel routes for complex layouts

## Performance

- Use `React.lazy` and `Suspense` for code splitting
- Memoize expensive computations with `useMemo`
- Memoize callback functions with `useCallback`
- Use `React.memo` for components that receive stable props
- Use Next.js Image component with WebP format, explicit sizes, and `loading="lazy"`
- Implement pagination for lists over 50 items
- Use virtual scrolling for lists over 100 items
- Analyze bundle size with `@next/bundle-analyzer`; keep bundles small
- Measure performance with Lighthouse; address critical issues
- Minimize re-renders by lifting state up or using context selectively

## Code Readability

- Use early returns to reduce nesting and improve readability
- Keep functions small and focused; extract helper functions when needed
- Write self-documenting code; add comments only for non-obvious logic
- Use Tailwind CSS mobile-first; avoid inline styles unless justified

## Import Organization

1. React and Next.js imports
2. External library imports
3. Internal modules (contexts, services)
4. Components
5. Hooks
6. Utils
7. Types
8. Styles/CSS

## Dependency Management

- Before recommending a new npm package, verify it is actively maintained
- Check the package's last publish date on npm (reject packages not updated in 2+ years)
- Review the GitHub repository for open issues, recent commits, and maintainer activity
- Prefer packages with TypeScript support built-in
- Check weekly download counts as a signal of community adoption
- When suggesting a package, run `npm view [package] time.modified` to check last update
- If maintenance status is uncertain, ask the user to verify before proceeding
- Avoid packages with known security vulnerabilities (check npm audit)
- Prefer well-established packages over newer alternatives unless there's a clear benefit

## Post-Implementation Verification

- After completing any implementation, run a full build to catch errors: `npm run build`
- Run TypeScript type checking separately if build doesn't include it: `npx tsc --noEmit`
- Fix all type errors and build warnings before considering work complete
- Never skip this step; type errors caught early prevent runtime failures
- If build fails, resolve all errors before moving to the next task

## When Uncertain

- If no clear solution exists, state: "No definitive solution is available" and explain trade-offs
- If missing context, ask for clarification before proceeding
- Reference specific files when asking for context
- Suggest next steps or documentation to consult
- Never guess at implementation details for critical features like auth or payments
