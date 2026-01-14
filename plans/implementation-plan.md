# Implementation Plan: Snippet Manager (TanStack Start + Workers + D1 + Kysely + Passkeys + Tailwind + shadcn/ui + Bun + Biome)

## Goals
- Multi-user, private-only snippet vault for text snippets (e.g., prompts)
- Mobile-first UX with one-tap copy of rendered prompt
- Placeholder syntax: text, number, enum with optional default
- Inline placeholder editing (tap placeholders inside the text)
- Cloudflare D1 as the only persistence layer
- Passkeys (WebAuthn) authentication
- Typed API surface: TanStack Start server functions only
- Styling/UI: Tailwind CSS + shadcn/ui
- Tooling: Bun + Biome

## Non-goals
- Sharing/public links/team workspaces
- Extra infra beyond Workers + D1 (no KV, DO, R2)
- REST API endpoints
- Manual testing tasks or time estimates

---

## Stack
- Framework: TanStack Start (Router + Server Functions)
- Deploy target: Cloudflare Workers
- DB: Cloudflare D1 (SQLite)
- Query builder: Kysely + kysely-d1 dialect
- Auth: WebAuthn/passkeys via SimpleWebAuthn (server + browser)
- Validation: Zod
- Styling: Tailwind CSS
- Components: shadcn/ui (Radix)
- Tooling: Bun
- Lint/format: Biome

---

## Repo Layout
- `apps/web/` (TanStack Start app; routes + server functions)
- `packages/shared/` (placeholder parser/renderer, shared types, utilities)
- `migrations/` (D1 SQL migrations)

---

## Code Quality: Biome (mandatory)

### Biome Setup
- Add Biome config at repo root:
  - enable formatting + linting
  - enforce import sorting
  - prefer explicit return types only where helpful (do not over-annotate)
  - consistent quote style + trailing commas
- Add scripts (Bun):
  - `lint`: `biome lint .`
  - `format`: `biome format . --write`
  - `check`: `biome check . --write` (format + lint autofix)
- CI expectation: `biome check .` must pass before deploy

### Conventions
- No ESLint/Prettier (Biome only)
- Use `tsconfig` strict mode
- Keep shared code pure (no Worker globals) in `packages/shared`

---

## D1 Schema

### Tables
1) `users`
- `id` TEXT PRIMARY KEY
- `created_at` INTEGER NOT NULL

