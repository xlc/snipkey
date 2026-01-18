# Snipkey User Stories

## Overview

This document outlines user stories for the Snipkey snippet management application, organized by feature area and priority.

---

## Authentication & Security

### Epic: WebAuthn Passkey Authentication

#### Story 1.1: Register with Passkey
**As a** new user
**I want to** register for an account using a passkey (fingerprint, Face ID, or security key)
**So that** I can quickly and securely access my snippets without remembering passwords

**Acceptance Criteria:**
- User can initiate registration from the home page
- Browser prompts for passkey creation (fingerprint, Face ID, or security key)
- Registration completes without requiring a password
- User is automatically logged in after successful registration
- Clear error message if passkey creation fails

**Priority:** High (Must Have)

---

#### Story 1.2: Login with Passkey
**As a** returning user
**I want to** sign in using my saved passkey
**So that** I can instantly access my snippets without typing credentials

**Acceptance Criteria:**
- Login button is prominent on the home page
- Single click initiates passkey authentication
- User is logged in within 2 seconds on successful authentication
- Session persists for 7 days
- Clear error message if authentication fails

**Priority:** High (Must Have)

---

#### Story 1.3: Logout
**As a** logged-in user
**I want to** sign out of my account
**So that** my snippets remain secure on shared devices

**Acceptance Criteria:**
- Logout button is accessible from the main interface
- Clicking logout immediately clears the session
- User is redirected to the home page
- Passkey is not removed from the device (can login again)

**Priority:** High (Must Have)

---

## Snippet Management

### Epic: Create & Edit Snippets

#### Story 2.1: Create a New Snippet
**As a** developer
**I want to** create a new code snippet with a title and body
**So that** I can save reusable code for future use

**Acceptance Criteria:**
- "New Snippet" button is visible on the home page
- Form requires a title (max 200 characters)
- Code body supports up to 50,000 characters
- Can add tags to organize the snippet
- Can optionally assign to a folder
- Snippet is saved immediately after creation
- Clear success message after saving

**Priority:** High (Must Have)

---

#### Story 2.2: Use Placeholders in Snippets
**As a** developer
**I want to** create dynamic snippets with placeholders
**So that** I can quickly customize code when I reuse it

**Acceptance Criteria:**
- Can add placeholders using `{{name:type}}` syntax
- Supported types: `text`, `number`, `enum(option1,option2,...)`
- Can provide default values: `{{name:type=default}}`
- Maximum 20 placeholders per snippet
- Placeholders are highlighted in the editor
- Real-time validation shows placeholder errors

**Priority:** High (Must Have)

---

#### Story 2.3: Edit Existing Snippet
**As a** developer
**I want to** modify my saved snippets
**So that** I can fix errors or improve them over time

**Acceptance Criteria:**
- Can edit snippet from the detail view
- All fields are editable (title, body, tags, folder)
- Changes are saved immediately
- Can cancel edits without saving
- Previous version is preserved until save
- Clear indication of unsaved changes

**Priority:** High (Must Have)

---

#### Story 2.4: Delete a Snippet
**As a** developer
**I want to** remove snippets I no longer need
**So that** my snippet library stays organized

**Acceptance Criteria:**
- Delete option is available on snippet detail view
- Confirmation dialog prevents accidental deletion
- Snippet is immediately removed after confirmation
- Success message confirms deletion
- Cannot undo deletion (consider adding in future)

**Priority:** Medium (Should Have)

---

### Epic: Search & Discover

#### Story 3.1: Search Snippets by Keyword
**As a** developer
**I want to** search my snippets by keywords
**So that** I can quickly find relevant code

**Acceptance Criteria:**
- Search bar is always visible on the home page
- Search filters snippets by title and body text
- Results update in real-time as I type (debounced)
- Shows number of matching snippets
- Clear search button resets the filter

**Priority:** High (Must Have)

---

#### Story 3.2: Filter by Tags
**As a** developer
**I want to** filter snippets by tags
**So that** I can browse code by category or topic

**Acceptance Criteria:**
- All tags used in my snippets are displayed
- Can select multiple tags to filter
- Selected tags are visually highlighted
- Can clear all tag filters at once
- Filtered results update immediately

**Priority:** High (Must Have)

---

#### Story 3.3: Filter by Folder
**As a** developer
**I want to** browse snippets by folder
**So that** I can find code related to a specific project or area

