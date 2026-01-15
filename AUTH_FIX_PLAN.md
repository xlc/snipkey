# Authentication & Session Management Fix Plan

## Problem Statement

The codebase currently has **critical security issues** due to TanStack Start server functions not having access to request context:

1. **MOCK_USER_ID hardcoded** - All users see the same snippets
2. **No session validation** - Authentication bypassed completely
3. **Cannot set HttpOnly cookies** - Sessions not properly managed
4. **authLogout/authMe broken** - Cannot extract session from cookies

## Solution: TanStack Start Middleware Pattern

Based on TanStack Start documentation research, the framework **does** provide request context through middleware:

```typescript
// Middleware receives { request, params, context }
const middleware = createMiddleware()
  .server(async ({ request, context }) => {
    // request = Web API Request object
    const cookies = request.headers.get('cookie')
    // Extract and validate session
    // Pass user data to handler via context
    return ctx.next({ context: { user } })
  })

// Server functions use middleware
export const fn = createServerFn()
  .middleware([middleware])
  .handler(async ({ context }) => {
    // context.user is available
  })
```

## Implementation Plan

### Phase 1: Create Authentication Middleware

**File**: `apps/web/src/lib/server/middleware.ts`

```typescript
import { createMiddleware } from "@tanstack/start"
import { getDbFromEnv } from "./context"
import * as auth from "./auth"

/**
 * Authentication middleware for TanStack Start server functions
 *
 * This middleware:
 * 1. Extracts session ID from request cookies
 * 2. Validates session against database
 * 3. Enriches context with user data
 * 4. Throws error if authentication required but not provided
 */
export const authMiddleware = createMiddleware()
  .server(async ({ request, context }) => {
    const db = getDbFromEnv()

    // Extract session ID from cookies
    const sessionId = extractSessionId(request.headers)
    if (!sessionId) {
      // Not logged in - pass without user context
      return context.next({
        context: {
          ...context,
          user: null,
        },
      })
    }

    // Validate session and get user ID
    const userId = await auth.validateSession(db, sessionId)
    if (!userId) {
      // Invalid/expired session
      return context.next({
        context: {
          ...context,
          user: null,
        },
      })
    }

    // Session valid - enrich context with user data
    return context.next({
      context: {
        ...context,
        user: { id: userId },
      },
    })
  })

/**
 * Require authentication - throws if not logged in
 * Use this for endpoints that must have a valid user
 */
export const requireAuthMiddleware = createMiddleware()
  .server(async ({ request, context }) => {
    const db = getDbFromEnv()
    const sessionId = extractSessionId(request.headers)

    if (!sessionId) {
      throw new Error("AUTH_REQUIRED: No session cookie found")
    }

    const userId = await auth.validateSession(db, sessionId)
    if (!userId) {
      throw new Error("AUTH_REQUIRED: Invalid or expired session")
    }

    return context.next({
      context: {
        ...context,
        user: { id: userId },
      },
    })
  })

function extractSessionId(headers: Headers): string | undefined {
  const cookies = headers.get("cookie") ?? ""
  const sessionMatch = cookies.match(/session=([^;]+)/)
  return sessionMatch?.[1]
}
```

### Phase 2: Add validateSession to auth.ts

**File**: `apps/web/src/lib/server/auth.ts`

Add this function to validate sessions:

```typescript
/**
 * Validate a session and return the user ID
 * Returns null if session is invalid or expired
 */
export async function validateSession(
	db: ReturnType<typeof getDb>,
	sessionId: string,
): Promise<string | null> {
	const now = nowMs()

	const session = await db
		.selectFrom("sessions")
		.select(["user_id", "expires_at", "revoked_at"])
		.where("id", "=", sessionId)
		.executeTakeFirst()

	if (!session) {
		return null
	}

	// Check if expired
	if (session.expires_at < now) {
		return null
	}

	// Check if revoked
	if (session.revoked_at !== null && session.revoked_at < now) {
		return null
	}

	return session.user_id
}
```

### Phase 3: Update Server Functions to Use Middleware

**File**: `apps/web/src/server/snippets/index.ts`

Replace MOCK_USER_ID with context.user:

```typescript
import { createServerFn } from "@tanstack/start"
import { requireAuthMiddleware } from "~/lib/server/middleware"

// All snippet operations require authentication
export const snippetsList = createServerFn("GET", async (input: SnippetListInput, { context }: any) => {
  const db = getDbFromEnv()
  const userId = context.user.id // From middleware
  const result = await snippets.snippetsList(db, userId, input)
  return toResult(result)
}).middleware([requireAuthMiddleware])

export const snippetGet = createServerFn("GET", async ({ id }: { id: string }, { context }: any) => {
  const db = getDbFromEnv()
  const userId = context.user.id // From middleware
  const result = await snippets.snippetGet(db, userId, id)
  return toResult(result)
}).middleware([requireAuthMiddleware])

// ... same pattern for create, update, delete
```

