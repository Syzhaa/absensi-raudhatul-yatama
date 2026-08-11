# Aggressive React Refactor Design

## Goal

Reduce source line count significantly while improving readability and preserving the exact behavior of the current local worktree.

## Baseline

- Use the latest local worktree, including all existing modified and untracked source files.
- Do not restore files from `HEAD` or discard pre-existing local changes.
- Do not push changes.
- Record source line counts before and after refactoring.

## Scope

- `src/pages/Attendance.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Login.jsx`
- `src/pages/ScanQR.jsx`
- `src/pages/Settings.jsx`
- `src/pages/Students.jsx`
- `src/pages/Teachers.jsx`
- `src/pages/Users.jsx`
- `src/components/*.jsx`
- `src/hooks/*`
- `src/services/*`
- `src/store/*`
- `src/context/*` if introduced or present during implementation

## Refactoring Strategy

1. Collapse multiline Tailwind class strings into readable single-line strings without changing class tokens, order, responsive variants, or rendered markup.
2. Remove only proven unused imports, state, variables, unreachable JSX, redundant wrappers, and redundant comments.
3. Simplify handlers, returns, conditionals, array operations, and temporary variables only when evaluation order and runtime behavior remain identical.
4. Extract shared code only for large, genuinely identical patterns where the total codebase becomes smaller and clearer. Primary candidates are duplicated Students/Teachers dialogs, form actions, and pagination.
5. Keep page-specific markup local when extraction would require many flags or hide behavior.
6. Remove the untracked `format-tailwind.js` script because it only generates the line-expanding format and is not runtime code.

## Behavior Boundaries

Do not alter:

- API endpoints, methods, parameters, payloads, response handling, or interceptors.
- Authentication, authorization, role handling, and effective institution selection.
- React Query keys, enablement, invalidation scope, retry behavior, or cache update semantics.
- Zustand fields, actions, persistence name, defaults, or storage schema.
- IndexedDB name, version, stores, keys, transactions, and deletion ordering.
- Background synchronization ordering, retry timing, success checks, or browser events.
- QR scanning lifecycle, camera permissions, debounce timing, hashes, signatures, secret fallback, or online/offline flow.
- SSE endpoints, parsing, reconnect timing, abort lifecycle, effect dependencies, and cache writes.
- Routing, props, event timing, form validation, modal dismissal, or visible UI behavior.

Known defects, including literal interpolation artifacts in `Attendance.jsx`, remain unchanged because correcting them would change current behavior.

## Components And Data Flow

- Existing pages remain route-level owners of their current queries, mutations, state, and domain behavior.
- Shared components may absorb only presentation duplicated with identical DOM and event semantics.
- Sensitive hooks and services receive conservative local cleanup only.
- No new dependency, generalized component library, universal modal, or speculative abstraction will be added.

## Error Handling

Preserve every current `try`/`catch`, fallback value, alert/modal path, rejection, redirect, and cleanup side effect. Do not remove `await` where it affects catch boundaries, sequencing, or durable storage completion.

## Verification

1. Capture baseline line counts from the current local worktree.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Run `git diff --check`.
5. Run `git diff --stat`.
6. Review diffs for API, state, props, events, hooks, routing, authentication, IndexedDB, localStorage, background sync, and business-logic changes.
7. Fix regressions and rerun verification.
8. Report per-file before/after counts, total reduction, refactor categories, and command results.

## Success Criteria

- Current local application behavior remains unchanged.
- Source code becomes shorter and easier to read.
- Significant files show measurable line reduction; already-clean files need not change.
- Lint, build, and diff checks pass, or pre-existing failures are reported precisely.
- No documentation file is removed.
- Nothing is pushed.
