# React Compiler Setup Guide

## Installation Date
2025-01-15

## What is React Compiler?

React Compiler is a new optimization tool from the React team that automatically optimizes your React components. It eliminates the need for manual `useMemo`, `useCallback`, and `React.memo` in most cases.

**Key Benefits:**
- ✅ Automatic memoization (no more manual `useMemo`/`useCallback`)
- ✅ Better performance out of the box
- ✅ Less boilerplate code
- ✅ Works with React 17, 18, and 19

## Installation

### 1. Install the Babel Plugin

```bash
bun install -D babel-plugin-react-compiler@latest
```

**Installed Version:** `babel-plugin-react-compiler@1.0.0`

### 2. Configure Vite

The React Compiler has been added to `vite.config.ts`:

```typescript
import path from 'node:path'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [
		TanStackRouterVite(),
		react({
			babel: {
				plugins: ['babel-plugin-react-compiler'], // must run first!
			},
		}),
	],
	resolve: {
		alias: {
			'~': path.resolve(__dirname, './src'),
			'@shared': path.resolve(__dirname, './shared/src'),
		},
	},
})
```

**Important:** The React Compiler plugin must run **first** in the Babel pipeline so it can analyze your original source code.

## What Changed in This Codebase?

### Before Manual Optimizations (Now Unnecessary)

These manual optimizations were added during the code review but are now **automatically handled** by React Compiler:

#### 1. Template Parsing Memoization
**File:** `src/routes/snippets.$id.tsx`

**Before (manual):**
```typescript
const parseResult = useMemo(() => (snippet ? parseTemplate(snippet.body) : null), [snippet])
```

**After (with compiler):**
```typescript
const parseResult = snippet ? parseTemplate(snippet.body) : null
// React Compiler will automatically memoize this!
```

#### 2. Component Memoization
**Files:**
- `src/components/PlaceholderEditor.tsx`
- `src/components/snippets/SnippetForm.tsx`

**Before (manual):**
```typescript
export const PlaceholderEditor = memo(function PlaceholderEditor({ /* ... */ }) {
  // component logic
})
```

**After (with compiler):**
```typescript
export function PlaceholderEditor({ /* ... */ }) {
  // component logic - React Compiler optimizes automatically!
}
```

#### 3. useCallback for Hooks
**File:** `src/routes/snippets.$id.edit.tsx`

**Before (manual):**
```typescript
const loadSnippet = useCallback(async () => {
  // ...
}, [id, router])
```

**After (with compiler):**
```typescript
async function loadSnippet() {
  // ... - React Compiler handles memoization!
}
```

## Verification

### Method 1: React DevTools

1. Install React Developer Tools browser extension
2. Run your app in development mode: `bun run dev`
3. Open React DevTools
4. Look for the **"Memo ✨"** badge next to component names

**What to expect:**
- Components optimized by React Compiler will show a sparkle emoji (✨)
- You'll see automatic memoization in action

### Method 2: Check Build Output

Run a production build and examine the compiled code:

```bash
bun run build
```

Look for imports from `react/compiler-runtime`:
```javascript
import { c as _c } from "react/compiler-runtime";
```

This indicates React Compiler has transformed your code.

### Method 3. Runtime Behavior

With React Compiler, your app should:
- ✅ Have fewer unnecessary re-renders
- ✅ Perform better without manual optimizations
- ✅ Work the same way (no breaking changes)

## Configuration Options

React Compiler works out of the box with default settings. If you need to configure it for specific scenarios, you can add a configuration object:

```typescript
react({
  babel: {
    plugins: [
      ['babel-plugin-react-compiler', {
        // Optional configuration
        target: '18' // Target React 18 instead of 19
      }]
    ],
  },
}),
```

**Current Setup:** Using defaults (optimized for React 19, compatible with React 17+)

## Opting Out Specific Components

If a component causes issues after compilation, you can opt it out:

```typescript
function ProblematicComponent() {
  "use no memo";
  // Component code here - compiler will skip this
}
```

**Note:** This should be rare. Fix the underlying issue when possible.

## Cleanup Opportunities

Now that React Compiler is installed, you can simplify the codebase:

### Files to Simplify

1. **src/routes/snippets.$id.tsx**
   - Remove manual `useMemo` for `parseResult`
   - Let React Compiler handle it

2. **src/components/PlaceholderEditor.tsx**
   - Remove `memo` wrapper
   - Remove `memo` import

3. **src/components/snippets/SnippetForm.tsx**
   - Remove `memo` wrapper
   - Remove `memo` import

4. **src/routes/snippets.$id.edit.tsx**
   - Remove `useCallback` for `loadSnippet`
   - Let React Compiler handle it

### Why This is Safe

React Compiler uses "Rules of React" to determine what can be automatically memoized. It's smarter than manual memoization because:
- It analyzes dependencies at compile time
- It only memoizes when beneficial
- It can optimize patterns that manual memoization can't

## Known Limitations

React Compiler won't optimize:
- Components using `"use no memo"` directive
- Code that violates Rules of React
- Some edge cases with mutation/ref mutation

**This is fine:** The compiler will skip unoptimizable code and continue optimizing the rest.

## Performance Expectations

With React Compiler, expect:
- **Same or better performance** than manual optimizations
- **Less boilerplate code** to maintain
- **Fewer bugs** from incorrect memoization dependencies
- **Automatic optimizations** for new code

## Resources

- [React Compiler Official Documentation](https://react.dev/learn/react-compiler)
- [React Compiler Installation Guide](https://react.dev/learn/react-compiler/installation)
- [React Compiler v1.0 Announcement](https://react.dev/blog/2025/10/07/react-compiler-1)
- [TanStack Form Example (Vite + Compiler)](https://github.com/TanStack/form/blob/main/examples/react/compiler/vite.config.ts)

## Next Steps

1. ✅ **React Compiler is installed and configured**
2. ⏭️ **Optional:** Remove manual memoization (useMemo, useCallback, React.memo)
3. ⏭️ **Test:** Run your app and verify optimizations in React DevTools
4. ⏭️ **Monitor:** Check performance in production

## Troubleshooting

### Build Errors

If you see build errors:
- Check that `babel-plugin-react-compiler` is installed
- Verify it's first in the Babel plugins array
- Check the browser console for specific errors

### No "Memo ✨" Badge in DevTools

If you don't see the sparkle badge:
- Ensure you're in **development mode** (`bun run dev`)
- Refresh the browser after starting dev server
- Check that vite.config.ts has the compiler plugin

### Runtime Errors

If components behave differently:
- Check for violations of Rules of React
- Try adding `"use no memo"` to problematic components
- Consult the [React Compiler debugging guide](https://react.dev/learn/react-compiler/debugging)

## Summary

React Compiler is now active and will automatically optimize your React components. You can write simpler code without manual `useMemo`, `useCallback`, and `React.memo`, while getting the same or better performance.

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**
