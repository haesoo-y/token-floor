# Token Floor Development Rules

## Design Principles

- Prefer maintainable package boundaries and explicit data flow over temporary workarounds.
- Handle provider-specific behavior in adapters and the normalization layer. The UI and office scene must consume only normalized contracts.
- Split production source files by responsibility before they exceed 200 lines.

## Components and Hooks

- Before creating a component or hook, search `packages/web/src/components` and `packages/web/src/hooks` for an existing reusable implementation.
- Place UI primitives shared across multiple features in `packages/web/src/components/common`.
- Extract state or lifecycle logic repeated across screens or components into a shared hook.
- Do not prematurely generalize simple presentation or thin wrappers used in only one place.

## Documentation and Comments

- Write English TSDoc for public contracts, complex hooks, state projections, security boundaries, and asynchronous lifecycles.
- Add English comments for non-obvious branches and constraints. Explain the intent rather than restating the implementation.
- Add a comment to any `useEffect` that manages subscriptions, external runtimes, cleanup, or race prevention. Explain why the effect runs and the lifecycle it owns.
- When service-level code overrides the internal styles of a shared UI component, add a Korean comment immediately above the override. The comment must explain the shared component's original behavior and why the override is necessary.

## Verification

- Add unit tests for every behavioral change.
- Run `format`, `lint`, `typecheck`, `test`, and `build` before completing a change.
