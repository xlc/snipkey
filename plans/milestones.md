# Project Milestones: Snippet Manager

## Overview
This document breaks down the implementation plan into actionable milestones. Each milestone represents a significant checkpoint with clear deliverables.

---

## Milestone 1: Foundation & Tooling Setup
**Goal:** Set up project structure, tooling, and basic TanStack Start app

### Tasks
1. Create monorepo structure (`apps/web/`, `packages/shared/`, `migrations/`)
2. Scaffold TanStack Start app in `apps/web/`
3. Configure and install Biome (formatter + linter)
4. Remove ESLint/Prettier configs if present
5. Set up TypeScript strict mode
6. Configure Bun scripts (dev, build, typecheck, lint, format, check)
7. Create initial directory structure for shared package

### Deliverables
- [ ] Monorepo structure in place
- [ ] TanStack Start app running locally via `bun run dev`
- [ ] `biome.json` config at repo root
- [ ] All scripts working (check, lint, format, typecheck)
- [ ] `biome check .` passes with no errors

### Validation
```bash
# Run these commands successfully
bun run dev           # Start dev server
bun run check         # Format + lint
bun run typecheck     # TypeScript compilation
```

---

## Milestone 2: UI Foundation (Tailwind + shadcn/ui)
**Goal:** Set up styling system and core UI components

### Tasks
1. Install and configure Tailwind CSS
2. Set up shadcn/ui initialization
3. Install core shadcn/ui components:
   - Button
   - Input
   - Textarea
   - Badge
   - Popover
   - Sheet
   - Dialog
   - Toast/Sonner
4. Create basic layout shell
5. Set up theme configuration

### Deliverables
- [ ] Tailwind configured and working
- [ ] shadcn/ui components installed in `apps/web/src/components/ui/`
- [ ] Basic app layout component created
- [ ] Theme system configured
- [ ] Sample component rendered to verify setup

### Validation
- Visual confirmation of Tailwind classes working
- shadcn/ui components render correctly in browser

---

## Milestone 3: Database Layer (D1 + Kysely)
**Goal:** Set up Cloudflare D1, migrations, and type-safe database access

### Tasks
1. Create all D1 migration files in `migrations/`:
   - `001_users.sql`
   - `002_webauthn_credentials.sql`
   - `003_auth_challenges.sql`
   - `004_sessions.sql`
   - `005_snippets.sql`
   - `006_indexes.sql`
2. Set up Wrangler with D1 database binding
3. Install Kysely and kysely-d1 dialect
4. Create `Database` interface in `packages/shared/db/`
5. Implement `getDb()` factory function
6. Implement DB helper utilities:
   - `nowMs()`
   - `newId()` (UUIDv4)
   - `parseJsonArray()`
   - `stringifyJsonArray()`
7. Test D1 connection locally

### Deliverables
- [ ] All migration files created
- [ ] `wrangler.toml` configured with D1 binding
- [ ] Migrations can be applied via Wrangler
- [ ] `packages/shared/db/database.ts` with Database interface
- [ ] `packages/shared/db/db.ts` with getDb factory
- [ ] Helper utilities tested and working

### Validation
```bash
# Apply migrations locally
wrangler d1 execute DB --local --file=migrations/*.sql

# Verify tables created
wrangler d1 execute DB --local --command="SELECT name FROM sqlite_master WHERE type='table'"
```

---

## Milestone 4: Shared Package Structure
**Goal:** Set up shared code architecture (placeholder system, types, utilities)

### Tasks
1. Set up `packages/shared/` as a workspace package
2. Create package structure:
   - `db/` - Database types and factory
   - `template/` - Placeholder parser/renderer
   - `validation/` - Zod schemas
   - `types/` - Shared TypeScript types
   - `utils/` - Pure utility functions
3. Implement placeholder parser:
   - `parseTemplate(body)` function
   - Segment types (text, placeholder)
   - Error reporting with spans
4. Implement template renderer:
   - `renderTemplate(segments, values)` function
   - Validation for number/enum types
5. Add tests for parser/renderer (optional but recommended)

### Deliverables
- [ ] `packages/shared/package.json` configured
- [ ] Placeholder parser working with all syntax types
- [ ] Template renderer with validation
- [ ] Shared type definitions
- [ ] Export barrel files (`index.ts`) for clean imports

### Validation
```typescript
// Test parser works
const result = parseTemplate("Hello {{name:text=World}}, you are {{age:number=30}}");
// Should parse correctly with segments and placeholders

// Test renderer works
const rendered = renderTemplate(result.segments, { name: "Alice", age: 25 });
// Should return "Hello Alice, you are 25"
```

---

## Milestone 5: Authentication Foundation
**Goal:** Implement passkey authentication system (server-side)

### Tasks
1. Install SimpleWebAuthn libraries:
   - `@simplewebauthn/server`
   - `@simplewebauthn/browser`
