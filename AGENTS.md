# Snipkey - AI Agent Instructions

This document contains project-specific rules and instructions for AI agents working on this codebase.

## Project Overview

**Snipkey** is a private snippet manager with placeholder support and inline editing. It's a full-stack TypeScript application deployed on Cloudflare Workers with D1 database.

- **Single-package repository** (no workspaces)
- **Runtime**: Bun
- **Framework**: TanStack Start (React SSR with file-based routing)
- **Database**: Cloudflare D1 (SQLite) via Kysely ORM
- **Authentication**: WebAuthn passkeys via SimpleWebAuthn
- **Styling**: Tailwind CSS + shadcn/ui components
- **Linting/Formatting**: Biome
- **React Compiler**: Enabled (automatic memoization via `babel-plugin-react-compiler`)
- **UI Components**: Prefer shadcn/ui components (`src/components/ui`) for new UI work

## Project Structure

```
snipkey/
├── src/
│   ├── components/       # React components
│   │   └── ui/           # shadcn/ui base components
│   ├── lib/
│   │   ├── auth/         # Client-side auth utilities
│   │   ├── constants/    # App constants
│   │   ├── hooks/        # Custom React hooks
│   │   └── server/       # Server-side utilities (auth, middleware, db)
│   ├── routes/           # TanStack Start file-based routes
│   ├── server/           # TanStack Start server functions
│   ├── styles/           # Global styles
│   ├── main.tsx          # App entry
│   ├── router.tsx        # Router setup
│   └── routeTree.gen.ts  # Route tree (generated)
├── shared/
│   └── src/
│       ├── db/           # Database schema and utilities
│       ├── template/     # Placeholder parsing and rendering
│       ├── types/        # Shared TypeScript types
│       ├── utils/        # Shared utilities
│       └── validation/   # Zod schemas and validation limits
├── migrations/           # D1 database migrations
├── wrangler.jsonc        # Cloudflare Workers configuration
├── worker-configuration.d.ts # Wrangler env type generation
├── worker-runtime.d.ts   # Wrangler runtime type generation
├── biome.json            # Biome linting/formatting config
├── vite.config.ts        # Vite configuration (includes React Compiler)
└── package.json          # Single package at root
```

## Code Style

**Always follow Biome configuration** - run `bun run check` before committing.

Key style rules:
- **Indentation**: Tabs, width 2
- **Line width**: 100 characters
- **Quotes**: Double quotes for strings/JSX
- **Semicolons**: Always
- **Trailing commas**: All
- **Arrow parentheses**: Always
- **Import type**: Use `import type` for type-only imports

## React Compiler Best Practices

**React Compiler is ENABLED** in this project via `babel-plugin-react-compiler` (see `vite.config.ts`).

The compiler automatically optimizes component rendering by memoizing values and preventing unnecessary re-renders.

### Core Principles

1. **Write simple, readable code** - The compiler handles performance optimizations
2. **Avoid manual memoization** - Don't use `useMemo`, `useCallback`, or `React.memo` unless absolutely necessary
3. **Treat components as pure functions** - Derive UI purely from props, state, and context
4. **Trust the compiler** - Focus on correctness and clarity, not render avoidance

### What NOT to Do (Pre-Compiler Patterns)

❌ **AVOID** - Defensive memoization for performance:
```typescript
// DON'T - Compiler handles this automatically
const value = useMemo(() => expensiveCalculation(data), [data])
const handleClick = useCallback(() => setState(false), [])
const Component = memo(function Component() { ... })
```

❌ **AVOID** - Storing derived state:
```typescript
// DON'T - Derive inline instead
const [filtered, setFiltered] = useState([])
useEffect(() => {
  setFiltered(items.filter(i => i.active))
}, [items])
```

### What TO Do (Post-Compiler Patterns)

