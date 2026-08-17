# Token Floor Development Rules

## Product Standard

- Treat every visible office screen as production game art. A technically functional placeholder is not an acceptable completion state.
- Preserve a coherent top-down pixel-art language across characters, floors, retained props, effects, and overlays.
- Prefer maintainable package boundaries and explicit data flow over temporary workarounds.
- Handle provider-specific behavior in adapters and the normalization layer. The UI and office scene must consume only normalized contracts.
- Split production source files by responsibility before they exceed 200 lines.
- Never mention or copy assets from unrelated public code repositories in source comments, documentation, prompts, or product UI.

## Asset Source of Truth

- Inspect `.agents/private/reference` before creating or replacing any visual asset.
- Character sprites must be composed from the provided MetroCity character model, outfit, and hair layers.
- Keep the original character face, skin, hair, and authored directional poses intact.
- Codex characters use blue clothing. Claude Code characters use orange clothing.
- Maintain two distinct main-agent sheets, two distinct subagent sheets, and one NPC sheet per provider.
- If the reference pack does not contain a verified hat sprite, do not synthesize, draw, or layer a hat.
- Never stack an unverified headwear row over hair. It can create duplicate heads, broken silhouettes, and frame overlap.
- Player character presets must use the same character pipeline and frame geometry as agent sprites.
- Store every editable asset source under `.agents/private/asset-sources/<feature>` so Git never tracks working atlases, extraction intermediates, or reference renders.
- Do not create asset-source directories inside a package or under `public`.
- Only optimized production sprites that the application loads at runtime belong under `public`.

## Retained Prop Quality

- The approved static prop set contains only meeting tables, plants, and whiteboards.
- Do not reintroduce chairs, sofas, work desks, computers, monitors, coffee machines, cabinets, or their source references unless the user explicitly approves them again.
- Keep each retained prop as an independent transparent raster asset.
- Every visual asset canvas must use width and height values divisible by 32 pixels.
- A 16-pixel multiple is permitted only when the user explicitly names that exception for a specific asset. Do not infer or propagate a 16-pixel exception.
- Do not retain transparent padding merely to force an asset into a square canvas. The whiteboard is an explicit 16-pixel height-unit exception.
- Keep room, wall, passage, and prop footprints aligned to the same 32-pixel grid unless a user-approved 16-pixel exception applies.
- Office walls are currently an explicit 16-pixel exception. Keep passage floor tiles beneath wall openings so no untextured world background appears between rooms.
- Preserve hard pixel edges. Use nearest-neighbor resizing and disable antialiasing in the game renderer.
- Use integer display scales and rounded camera pixels whenever possible.
- Do not ship chroma-key pixels. Chroma-key colors are intermediate build artifacts only.
- Scan every production PNG for visible magenta or green fringe before completion.
- Validate transparency at the corners and around dark outlines after background removal.
- Avoid large flat color fields, smooth vector-like curves, and undetailed single-color silhouettes.
- When a user approves an earlier visual direction, preserve its pixel density, outline weight, palette, perspective, and simplicity during later regeneration.
- Do not interpret a request to improve quality as permission to increase visual complexity.
- Do not replace a damaged asset with a simplified shape. Repair, regenerate, or re-extract the asset.
- Keep an asset generation script when non-trivial cropping, compositing, recoloring, or alpha cleanup is required.

## Character Sprite Rules

- A runtime character must use one coherent precomposed sprite sheet. Do not render body, face, hair, clothes, or headwear as independently moving runtime layers.
- The current composed character sheets use front, right, back, and left direction groups. Keep the runtime-facing mapping covered by unit tests.
- Verify left and right movement visually. The character must face the same direction as its world-space velocity.
- Animate only frames belonging to the active direction group.
- Keep character origin, scale, hit area, label anchor, and speech-bubble anchor consistent across all presets.
- Never allow simultaneous horizontal and vertical displacement in one update.
- Finish one route axis before starting the next. Do not alternate axes every few frames to imitate diagonal motion.
- Player input must support both WASD and arrow keys through the same cardinal-intent resolver.
- Autonomous agents must use the same cardinal movement primitive as the player.
- A change to character composition or frame indexing requires a contact-sheet inspection and an in-browser movement check.