### Phase 4: Update Auth Server Functions

**File**: `apps/web/src/server/auth/index.ts`

Add middleware to authLogout and authMe:

```typescript
import { createServerFn } from "@tanstack/start"
import { authMiddleware } from "~/lib/server/middleware"

// Get current user (optional auth)
export const authMe = createServerFn("GET", async (_: void, { context }: any) => {
  const db = getDbFromEnv()

  if (!context.user) {
    return ok({ user: null })
  }

  const user = await getUser(db, context.user.id)
  return ok({ user })
}).middleware([authMiddleware])

// Logout (optional auth - can logout even if session already expired)
export const authLogout = createServerFn("POST", async (_: void, { request, context }: any) => {
  const db = getDbFromEnv()
  const sessionId = extractSessionId(request.headers)

  if (sessionId && context.user) {
    await auth.logout(db, sessionId, context.user.id)
  }

  // Return response with Set-Cookie header to clear session
  // Note: This requires custom response handling in TanStack Start
  return ok({ success: true })
}).middleware([authMiddleware])
```

### Phase 5: Set Session Cookies on Registration/Login

**File**: `apps/web/src/lib/server/auth.ts`

Update `authRegisterFinish` and `authLoginFinish` to set session cookies:

```typescript
// In both RegisterFinish and LoginFinish handlers
// After creating session:

// Return session ID with instruction to set cookie
// The server function will need to return a Response object
// with Set-Cookie header

// This requires refactoring return type to support custom Response
```

**Critical**: TanStack Start server functions need to return `Response` objects to set cookies. This requires:

1. Changing return type from `ok/result` to `Response`
2. Using `new Response(JSON.stringify(data), { headers })`
3. Setting `Set-Cookie: session=<id>; HttpOnly; Secure; SameSite=Lax; Path=/`

### Phase 6: Handle Set-Cookie Headers

**Option A**: Use TanStack Start's response handling (if supported)

```typescript
export const authLoginFinish = createServerFn("POST", async (input) => {
  const db = getDbFromEnv()
  const result = await auth.authLoginFinish(db, input)

  if (!result.ok) {
    return Response.json(result.error, { status: 400 })
  }

  const sessionId = result.data.session.id

  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`,
    },
  })
})
```

**Option B**: If Response objects aren't supported, use a different pattern:
- Return session ID in response body
- Set cookie via client-side (less secure, but may be necessary)
- Or use a separate cookie-setting endpoint

### Phase 7: Remove Placeholder Code

Delete these placeholder files:
- `apps/web/src/lib/server/auth-user.ts` (no longer needed)
- `apps/web/src/lib/server/request.ts` (no longer needed)

Remove SECURITY WARNING comments from server functions (now fixed).

## Implementation Sequence

1. **Add validateSession to auth.ts** - Core session validation logic
2. **Create middleware.ts** - Authentication middleware
3. **Update snippets/index.ts** - Remove MOCK_USER_ID, use middleware
4. **Update auth/index.ts** - Add middleware to authMe/authLogout
5. **Handle Set-Cookie headers** - For login/register flows
6. **Test authentication flow** - Register → Login → Create snippet → Logout
7. **Remove placeholder code** - Clean up temporary files
8. **Update tests** - Add authentication tests
9. **Commit fixes** - Final commit with all changes

## Remaining Questions

1. **Can TanStack Start server functions return Response objects?**
   - If yes: Use Option A for Set-Cookie headers
   - If no: Need alternative approach (Option B or special endpoint)

2. **How to handle session expiration in middleware?**
   - Auto-delete expired sessions on validation?
   - Or rely on background cleanup job?

3. **Should middleware auto-refresh sessions?**
   - Extend session expiration on activity?
   - Or keep fixed expiration?

## Testing Checklist

- [ ] User can register and gets HttpOnly session cookie
- [ ] User can login and gets HttpOnly session cookie
- [ ] Authenticated user can create snippets (isolated by user)
- [ ] Authenticated user can only see their own snippets
- [ ] authMe returns correct user when logged in
- [ ] authMe returns null when not logged in
- [ ] authLogout clears session cookie
- [ ] Expired sessions are rejected
- [ ] Unauthenticated requests to protected endpoints fail
- [ ] Session cookies are HttpOnly, Secure, SameSite=Lax

## Security Improvements After Implementation

✅ User isolation enforced (each user sees only their data)
✅ Authentication required for protected endpoints
✅ Sessions validated on every request
✅ HttpOnly cookies prevent XSS session theft
✅ Secure flag ensures HTTPS-only transmission
✅ SameSite=Lax prevents CSRF attacks

## Estimated Complexity

- **Phase 1-2**: Low (add new functions)
- **Phase 3-4**: Medium (refactor existing functions)
- **Phase 5-6**: High (depends on TanStack Start Response support)
- **Phase 7**: Low (cleanup)

**Total**: ~2-3 hours if Response objects work, ~4-6 hours if workaround needed