2. Create auth utilities in `apps/web/src/lib/auth/`:
   - Cookie read/write helpers
   - Session management
   - `requireUser()` guard
3. Implement auth server functions:
   - `authRegisterStart()`
   - `authRegisterFinish()`
   - `authLoginStart()`
   - `authLoginFinish()`
   - `authLogout()`
4. Add environment variable types:
   - RP_ID
   - ORIGIN
   - CHALLENGE_TTL_MS
   - SESSION_TTL_MS
5. Implement opportunistic cleanup of expired challenges/sessions
6. Add typed error codes (AUTH_REQUIRED, INTERNAL, etc.)

### Deliverables
- [ ] All auth server functions implemented
- [ ] Cookie management working
- [ ] Session creation and validation
- [ ] `requireUser()` guard function
- [ ] Typed error responses
- [ ] Challenge cleanup logic

### Validation
- Server functions return correct type shapes
- Session cookies are set with correct attributes (HttpOnly, Secure, SameSite)
- Expired challenges are cleaned up

---

## Milestone 6: Authentication UI
**Goal:** Build registration and login UI with passkeys

### Tasks
1. Create `/login` route
2. Build registration UI:
   - "Register with passkey" button
   - Loading states during WebAuthn ceremony
   - Error handling and display
   - Redirect after successful registration
3. Build login UI:
   - "Sign in with passkey" button
   - Loading states during WebAuthn ceremony
   - Error handling and display
   - Redirect after successful login
4. Add logout button to layout
5. Test complete auth flow end-to-end

### Deliverables
- [ ] Registration flow working (browser authenticator invoked)
- [ ] Login flow working
- [ ] Logout button clears session
- [ ] Session persists across page reloads
- [ ] Protected routes redirect to login when not authenticated

### Validation
- Register new user → creates session → can access protected routes
- Logout → clears session → redirects to login
- Reload page → session persists

---

## Milestone 7: Snippets Backend
**Goal:** Implement snippet CRUD server functions with validation

### Tasks
1. Create Zod validation schemas:
   - `snippetSchema` (title, body, tags)
   - Tag normalization (trim, lowercase, dedupe)
   - Placeholder count limits
2. Implement snippet server functions:
   - `snippetsList({ query?, tag?, cursor?, limit? })`
   - `snippetGet({ id })`
   - `snippetCreate({ title, body, tags })`
   - `snippetUpdate({ id, title, body, tags })`
   - `snippetDelete({ id })`
3. Add requireUser guards to all functions
4. Implement tag filtering logic (conservative LIKE on JSON)
5. Implement search/query filtering
6. Implement cursor pagination

### Deliverables
- [ ] All snippet server functions implemented
- [ ] Zod schemas validating input
- [ ] User isolation enforced (all queries filtered by user_id)
- [ ] Cursor pagination working
- [ ] Tag filtering functional
- [ ] Search/query filtering functional