## Office Layout and Density

- Design compact rooms so the player can see nearby agents without traversing large empty areas.
- The current compact office has workspace only on the upper left, an intentionally empty future zone on the lower left, one meeting room on the upper right, coffee lounge at the middle right, and the executive suite at the lower right.
- Split the executive suite into two sealed offices. They have no player passage, contain no decorative doors, and hold one usage NPC per provider.
- Place usage NPCs inside the executive office, not in a generic open usage area.
- Keep the meeting room furnished with a meeting table, a whiteboard, and limited plants.
- Keep the lounge visually distinct using its floor and plants without introducing unapproved props.
- Preserve the five-zone relationship when tuning coordinates; do not collapse it back into three large vertical strips.
- Separate the workspace, lounge, and usage area with visibly different floor tiles and walls.
- Use one uniform, repeatable runtime texture per floor type. Never pass a multi-panel source atlas directly to a room tile sprite.
- Never overlap room rectangles that use different floor textures. A passage must use the destination room texture and begin at the shared wall boundary, not inside the source room.
- Connect rooms through small intentional passages. Do not leave entire walls open.
- Do not add decorative doors unless door interaction is explicitly implemented.
- Give main agents and subagents unique work destinations without coupling those destinations to a removed prop.
- Do not use beds, toys, residential props, or unrelated decoration.
- Avoid large unused floor regions. Tighten room bounds or add useful office zones before adding decoration.
- Keep interactive and frequently observed agents within the default camera composition.
- Layout destinations for agents of the same role must be unique across providers.

## Collision and Depth

- Render characters at 32 by 32 pixels but use a compact 16-by-16 body footprint for collisions. Do not return to center-point collision or expand the body to the full sprite, because either extreme breaks wall separation or 32-pixel passages.
- Define collision footprints from the visible opaque footprint of retained solid props.
- Meeting tables, whiteboards, and walls are solid unless explicitly designed otherwise.
- Route agents around every solid prop. Do not rely only on player collision handling.
- Set prop and actor depth from their floor-contact position so characters pass behind tall objects and in front of low objects naturally.
- Test representative retained prop collisions.

## Agent Placement and Motion

- Allocate physical layout slots independently from provider-specific appearance slots.
- Never derive shared work destinations from the unfiltered global agent index.
- Keep active main agents, active subagents, completed agents, and NPCs in separate destination pools.
- Give each subagent stable speed, pause, route, and destination variation.
- Avoid synchronized spawn paths and identical passage coordinates for multiple agents.
- Stagger agents through narrow passages while preserving cardinal-only motion.
- Idle agents should move between valid lounge destinations and show randomized local phrases without immediately repeating their previous line.
- NPC movement must remain subtle and must not intersect solid props.
- Recalculate a route when status or assigned destination changes.

## Labels, Speech, and Panels

- Render character labels with a translucent background that does not obscure the sprite.
- Include a short session identifier and a stable identity suffix so agents from one session remain distinguishable.
- Keep labels and speech bubbles separate from the pixel canvas in the overlay layer.
- Speech bubbles use a dark translucent surface, readable text, and a compact pointer toward the speaking character.
- Prevent labels and bubbles from covering another character whenever a simple offset can avoid it.
- Keep status cards, usage cards, character selection, and detail panels above the game with explicit z-index layers.
- UI panels must use shared primitives before introducing service-specific components.
- Do not override shared component styling without the required Korean explanatory comment.

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
- Run `format:check`, `lint`, `typecheck`, `test`, and `build` before completing a change.
- Confirm that every production source file remains under 200 lines.
- Scan production assets for chroma residue and unintended semi-transparent fringes.
- Inspect character contact sheets after any sprite composition change.
- Reload the local application and inspect the complete default viewport after any layout or asset change.
- Observe autonomous agents long enough to verify destination separation, passage staggering, idle movement, and bubble placement.
- Move the player in all four directions with both input schemes and verify matching facing frames.
- Check that retained solid props block movement.
- Repeat visual inspection after each correction. Do not declare completion based only on unit tests or a build result.