2) `webauthn_credentials`
- `credential_id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL
- `public_key` TEXT NOT NULL
- `counter` INTEGER NOT NULL
- `transports` TEXT NOT NULL  -- JSON array
- `created_at` INTEGER NOT NULL

3) `auth_challenges`
- `id` TEXT PRIMARY KEY
- `challenge` TEXT NOT NULL
- `type` TEXT NOT NULL        -- 'registration' | 'authentication'
- `user_id` TEXT NULL
- `expires_at` INTEGER NOT NULL
- `created_at` INTEGER NOT NULL

4) `sessions`
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL
- `created_at` INTEGER NOT NULL
- `expires_at` INTEGER NOT NULL
- `revoked_at` INTEGER NULL

5) `snippets`
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL
- `title` TEXT NOT NULL
- `body` TEXT NOT NULL
- `tags` TEXT NOT NULL         -- JSON array
- `created_at` INTEGER NOT NULL
- `updated_at` INTEGER NOT NULL

### Indexes
- `snippets_user_updated` on `(user_id, updated_at DESC)`
- `creds_user` on `(user_id)`
- `sessions_user_expires` on `(user_id, expires_at)`
- `challenges_expires` on `(expires_at)`

### Migration Rules
- SQL migrations applied sequentially
- IDs generated in app (UUID)
- Tags stored as JSON array string with helper parse/serialize

---

## Kysely Integration (D1)

### Types
- Define `Database` interface mapping tables to row types
- Store `tags` as string at DB layer, transform to `string[]` at domain boundary

### DB Factory
- `getDb(env): Kysely<Database>`
  - `new Kysely({ dialect: new D1Dialect({ database: env.DB }) })`
- Provide helpers:
  - `nowMs()`
  - `newId()` (UUIDv4)
  - `parseJsonArray(str)` -> `string[]` with safe fallback
  - `stringifyJsonArray(arr)` -> string

---

## Auth (Passkeys) + Sessions

### Config
- Env vars:
  - `RP_ID` (eTLD+1)
  - `ORIGIN` (exact https origin)
  - `CHALLENGE_TTL_MS`
  - `SESSION_TTL_MS`
- Store challenge + session expiry in DB

### Cookies
- Cookie name: `session`
- Attributes: `HttpOnly; Secure; SameSite=Lax; Path=/`

### Server Functions (Auth)
Return typed unions:
- `{ ok: true, data: ... }`
- `{ ok: false, error: { code, message, details? } }`

1) `authRegisterStart()`
- create user row
- generate WebAuthn registration options (discoverable)
- insert challenge row (type=registration)
- return `{ options, challengeId }`

2) `authRegisterFinish({ attestation, challengeId })`
- load challenge row; reject expired/type mismatch
- verify attestation (RP_ID + ORIGIN)
- insert credential row; delete challenge
- create session row; set cookie
- return `{ ok: true }`

3) `authLoginStart()`
- generate WebAuthn authentication options (discoverable)
- insert challenge row (type=authentication)
- return `{ options, challengeId }`

4) `authLoginFinish({ assertion, challengeId })`
- load challenge; verify assertion
- lookup credential -> user
- update counter
- create session; set cookie
- delete challenge
- return `{ ok: true }`

5) `authLogout()`
- revoke session if present
- clear cookie
- return `{ ok: true }`

### Session Helper
- `requireUser(ctx)`:
  - read cookie
  - query `sessions` for valid session
  - return `userId` or AUTH_REQUIRED

### Cleanup
- Opportunistic cleanup on auth calls:
  - delete expired `auth_challenges`
  - optionally delete expired sessions for the current user

---

## Snippets: Server Functions

### Validation (Zod)
- `title`: trimmed, min 1, max N
- `body`: max M
- `tags`: normalize trim + lowercase; drop empty; dedupe; cap K
- enforce max placeholder count per snippet

### Server Functions (Snippets)
1) `snippetsList({ query?, tag?, cursor?, limit? })`
- requireUser
- filter user_id
- optional query: LIKE on title/body
- optional tag: conservative LIKE match in JSON string
- order updated_at desc, id desc
- cursor pagination on (updated_at, id)
- return `{ items, nextCursor? }`

2) `snippetGet({ id })`
- requireUser
- select by id + user_id
- return snippet or NOT_FOUND

3) `snippetCreate({ title, body, tags })`
- requireUser
- insert new row
- return `{ id }`

4) `snippetUpdate({ id, title, body, tags })`
- requireUser
- update by id + user_id, set updated_at
- return `{ ok: true }`

5) `snippetDelete({ id })`
- requireUser
- delete by id + user_id
- return `{ ok: true }`

---

## Placeholder System (Inline Editing)

### Syntax (ASCII)
- Text:   `{{name:text}}` or `{{name:text=Default}}`
- Number: `{{age:number}}` or `{{age:number=30}}`
- Enum:   `{{tone:enum(formal,casual)=casual}}`

### Parser (Shared)
`parseTemplate(body)` -> `{ segments, placeholders, errors }`
- `segments`:
  - `{ kind: "text", value }`
  - `{ kind: "ph", name, phType, options?, default?, raw, start, end }`
- `placeholders`: deduped by name but ordered by first appearance
- `errors`: include spans for editor highlighting

### Renderer (Shared)
`renderTemplate(segments, valuesByName)` -> `{ rendered, errors? }`
- uses `valuesByName[name] ?? default ?? ""`
- validates number parse and enum membership

---

## UI (Tailwind + shadcn/ui)

### Setup
- Tailwind configured in app
- shadcn/ui components added:
  - Button, Input, Textarea, Badge, Popover, Sheet, Dialog, Toast/Sonner

### Routes
- `/login`
- `/` snippet list
- `/snippets/new`
- `/snippets/:id` detail
- `/snippets/:id/edit`

### Inline Placeholder Editing
- Render parsed body into inline flow:
  - text normal
  - placeholders as tappable chips (Badge)
- Tap chip opens:
  - Popover (desktop) or Sheet (mobile)
- Controls:
  - text -> Input/Textarea
  - number -> numeric input + validation
  - enum -> select/radio
- Values stored per snippet in state keyed by placeholder name
- Optional localStorage persistence keyed by snippet id

### Copy
- On copy:
  - render with renderer
  - if errors: show toast, do not copy
  - else clipboard write + success toast

### Editor
- Live parse body; show parse errors
- Tags as chips with add/remove, normalized

---

## TanStack Start Integration

### Server Env + Cookies
- Central server utility to access:
  - Workers env (D1 binding)
  - request headers/cookies
  - response cookie setting

### Typed Errors
- Standard error codes:
  - AUTH_REQUIRED
  - NOT_FOUND
  - VALIDATION_ERROR
  - INTERNAL
- No raw stack traces returned

### Data Caching
- Use TanStack Query where appropriate; invalidate caches on mutations

---

## Tooling (Bun)

### Scripts
- `dev`: run Start dev server
- `build`: production build
- `typecheck`: tsc
- `check`: `biome check . --write`

### Policy
- Biome is the only formatter/linter
- Strict TS mode enabled

---

## Deployment (Workers)
- Bind D1 as `DB`
- Env vars: RP_ID, ORIGIN, TTLs
- Pin Workers compatibility date
- Enable nodejs_compat only if required by WebAuthn library dependencies

---

## Implementation Order
1) Scaffold TanStack Start app using Bun
2) Add Tailwind CSS
3) Add shadcn/ui + core components
4) Add Biome config + scripts; remove eslint/prettier if present
5) Add D1 migrations + wrangler binding
6) Implement Kysely db factory + typed Database interface
7) Implement cookie + session utilities
8) Implement passkey server functions (register/login/logout)
9) Implement snippet server functions (CRUD + list)
10) Implement placeholder parser/renderer in shared package
11) Build UI routes + inline placeholder editing + copy
12) Add guards for unauthenticated routes
13) Hardening: limits, cleanup, structured errors

---

## Done Criteria
- Passkey register/login establishes session cookie and persists across reloads
- Snippets are private per user; cross-user access blocked
- Snippet list supports tag filters + search
- Inline placeholder editing works on mobile and desktop
- Copy produces rendered text with defaults, enforcing number/enum validity
- UI uses Tailwind + shadcn/ui consistently
- All backend actions use TanStack Start server functions only
- D1 is the only persistence layer
- `biome check .` passes for the repo