### Validation
- Can create snippet for authenticated user
- Can list snippets (only user's own)
- Can update own snippet
- Cannot access other users' snippets
- Delete removes snippet permanently

---

## Milestone 8: Snippets UI - List & Create
**Goal:** Build snippet listing and creation interfaces

### Tasks
1. Create `/` route (snippet list):
   - Display snippets as cards/list
   - Tag filter chips
   - Search input
   - Infinite scroll or "load more" button
   - Link to snippet detail
2. Create `/snippets/new` route:
   - Form with title input, body textarea, tag chips
   - Real-time template parsing feedback
   - Show parse errors inline
   - Tag input with add/remove
   - Save button with loading state
3. Integrate TanStack Query for data fetching
4. Add optimistic updates (optional)

### Deliverables
- [ ] Snippet list page with search and filter
- [ ] Create snippet form
- [ ] Real-time template parsing visualization
- [ ] Tag management UI
- [ ] Navigation between list and create

### Validation
- Create snippet → appears in list
- Search filters snippets
- Tag filters work correctly
- Parse errors shown when typing invalid template syntax

---

## Milestone 9: Snippets UI - Detail & Edit
**Goal:** Build snippet detail view and editing interface

### Tasks
1. Create `/snippets/:id` route (detail):
   - Display rendered snippet with placeholders highlighted
   - "Copy" button (copy rendered text to clipboard)
   - Show tags
   - Link to edit
2. Create `/snippets/:id/edit` route:
   - Pre-populated form with existing data
   - Same real-time parsing as create
   - Save/cancel buttons
3. Implement placeholder rendering in detail view:
   - Text displayed normally
   - Placeholders as tappable Badge chips
4. Implement copy functionality:
   - Render template with current values
   - Show error toast if validation fails
   - Copy to clipboard + success toast

### Deliverables
- [ ] Detail view with placeholder rendering
- [ ] Edit form with pre-populated data
- [ ] Copy button working with validation
- [ ] Placeholder chips visible and interactive
- [ ] Toast notifications for copy success/failure

### Validation
- Copy button copies rendered text with defaults
- Copy fails gracefully with invalid values
- Edit saves changes correctly
- Detail view renders placeholders as chips

---

## Milestone 10: Inline Placeholder Editing
**Goal:** Implement inline placeholder editing with mobile/desktop responsive UI

### Tasks
1. Build placeholder value state management:
   - Per-snippet value storage
   - Optional localStorage persistence
2. Create placeholder editing UI:
   - Tap placeholder chip → open editor
   - Desktop: Popover
   - Mobile: Sheet (bottom drawer)
3. Implement type-specific editors:
   - Text: Input/Textarea
   - Number: Numeric input with validation
   - Enum: Select/radio buttons
4. Update rendered preview in real-time
5. Handle defaults and empty values
6. Ensure touch-friendly UI on mobile

### Deliverables
- [ ] Tappable placeholder chips
- - Responsive editor (Popover/Sheet)
- [ ] Type-appropriate input controls
- [ ] Real-time preview updates
- [ ] Mobile-optimized touch targets
- [ ] localStorage persistence for values

### Validation
- Tap chip → editor opens on mobile
- Tap chip → popover opens on desktop
- Changing value updates rendered text
- Defaults pre-filled
- Enum values restricted to options
- Number validation prevents non-numeric input

---

## Milestone 11: Polish & Hardening
**Goal:** Add error handling, limits, security, and UX refinements

### Tasks
1. Add comprehensive error handling:
   - Network error handling
   - Validation error display
   - User-friendly error messages
2. Implement rate limiting considerations:
   - Max placeholder count per snippet
   - Max snippet count per user (optional)
   - Tag count limits
3. Add loading states:
   - Skeleton screens
   - Button loading states
   - Page transitions
4. Security hardening:
   - Verify all server functions check user ownership
   - Ensure no data leakage between users
   - Validate all inputs server-side
5. Performance optimizations:
   - TanStack Query caching
   - Optimistic updates where appropriate
   - Debounced search input
6. Add accessibility improvements:
   - ARIA labels
   - Keyboard navigation
   - Focus management
   - Screen reader support

### Deliverables
- [ ] All errors handled gracefully with user-friendly messages
- [ ] Loading states throughout app
- [ ] Security audit passed (no cross-user data access)
- [ ] Performance acceptable (fast page loads)
- [ ] Basic accessibility working
- [ ] `biome check .` passes with no warnings

### Validation
- All actions show loading states
- Errors don't expose internal details
- Can't access other users' data (manual testing)
- App works with keyboard navigation
- Search is debounced

---

## Milestone 12: Deployment & Documentation
**Goal:** Deploy to Cloudflare Workers and create documentation

### Tasks
1. Configure production build:
   - TanStack Start production build
   - Cloudflare Workers compatibility date
   - Enable nodejs_compat if needed
2. Set up Cloudflare Workers deployment:
   - Configure D1 production database
   - Set environment variables (RP_ID, ORIGIN, TTLs)
   - Deploy via Wrangler
3. Run migrations in production:
   - Apply all D1 migrations
4. Create documentation:
   - README with setup instructions
   - Environment variable reference
   - Development workflow
   - Deployment instructions
5. Test production deployment:
   - Register new user
   - Create/edit/delete snippets
   - Test passkey auth on mobile
   - Verify all features working

### Deliverables
- [ ] App deployed to Cloudflare Workers
- [ ] Production D1 database configured
- [ ] Migrations applied in production
- [ ] README documentation complete
- [ ] All features working in production

### Validation
```bash
# Deploy to Workers
bun run build
wrangler deploy

# Verify production
curl https://your-app.workers.dev
```

---

## Summary Checklist

Use this to track overall progress:

### Foundation
- [ ] Milestone 1: Foundation & Tooling Setup
- [ ] Milestone 2: UI Foundation (Tailwind + shadcn/ui)
- [ ] Milestone 3: Database Layer (D1 + Kysely)
- [ ] Milestone 4: Shared Package Structure

### Auth
- [ ] Milestone 5: Authentication Foundation
- [ ] Milestone 6: Authentication UI

### Features
- [ ] Milestone 7: Snippets Backend
- [ ] Milestone 8: Snippets UI - List & Create
- [ ] Milestone 9: Snippets UI - Detail & Edit
- [ ] Milestone 10: Inline Placeholder Editing

### Launch
- [ ] Milestone 11: Polish & Hardening
- [ ] Milestone 12: Deployment & Documentation

---

## Notes
- Each milestone should be completed and validated before moving to the next
- Run `biome check . --write` at the end of each milestone
- Test features manually after each milestone
- Commit frequently with meaningful messages
- Adjust scope if needed during implementation