**Acceptance Criteria:**
- Folder tree is visible in the sidebar
- Can expand/collapse folders to see subfolders
- Clicking a folder filters snippets to show only those in that folder
- Snippet count is shown for each folder
- "All Folders" option shows all snippets
- Visual indicator shows which folder is currently selected

**Priority:** High (Must Have)

---

## Organization

### Epic: Folder Management

#### Story 4.1: Create a Folder
**As a** developer
**I want to** create folders to organize my snippets
**So that** I can group related code together

**Acceptance Criteria:**
- "New Folder" button is easily accessible
- Can name the folder (required, max 100 characters)
- Can optionally choose a color for visual identification
- Can optionally choose an icon
- Can create nested folders (subfolders)
- Folder appears in the sidebar immediately after creation

**Priority:** High (Must Have)

---

#### Story 4.2: Edit Folder Properties
**As a** developer
**I want to** rename or customize my folders
**So that** I can reorganize my snippet library as needed

**Acceptance Criteria:**
- Can edit folder name, color, and icon
- Can move a folder to be a subfolder of another folder
- Changes are reflected immediately in the sidebar
- Snippets in the folder remain associated after editing

**Priority:** Medium (Should Have)

---

#### Story 4.3: Delete a Folder
**As a** developer
**I want to** delete folders I no longer need
**So that** my folder structure stays clean

**Acceptance Criteria:**
- Delete option is available on folder
- Confirmation dialog warns about impact
- Deleting a folder also deletes all subfolders
- Snippets in deleted folders are unassigned (not deleted)
- Cannot delete folders that contain snippets (must move snippets first)

**Priority:** Medium (Should Have)

---

#### Story 4.4: Reorder Folders
**As a** developer
**I want to** change the order of folders
**So that** my most-used folders appear first

**Acceptance Criteria:**
- Can drag and drop folders to reorder them
- Can reorder folders at the same level
- Order changes are saved immediately
- Folder order persists across sessions

**Priority:** Low (Could Have)

---

### Epic: Tag Management

#### Story 5.1: Add Tags to Snippets
**As a** developer
**I want to** tag my snippets with keywords
**So that** I can categorize and find them easily

**Acceptance Criteria:**
- Can add multiple tags to a snippet (max 10)
- Tags are comma-separated or entered via autocomplete
- Can create new tags on-the-fly while editing
- Tags are displayed on snippet cards
- Maximum tag length of 50 characters

**Priority:** High (Must Have)

---

#### Story 5.2: Remove Tags from Snippets
**As a** developer
**I want to** remove tags from snippets
**So that** I can correct miscategorizations

**Acceptance Criteria:**
- Can remove individual tags from the edit form
- Changes are saved immediately
- Tag is removed from the tag list if no snippets use it

**Priority:** High (Must Have)

---

#### Story 5.3: Rename a Tag
**As a** developer
**I want to** rename a tag across all snippets
**So that** I can fix typos or standardize terminology

**Acceptance Criteria:**
- Can edit tag name from tag filter dropdown
- All snippets with that tag are updated automatically
- No duplicate tags can exist

**Priority:** Low (Could Have - Future Enhancement)

---

## Sync & Storage

### Epic: Local Storage & Offline Access

#### Story 6.1: Access Snippets Offline
**As a** developer
**I want to** view my snippets even when offline
**So that** I can reference my code without internet access

**Acceptance Criteria:**
- Snippets are cached in browser localStorage
- Can view all snippets while offline
- Can create and edit snippets offline
- Changes are saved locally and sync when online

**Priority:** High (Must Have)

---

#### Story 6.2: Automatic Draft Saving
**As a** developer
**I want to** have my work saved automatically as I type
**So that** I don't lose my work if I accidentally close the tab

**Acceptance Criteria:**
- Drafts are saved automatically every few seconds
- Draft is restored if I return to the form
- "Draft restored" message appears when recovering a draft
- Can clear the draft to start fresh
- Drafts are saved separately for new vs. edit forms

**Priority:** High (Must Have)

---

### Epic: Cloud Synchronization

#### Story 7.1: Sync Snippets to Cloud
**As a** developer
**I want to** sync my snippets to the cloud
**So that** I can access them from any device

**Acceptance Criteria:**
- "Sync" button is visible when logged in
- Manual sync uploads all local changes to the server
- Progress indicator shows sync status
- Success message confirms sync completion
- Conflicts are resolved with server-wins strategy

**Priority:** High (Must Have)

---

