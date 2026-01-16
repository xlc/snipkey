# Local-First Architecture: Detailed Task Breakdown

**Objective**: Allow Snipkey to work without authentication while enabling optional cloud sync.

---

## Phase 1: Foundation (Completed ✅)

### Task 1.1: Create Local Storage Layer ✅
**Status**: Done
**File**: `src/lib/local-storage.ts`
**Details**:
- CRUD operations for localStorage
- Sync status tracking (synced, deleted flags)
- Metadata management (userId, mode, lastSyncAt)
- Functions: `createLocalSnippet`, `updateLocalSnippet`, `deleteLocalSnippet`, `listLocalSnippets`, `getLocalSnippet`

### Task 1.2: Create Unified API Layer ✅
**Status**: Done
**File**: `src/lib/snippet-api.ts`
**Details**:
- Abstraction layer routing to local/server based on auth status
- Automatic fallback to local on server errors
- Sync function: `syncToServer()`
- Functions: `listSnippets`, `getSnippet`, `createSnippet`, `updateSnippet`, `deleteSnippet`, `getAuthStatus`

### Task 1.3: Create Implementation Plan ✅
**Status**: Done
**File**: `plans/local-first-architecture.md`

---

## Phase 2: Update Routes for Local-First

### Task 2.1: Update Index Route
**File**: `src/routes/index.tsx`
**Estimate**: 20 minutes

**Changes Required**:
1. Import from `~/lib/snippet-api` instead of `~/server/snippets`
2. Remove `requireAuthMiddleware` dependency
3. Update `loadSnippets` to use unified API
4. Update `handleExport` to work with local data
5. Update `handleImport` to work without auth
6. Add sync status indicator in UI
7. Add "Sign Up" CTA for non-authenticated users

**Implementation Steps**:
```typescript
// Before:
import { snippetsList, snippetCreate } from '~/server/snippets'

// After:
import { listSnippets, createSnippet, getAuthStatus } from '~/lib/snippet-api'
```

**New Features**:
- Show "Works Offline" badge when in local mode
- Display sync status (Unsynced changes indicator)
- Add "Create Account" banner for non-auth users

### Task 2.2: Update New Snippet Route
**File**: `src/routes/snippets.new.tsx`
**Estimate**: 15 minutes

**Changes Required**:
1. Import from unified API
2. Remove auth middleware dependency
3. Update form submission to use unified API
4. Handle both local and server creation

### Task 2.3: Update Edit Snippet Route
**File**: `src/routes/snippets.$id.edit.tsx`
**Estimate**: 20 minutes

**Changes Required**:
1. Load snippet using unified API
2. Update to use unified API
3. Handle offline vs online modes

### Task 2.4: Update View Snippet Route
**File**: `src/routes/snippets.$id.tsx`
**Estimate**: 15 minutes

**Changes Required**:
1. Load snippet using unified API
2. Update delete to use unified API
3. Handle soft-deleted snippets

---

## Phase 3: Authentication Flow Updates

### Task 3.1: Update Register Flow to Sync Data
**File**: `src/routes/login.tsx`
**Estimate**: 30 minutes

**Changes Required**:
1. After successful registration, call `syncToServer()`
2. Update local metadata to set userId and mode
3. Show sync progress to user
4. Reload page to switch to server mode

**Implementation**:
```typescript
async function handleRegisterFinish(attestation, challengeId) {
  // ... existing registration code ...

  // After successful auth
  const { synced, errors } = await syncToServer()

  // Update metadata
  setMeta({
    userId: result.userId,
    mode: 'cloud',
    lastSyncAt: Date.now()
  })

  toast.success(`Account created! Synced ${synced} snippets.`)

  // Reload to refresh UI
  router.invalidate()
}
```

### Task 3.2: Update Logout Flow
**File**: `src/routes/login.tsx`
**Estimate**: 15 minutes

**Changes Required**:
1. Keep local data intact on logout
2. Update metadata to clear userId
3. Switch back to local mode
4. Inform user data is preserved locally

**Implementation**:
```typescript
async function handleLogout() {
  await authLogout()

  // Keep local data, just clear auth
  setMeta({
    userId: null,
    mode: 'local',
    lastSyncAt: null
  })

  toast.info('Logged out. Your snippets are saved locally.')
  router.invalidate()
}
```

