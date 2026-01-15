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

## Project Structure

```
snipkey/
├── src/
│   ├── app/              # App-level providers and layouts
│   ├── components/       # React components
│   │   └── ui/           # shadcn/ui base components
│   ├── lib/
│   │   ├── server/       # Server-side utilities (auth, middleware, db)
│   │   ├── hooks/        # Custom React hooks
│   │   └── auth/         # Client-side auth utilities
│   ├── routes/           # TanStack Start file-based routes
│   ├── server/           # TanStack Start server functions
│   └── styles/           # Global styles
├── shared/
│   └── src/
│       ├── db/           # Database schema and utilities
│       ├── template/     # Placeholder parsing and rendering
│       ├── types/        # Shared TypeScript types
│       └── validation/   # Zod schemas and validation limits
├── migrations/           # D1 database migrations
├── routes/               # Legacy routes directory (unused)
├── wrangler.json         # Cloudflare Workers configuration
├── biome.json            # Biome linting/formatting config
├── vite.config.ts        # Vite configuration
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
- `wrangler.json` - Cloudflare Workers config (D1 binding, env vars)
- `biome.json` - Code style rules
- `vite.config.ts` - Vite bundler config
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
bun run db:migrate   # Apply pending D1 migrations (local)
```

## Database Migrations

Use wrangler's built-in migration system to manage database changes:

```bash
# Create a new migration
bun run db:migration:create <name>

# List pending migrations
bun run db:migration:list

# Apply pending migrations (local)
bun run db:migrate

# Apply pending migrations (production)
wrangler d1 migrations apply snipkey-db --remote
```

**Always** create new migrations for schema changes. Never modify existing migrations.

## Environment Variables

Development uses defaults from `wrangler.json`:
- `RP_ID=localhost`
- `ORIGIN=http://localhost:5173`
- `CHALLENGE_TTL_MS=300000` (5 minutes)
- `SESSION_TTL_MS=604800000` (7 days)

**Production must update** `RP_ID` and `ORIGIN` in `wrangler.json`.

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

1. Update `wrangler.json` with production `database_id` and env vars
2. Run all migrations against production D1
3. Deploy with `wrangler deploy`

See `DEPLOYMENT.md` for detailed instructions.

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