#### Story 7.2: View Sync Status
**As a** developer
**I want to** see which snippets are synced or unsynced
**So that** I know what changes need to be synced

**Acceptance Criteria:**
- Visual badge on snippets indicates sync status
- "Unsynced" badge shows local changes not yet uploaded
- "Synced" badge shows snippet is up-to-date
- Badge is visible on snippet cards in the main view

**Priority:** Medium (Should Have)

---

#### Story 7.3: Automatic Sync
**As a** developer
**I want to** have my snippets sync automatically
**So that** I don't have to remember to manually sync

**Acceptance Criteria:**
- Changes are synced automatically in the background
- Sync happens when creating, editing, or deleting snippets
- Fails gracefully if offline (queues for later)
- Sync status indicator shows activity

**Priority:** Medium (Should Have - Future Enhancement)

---

## User Experience

### Epic: Responsive Design

#### Story 8.1: Mobile-Friendly Interface
**As a** developer
**I want to** access snippets on my mobile device
**So that** I can reference code while working away from my desk

**Acceptance Criteria:**
- Interface is fully responsive on mobile screens
- Folder sidebar collapses to a hamburger menu on mobile
- Snippet cards stack vertically on small screens
- Touch targets are at least 44x44 pixels
- Text is readable without zooming

**Priority:** High (Must Have)

---

#### Story 8.2: Keyboard Shortcuts
**As a** developer
**I want to** use keyboard shortcuts to navigate quickly
**So that** I can work more efficiently

**Acceptance Criteria:**
- Press "/" to focus search bar
- Press "N" to create new snippet
- Press "ESC" to close dialogs or modals
- Shortcuts are documented in a help modal
- Shortcuts don't conflict with browser defaults

**Priority:** Medium (Should Have)

---

#### Story 8.3: Copy Snippet to Clipboard
**As a** developer
**I want to** quickly copy a snippet's code to my clipboard
**So that** I can paste it into my editor

**Acceptance Criteria:**
- "Copy" button is prominent on snippet detail view
- One-click copies the entire code body
- Success message confirms the copy
- Copied text can be pasted immediately
- Keyboard shortcut (Ctrl/Cmd+C) also works

**Priority:** High (Must Have)

---

#### Story 8.4: Dark Mode Support
**As a** developer
**I want to** use the app in dark mode
**So that** it's comfortable to use in low-light environments

**Acceptance Criteria:**
- Dark mode is available as a theme option
- Theme preference is saved across sessions
- All components are readable in dark mode
- Colors have sufficient contrast for accessibility

**Priority:** Low (Could Have - Future Enhancement)

---

## Future Enhancements

### Epic: Collaboration (Phase 2)

#### Story 9.1: Share Snippets with Team
**As a** developer
**I want to** share snippets with my team
**So that** we can all benefit from common code patterns

#### Story 9.2: Comment on Snippets
**As a** developer
**I want to** add comments to shared snippets
**So that** I can explain context or suggest improvements

#### Story 9.3: Version History
**As a** developer
**I want to** see previous versions of a snippet
**So that** I can revert changes if needed

---

### Epic: Import/Export (Phase 2)

#### Story 10.1: Import Snippets from Other Tools
**As a** developer
**I want to** import snippets from other snippet managers
**So that** I can migrate my existing library to Snipkey

#### Story 10.2: Export Snippets as JSON
**As a** developer
**I want to** export my snippets as JSON
**So that** I can back them up or migrate to another tool

---

## Priority Legend

- **High (Must Have):** Core functionality required for MVP
- **Medium (Should Have):** Important features that improve user experience
- **Low (Could Have):** Nice-to-have features for future iterations

---

## Implementation Notes

- All user stories should be implemented following the project's coding standards (Biome configuration)
- Each feature should include proper TypeScript types
- Server functions must use appropriate authentication middleware
- All user-facing text should be clear and concise
- Accessibility (WCAG 2.1 AA) should be considered for all features
- Mobile-first responsive design approach should be used

---

## Definition of Done

A user story is considered complete when:

1. **Functional Requirements Met:** All acceptance criteria pass
2. **Code Quality:** Passes Biome linting and TypeScript type checking
3. **Testing:** Manual testing confirms expected behavior
4. **Accessibility:** Keyboard navigation and screen reader compatibility verified
5. **Responsive Design:** Works on desktop, tablet, and mobile viewports
6. **Documentation:** Code is self-documenting with clear variable/function names
7. **No Regressions:** Existing functionality remains working