### Task 3.3: Make Auth Optional in Middleware
**File**: `src/lib/server/middleware.ts`
**Estimate**: 10 minutes

**Changes Required**:
1. Current middleware already supports optional auth
2. Verify `authMiddleware` allows anonymous access
3. Ensure `requireAuthMiddleware` is only used where truly needed

---

## Phase 4: UI/UX Enhancements

### Task 4.1: Update Header Component
**File**: `src/routes/__root.tsx`
**Estimate**: 25 minutes

**Changes Required**:
1. Check auth status dynamically
2. Show different buttons based on auth:
   - Not authenticated: "Sign Up" button
   - Authenticated: "Sync" button + "Logout" button
3. Add sync status indicator
4. Show "Local Mode" or "Cloud Mode" badge

**Implementation**:
```tsx
// Header component
async function checkAuth() {
  const status = await getAuthStatus()
  setAuthenticated(status.authenticated)
  setUserId(status.userId)
}

// Render different buttons
{authenticated ? (
  <>
    <SyncButton />
    <LogoutButton />
  </>
) : (
  <Link to="/login">
    <Button>Sign Up (It's Free)</Button>
  </Link>
)}
```

### Task 4.2: Create Sync Status Indicator Component
**File**: `src/components/SyncStatus.tsx`
**Estimate**: 20 minutes

**Features**:
- Show unsynced count badge
- Display last sync time
- Manual sync button
- Visual indicator for local vs cloud mode

**UI Mockup**:
```
[☁️ Cloud] Last sync: 2 mins ago
[💾 Local] 3 unsynced changes [Sync Now]
```

### Task 4.3: Add "Local Mode" Banner
**File**: `src/components/LocalModeBanner.tsx`
**Estimate**: 15 minutes

**Features**:
- Inform user they're in local mode
- Explain benefits of signing up
- CTA button to create account
- Dismissible banner

**Copy**:
```
📦 Working Offline
Your snippets are saved locally. Sign up to sync them to the cloud and access anywhere.
[Create Free Account] [Dismiss]
```

### Task 4.4: Update Tags Page
**File**: `src/routes/tags.tsx`
**Estimate**: 20 minutes

**Changes Required**:
1. Use unified API for tag aggregation
2. Create local tag counting function
3. Handle both local and server modes

---

## Phase 5: Sync Functionality

### Task 5.1: Implement Background Sync
**File**: `src/lib/sync.ts`
**Estimate**: 30 minutes

**Features**:
- Periodic sync every 5 minutes when authenticated
- Sync on window focus
- Sync on route changes
- Conflict resolution strategy (last write wins)

**Implementation**:
```typescript
export function setupBackgroundSync() {
  if (!isAuthenticated()) return

  // Sync on interval
  const interval = setInterval(async () => {
    await syncToServer()
  }, 5 * 60 * 1000)

  // Sync on focus
  window.addEventListener('focus', async () => {
    await syncToServer()
  })

  return () => clearInterval(interval)
}
```

### Task 5.2: Add Sync Button Component
**File**: `src/components/SyncButton.tsx`
**Estimate**: 20 minutes

**Features**:
- Manual sync trigger
- Show sync progress
- Display sync results
- Handle sync errors gracefully

### Task 5.3: Implement Conflict Resolution
**File**: `src/lib/sync.ts`
**Estimate**: 30 minutes

**Strategy**:
1. Check if snippet exists on server
2. Compare updated_at timestamps
3. Server wins if newer, local wins if newer
4. Mark both as synced
5. Log conflicts for user review

---

## Phase 6: Testing & Validation

### Task 6.1: Test Local-First Flow
**Estimate**: 20 minutes

**Test Cases**:
- [ ] Create snippet while logged out
- [ ] Edit snippet while logged out
- [ ] Delete snippet while logged out
- [ ] Refresh page - data persists
- [ ] Search and filter work locally
- [ ] Export/import work locally
- [ ] All features work without auth

### Task 6.2: Test Signup and Sync Flow
**Estimate**: 20 minutes

**Test Cases**:
- [ ] Create 3 snippets locally
- [ ] Sign up for account
- [ ] Verify all 3 snippets sync to server
- [ ] Logout and login - data persists
- [ ] Edit snippet while authenticated
- [ ] Verify sync status updates

