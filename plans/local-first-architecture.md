# Local-First Architecture Implementation Plan

**Goal**: Allow Snipkey to work without authentication, storing everything locally, with optional signup to sync to server.

## Architecture Overview

### Current State
- App requires authentication to access any features
- All data stored in server database (Cloudflare D1)
- Placeholder values stored in localStorage per snippet

### Target State
- App works fully without authentication (local-first)
- All snippets stored in localStorage
- Optional authentication for cloud sync
- Seamless migration from local to cloud

## Implementation Plan

### Phase 1: Create Local Storage Layer
**File**: `src/lib/local-storage.ts`

Create a localStorage-based API that mimics the server API:
```typescript
// Local storage functions
- createSnippet(snippet)
- listSnippets(filters)
- getSnippet(id)
- updateSnippet(id, data)
- deleteSnippet(id)

// Sync state management
- getSyncStatus() -> 'local' | 'synced' | 'conflict'
- markAsSynced(id)
- getUnsyncedSnippets()
```

### Phase 2: Create Unified Data Access Layer
**File**: `src/lib/snippet-api.ts`

Create abstraction layer that routes to local or server:
```typescript
async function listSnippets(filters) {
  if (isAuthenticated()) {
    return await serverSnippetsList(filters)
  }
  return await localSnippetsList(filters)
}
```

### Phase 3: Update UI for Optional Auth
**Changes**:
- Update header to show "Sign Up" when not authenticated
- Add "Sync Status" indicator when authenticated
- Update all snippet operations to use unified API

### Phase 4: Implement Sync Functionality
**File**: `src/lib/sync.ts`

```typescript
async function syncToServer() {
  const unsynced = getUnsyncedSnippets()
  for (const snippet of unsynced) {
    await serverSnippetCreate(snippet)
    markAsSynced(snippet.id)
  }
}

async function syncFromServer() {
  const serverSnippets = await serverSnippetsList({ limit: 1000 })
  for (const snippet of serverSnippets) {
    saveToLocalStorage(snippet)
    markAsSynced(snippet.id)
  }
}
```

### Phase 5: Handle Auth Transition
**When user signs up**:
1. Run syncToServer() to push local data
2. Clear local-only flag
3. Switch to server mode

**When user logs out**:
1. Keep local data intact
2. Switch to local mode
3. Offer to clear local data

## Data Model

### Local Storage Structure
```typescript
// snippets
{
  id: string
  title: string
  body: string
  tags: string[]
  created_at: number
  updated_at: number
  synced: boolean  // NEW: track sync status
  deleted: boolean // NEW: soft delete for sync
}

// meta
{
  userId: string | null
  lastSyncAt: number | null
  mode: 'local' | 'cloud'
}
```

## Priority Order
1. ✅ Create local storage layer
2. ✅ Create unified API
3. ✅ Update index route to use unified API
4. ✅ Update form routes to use unified API
5. ✅ Update header for optional auth
6. ✅ Implement sync on signup
7. ✅ Add sync status indicator
8. ✅ Test full flow

## Edge Cases to Handle
- Conflict resolution: Local vs server snippet changed
- Network errors: Fallback to local mode
- Storage quota: localStorage has 5-10MB limit
- Data migration: Existing users with server-only data
- Race conditions: Rapid edits during sync

## Success Criteria
- ✅ App works fully without auth
- ✅ All CRUD operations work locally
- ✅ Signup syncs existing data
- ✅ Logout keeps local data
- ✅ No data loss scenarios
- ✅ Sync status visible to user
