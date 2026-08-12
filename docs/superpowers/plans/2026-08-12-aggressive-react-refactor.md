# Aggressive React Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce current local React source from its 8,979-line baseline while preserving all behavior.

**Architecture:** Keep current file boundaries. Compact generated Tailwind formatting first, then apply only locally provable dead-code and expression cleanup. Avoid abstractions that alter DOM, lifecycle, contracts, or merely move LOC.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 3, TanStack Query 5, Zustand 5, Axios, idb, html5-qrcode, Oxlint.

## Global Constraints

- Latest local worktree is baseline; preserve all existing modified/untracked source work.
- Never restore from `HEAD`, reset, checkout, amend, push, or touch `.git` internals.
- Do not create additional commits unless user explicitly asks.
- Preserve API, auth, routing, query keys/options, state, storage, sync, scanner, SSE, validation, errors, DOM, and UI behavior.
- Preserve Tailwind tokens and token order exactly.
- Keep known defects, including literal interpolation artifacts in `Attendance.jsx`.
- Add no dependency or speculative abstraction. Remove no documentation.
- Baseline: 8,979 lines; lint exits successfully with warnings; build passes.

## File Map

- `src/pages/*.jsx`: route UI and domain behavior; local compaction only.
- `src/components/*.jsx`: shared UI; local compaction and proven dead-state removal.
- `src/hooks/*.js`, `src/services/*.js`, `src/store/*.js`: behavior-sensitive infrastructure; conservative cleanup.
- `format-tailwind.js`: delete; untracked non-runtime line-expansion script.

---

### Task 1: Freeze Local Baseline

**Files:**
- Read: `src/pages/*.jsx`, `src/components/*.jsx`, `src/hooks/*.js`, `src/services/*.js`, `src/store/*.js`
- Create outside repo: `/tmp/opencode/absen-refactor-before-lines.txt`, `/tmp/opencode/absen-refactor-before-src.patch`

**Interfaces:**
- Consumes: approved current worktree.
- Produces: immutable comparison evidence outside Git.

- [ ] **Step 1: Record counts and tracked source diff**

```bash
wc -l src/pages/*.jsx src/components/*.jsx src/hooks/*.js src/services/*.js src/store/*.js > /tmp/opencode/absen-refactor-before-lines.txt
git diff -- src > /tmp/opencode/absen-refactor-before-src.patch
```

Expected: count ends with `8979 total`, unless concurrent edits establish fresh baseline.

- [ ] **Step 2: Confirm baseline**

```bash
npm run lint
npm run build
git status --short
```

Expected: commands exit `0`; temporary files absent from Git status.

---

### Task 2: Compact Generated JSX Formatting

**Files:**
- Modify: `src/pages/*.jsx`
- Modify: `src/components/*.jsx`
- Delete: `format-tailwind.js`

**Interfaces:**
- Consumes: multiline literal `className` values.
- Produces: identical whitespace-separated class values and JSX behavior.

- [ ] **Step 1: Record expanded classes**

Search `src/pages` and `src/components` for literal `className` values starting on the next line. Expected: approximately 232 occurrences.

- [ ] **Step 2: Compact static class strings**

Replace only whitespace representation:

```jsx
className="
  bg-white
  border-2
  rounded-xl
"
```

with:

```jsx
className="bg-white border-2 rounded-xl"
```

Do not reorder tokens. Do not alter interpolation expressions or JSX structure.

- [ ] **Step 3: Delete generator and verify**

Delete `format-tailwind.js`, then run:

```bash
npm run lint
npm run build
git diff --check
```

Expected: exit `0`; no new lint errors; build passes.

---

### Task 3: Clean Pages And Components Locally

**Files:**
- Modify: `src/pages/Attendance.jsx`, `src/pages/Dashboard.jsx`, `src/pages/Login.jsx`, `src/pages/ScanQR.jsx`
- Modify: `src/pages/Settings.jsx`, `src/pages/Students.jsx`, `src/pages/Teachers.jsx`, `src/pages/Users.jsx`
- Modify: `src/components/AttendanceModal.jsx`, `src/components/ConfirmModal.jsx`, `src/components/ErrorBoundary.jsx`, `src/components/Layout.jsx`, `src/components/Modal.jsx`

**Interfaces:**
- Consumes: existing props, queries, mutations, handlers, and JSX.
- Produces: same interfaces and runtime behavior with less local code.