### Task 6.3: Test Offline Behavior
**Estimate**: 15 minutes

**Test Cases**:
- [ ] Login, then go offline
- [ ] Create snippet while offline
- [ ] Come back online
- [ ] Verify snippet syncs automatically
- [ ] Edit while offline, syncs when online

### Task 6.4: Test Error Scenarios
**Estimate**: 15 minutes

**Test Cases**:
- [ ] Server error falls back to local
- [ ] Network timeout handled gracefully
- [ ] localStorage quota exceeded handling
- [ ] Corrupted local data doesn't crash app

---

## Phase 7: Documentation

### Task 7.1: Update README
**File**: `README.md`
**Estimate**: 15 minutes

**Add Section**:
```markdown
## Local-First Architecture

Snipkey works fully without authentication. All snippets are stored locally in your browser.
Sign up for a free account to sync your snippets across devices.

### Features
- ✅ Works offline
- ✅ All data stored locally
- ✅ Optional cloud sync
- ✅ No account required
- ✅ Privacy-focused (passkey auth)
```

### Task 7.2: Create User Guide
**File**: `docs/LOCAL_FIRST.md`
**Estimate**: 20 minutes

**Topics**:
- How local mode works
- Benefits of signing up
- How sync works
- Privacy and security
- Troubleshooting

---

## Phase 8: Polish & Launch

### Task 8.1: Add Loading States
**Estimate**: 15 minutes

**Loading States**:
- Syncing indicator
- Auth status check loading
- Migration progress

### Task 8.2: Add Error Handling
**Estimate**: 20 minutes

**Error Scenarios**:
- localStorage quota exceeded
- Sync failures
- Network errors
- Data corruption

### Task 8.3: Performance Optimization
**Estimate**: 15 minutes

**Optimizations**:
- Debounce sync operations
- Lazy load local data
- Optimize localStorage reads

### Task 8.4: Accessibility Review
**Estimate**: 10 minutes

**Check**:
- Screen reader announcements for sync
- Keyboard navigation for new buttons
- ARIA labels for sync status

---

## Summary

**Total Estimated Time**: ~5 hours
**Total Tasks**: 28
**Files to Modify**: 12
**Files to Create**: 4

### Priority Order
1. **Must Have** (MVP):
   - Tasks 2.1, 2.2, 2.3, 2.4 (Update all routes)
   - Tasks 3.1, 3.2 (Auth flow)
   - Task 4.1 (Update header)

2. **Should Have** (Good UX):
   - Tasks 4.2, 4.3, 4.4 (UI components)
   - Task 5.1, 5.2 (Sync functionality)
   - Task 6.1, 6.2 (Testing)

3. **Nice to Have** (Polish):
   - Task 5.3 (Conflict resolution)
   - Tasks 7.1, 7.2 (Documentation)
   - Task 8.x (Polish)

### Risk Assessment

**High Risk**:
- Data loss during sync (mitigation: soft deletes, backups)
- localStorage quota (mitigation: quota check, warnings)
- Race conditions (mitigation: timestamps, last-write-wins)

**Medium Risk**:
- Performance with many snippets (mitigation: pagination)
- Confusing UX (mitigation: clear status indicators)

**Low Risk**:
- Browser compatibility (localStorage widely supported)
- Security (passkey auth already secure)

---

## Success Criteria

✅ **MVP (Minimum Viable Product)**:
- [ ] App works without authentication
- [ ] All CRUD operations work locally
- [ ] Signup syncs existing data
- [ ] No data loss in any scenario
- [ ] Clear visual indication of local vs cloud mode

✅ **Full Feature**:
- [ ] All MVP criteria plus
- [ ] Background sync
- [ ] Manual sync button
- [ ] Conflict resolution
- [ ] Comprehensive testing
- [ ] Full documentation

---

## Next Steps

**Immediate**: Start with Phase 2 (Update Routes)
- Begin with Task 2.1 (Index Route)
- Continue with form routes (2.2, 2.3, 2.4)
- Test as you go

**After Routes**: Move to Phase 3 (Auth Flow)
- Implement sync on signup
- Handle logout gracefully

**Finally**: Phase 4 (UI Enhancements)
- Update header
- Add sync status
- Polish the experience