✅ **DO** - Use plain JavaScript/TypeScript:
```typescript
// DO - Compiler auto-memoizes this
const value = expensiveCalculation(data)

// DO - Inline callbacks are fine
<Dialog open={open} onClose={() => setOpen(false)} />

// DO - Derive values inline during render
const filtered = items.filter(i => i.active)
const total = items.reduce((sum, i) => sum + i.price, 0)
```

### When Manual Memoization IS Allowed

Only use `useMemo`, `useCallback`, or `React.memo` when:

1. **Integrating with non-React systems** (event listeners, subscriptions, imperative APIs)
2. **Referential stability is required for correctness** (not performance) - e.g., effect dependencies
3. **Profiling shows a real bottleneck** AFTER compilation
4. **Interfacing with legacy systems** that require stable references

In these cases, **add a comment explaining why** memoization is necessary.

### Hooks Guidelines

- **`useState`**: Use for true local UI state. Prefer multiple small states over one large object.
- **`useEffect`**: Use only for effects (synchronizing with external world), not derivations
- **`useRef`**: Use for imperative handles and mutable values that don't affect rendering. Don't use as a memoization cache.

### Compiler Directives

- **`"use memo"`** - Explicitly opt-in to compilation (rarely needed in `infer` mode)
- **`"use no memo"`** - Explicitly opt-out (escape hatch for problematic components)

Never introduce directives automatically. Use `"use no memo"` only as a last resort with documentation.

### Data Flow

- **Lift state only when semantically necessary** (multiple components need coordination), not for performance
- **Use stable, semantic keys** for lists (avoid indices when items can be reordered)
- **Derive data, don't store it** - Compute derived values during render

### Code Style Expectations

- Prefer readability over cleverness
- Avoid defensive patterns from pre-compiler React
- Minimize hooks usage - use only for semantics, not performance
- Trust the compiler to optimize

## Architecture Patterns

### TanStack Start Server Functions

Server functions are defined in `src/server/` using `createServerFn`:

```typescript
import { createServerFn } from "@tanstack/start";
import { getDbFromEnv } from "~/lib/server/context";
import { authMiddleware } from "~/lib/server/middleware";

// Optional auth - returns null user if not authenticated
export const myFn = createServerFn({ method: "GET" }, async (_, ctx: ServerFnContext) => {
  // ctx.context.user is available (may be null)
}).middleware([authMiddleware]);

// Required auth - throws if not authenticated
export const protectedFn = createServerFn(
  { method: "POST" },
  async ({ data }, ctx: ServerFnContext) => {
    // ctx.context.user.id is guaranteed to exist
  },
).middleware([requireAuthMiddleware]);
```

**Critical patterns:**
- Use `getDbFromEnv()` to get database instance (works in both dev/prod)
- Use `authMiddleware` for optional auth, `requireAuthMiddleware` for required
- Server functions receive `(_, ctx)` - first arg is request data, second is context
- Set cookies using `createSessionCookie()` or `createClearedSessionCookie()`

### Authentication Flow

Authentication uses WebAuthn passkeys with server-side challenges:

1. **Registration**: `authRegisterStart` → `authRegisterFinish` (sets session cookie)
2. **Login**: `authLoginStart` → `authLoginFinish` (sets session cookie)
3. **Logout**: `authLogout` (clears session cookie)
4. **Get user**: `authMe` (returns current user or null)

**Never hardcode user IDs** - always use middleware to get authenticated user.

### Database Access

- Use Kysely query builder via `getDbFromEnv()`
- Database schema is defined in `shared/src/db/schema.ts`
- Type-safe queries - Kysely infers types from schema
- Use parameterized queries - never concatenate strings

Example:
```typescript
const db = getDbFromEnv();
const snippet = await db
  .selectFrom("snippets")
  .where("user_id", "=", userId)
  .where("id", "=", id)
  .executeTakeFirst();
```

### Placeholder System

Placeholders use `{{name:type}}` or `{{name:type=default}}` syntax:

- **Types**: `text`, `number`, `enum(option1,option2,...)`
- **Parsing**: `shared/src/template/parse.ts`
- **Rendering**: `shared/src/template/render.ts`
- **Validation**: `shared/src/validation/`

**Supported limits** (enforced in `shared/src/validation/limits.ts`):
- Max placeholders: 20
- Max tags: 10
- Max title length: 200 chars
- Max body length: 50,000 chars

## Important Files

### Configuration
- `wrangler.jsonc` - Cloudflare Workers config (D1 binding, env vars)
- `biome.json` - Code style rules
- `vite.config.ts` - Vite bundler config (includes React Compiler setup)
- `tsconfig.json` - TypeScript config

### Key Source Files
- `src/lib/server/context.ts` - Database initialization, cookie utilities
- `src/lib/server/auth.ts` - WebAuthn auth logic (registration/login/logout)
- `src/lib/server/middleware.ts` - Authentication middleware
- `src/lib/server/middleware-types.ts` - Middleware context types
- `src/lib/server/types.ts` - Server function types
- `shared/src/db/schema.ts` - Database schema definitions

## Development Commands

```bash
bun run dev          # Start dev server (http://localhost:5173)
bun run build        # Production build
bun run check        # Run Biome linter/formatter (fixes issues)
bun run typecheck    # TypeScript type checking
bun run lint         # Biome lint only
bun run format       # Biome format only
bun run db:migrate   # Apply pending D1 migrations (wrangler default target)
bun run generate     # Regenerate Wrangler type definitions
```

## Database Migrations

Use wrangler's built-in migration system to manage database changes:

```bash
# Create a new migration
bun run db:migration:create <name>

# List pending migrations
bun run db:migration:list

# Apply pending migrations (wrangler default target)
bun run db:migrate

# Apply pending migrations (production)
wrangler d1 migrations apply snipkey-db --remote
```

**Always** create new migrations for schema changes. Never modify existing migrations.

## Environment Variables

Development uses defaults from `wrangler.jsonc`:
- `RP_ID=localhost`
- `ORIGIN=http://localhost:5173`
- `CHALLENGE_TTL_MS=300000` (5 minutes)
- `SESSION_TTL_MS=604800000` (7 days)

**Production must update** `RP_ID` and `ORIGIN` in `wrangler.jsonc`.

## Common Tasks

### Adding a new server function
1. Create function in `src/server/` with `createServerFn`
2. Add appropriate middleware (`authMiddleware` or `requireAuthMiddleware`)
3. Use `getDbFromEnv()` for database access
4. Return typed data or `Response` with headers

### Adding a new route
1. Create file in `src/routes/` following TanStack Start conventions
2. Use file-based routing: `index.tsx`, `login.tsx`, `snippets.$id.tsx`
3. Server loaders use `createServerFn` with middleware

### Adding validation
1. Define schema in `shared/src/validation/schemas.ts`
2. Add limits to `shared/src/validation/limits.ts`
3. Use Zod for runtime validation

### Adding a database migration
1. Run `bun run db:migration:create <description>` to create a new migration file
2. Edit the generated file in `migrations/` with your SQL (D1/SQLite syntax)
3. Run `bun run db:migrate` to apply locally
4. Run `wrangler d1 migrations apply snipkey-db --remote` for production

## Deployment

1. Update `wrangler.jsonc` with production `database_id` and env vars
2. Run all migrations against production D1
3. Deploy with `wrangler deploy`

See `README.md` for detailed instructions.

## Security Rules

- **Never** trust client input - always validate with Zod schemas
- **Never** expose database errors to clients - return generic errors
- **Always** use middleware for authentication - never trust request data
- **Never** hardcode credentials or API keys
- **Always** use parameterized queries - prevent SQL injection
- **Never** expose session IDs or challenge IDs in error messages

## Testing

Tests are not currently set up. When adding tests:
- Use Bun test runner
- Test server functions with mocked `getDbFromEnv()`
- Test authentication flows with mocked WebAuthn
- Test placeholder parsing/rendering edge cases