- [ ] **Step 1: Remove only lint-proven dead bindings**

Allowed removals:

```text
Layout.jsx: showAddForm, setShowAddForm, newKelasName, setNewKelasName, userLembaga, unreachable showAddForm paragraph
Attendance.jsx: eventSourceRef, selectedKelas
Settings.jsx: settings
ErrorBoundary.jsx: unused error parameter and unused errorInfo state
```

Keep `AttendanceModal`'s `lembaga` prop and scanner/SSE catches because removing them can change public interfaces or behavior-sensitive structure.

- [ ] **Step 2: Apply exact expression cleanup**

Use concise returns and direct handlers only when signatures and evaluation timing match:

```js
const handleClose = () => setOpen(false);
```

```jsx
<Modal onClose={resetForm} />
```

Do not change effect dependencies, request ordering, `await` catch boundaries, query keys, mutation callbacks, object-spread updates, timeout timing, or modal timing.

- [ ] **Step 3: Apply strict abstraction gate**

Extract only markup with identical class tokens, DOM order, callbacks, and lifecycle when total repository LOC decreases. Do not create universal modal, field, button, entity-page, scanner, or service framework.

- [ ] **Step 4: Verify page/component batch**

```bash
npm run lint
npm run build
git diff --check
```

Expected: exit `0`; removed dead-binding warnings disappear; existing scanner hook warnings may remain.

---

### Task 4: Clean Hooks, Services, And Store Conservatively

**Files:**
- Modify only when demonstrably smaller and equivalent: `src/hooks/*.js`, `src/services/*.js`, `src/store/useAppStore.js`

**Interfaces:**
- Consumes: exported hook, service, and store contracts.
- Produces: same export names, signatures, payloads, return values, timing, storage keys, and side effects.

- [ ] **Step 1: Compact safe wrappers**

Allowed examples:

```js
getPendingScans: () => db.getAll("offline_scans")
```

Do not remove exported methods, persisted fields/actions, or response unwrapping where `await` determines a catch boundary.

- [ ] **Step 2: Protect sensitive flows**

Do not restructure:

```text
api.js: token headers, test-mode parameters, 401 redirect and rejection
db.js: database/store identity, transactions, tx.done, deletion order
useBackgroundSync.js: online guard, success guard, deletion before event, listeners/timer
useEffectiveLembaga.js: role and institution selection, query options
index.js: signature generation, SSE/log ordering, endpoint paths
useAppStore.js: persist name, defaults, field/action names
```

- [ ] **Step 3: Verify infrastructure batch**

```bash
npm run lint
npm run build
git diff --check
```

Expected: exit `0`; API/storage/auth behavior unchanged by inspection.

---

### Task 5: Measure And Verify Final Result

**Files:**
- Read: all target source files
- Read: `/tmp/opencode/absen-refactor-before-lines.txt`

**Interfaces:**
- Consumes: completed local refactor.
- Produces: final evidence and report; no commit or push.

- [ ] **Step 1: Record final line counts**

```bash
wc -l src/pages/*.jsx src/components/*.jsx src/hooks/*.js src/services/*.js src/store/*.js > /tmp/opencode/absen-refactor-after-lines.txt
wc -l src/pages/*.jsx src/components/*.jsx src/hooks/*.js src/services/*.js src/store/*.js
```

Expected: total below current baseline; significant JSX files show large reductions.

- [ ] **Step 2: Run mandatory checks**

```bash
npm run lint
npm run build
git diff --check
git diff --stat
```

Expected: all commands exit `0`; lint may retain only documented pre-existing warnings.

- [ ] **Step 3: Review behavior-sensitive diffs**

Inspect diffs for these exact categories:

```text
API endpoints/methods/params/payloads
query keys/options/invalidation/cache writes
props/events/effect dependencies
auth/role/routing
Zustand/localStorage/IndexedDB
background sync/QR/SSE timing
validation/errors/modal lifecycle
```

Expected: no unapproved behavioral delta. Revert only refactor hunks causing a delta; never revert pre-existing user changes.

- [ ] **Step 4: Produce final report**

Report files analyzed/changed, per-file before/after/reduced counts, totals and percentage, refactor categories, safety invariants, lint/build/diff results, and `READY` or `NEEDS FIX`.

- [ ] **Step 5: Keep everything local**

```bash
git status --short
```

Expected: refactor remains in local worktree. Do not stage, commit, or push.
