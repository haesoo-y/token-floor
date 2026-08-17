# Token Floor Development Rules

## Product Identity and Scope

- Token Floor is a local-first, read-only observability office for Claude Code and Codex sessions. Preserve the core promise: no Token Floor account, provider OAuth flow, API key, copied credential, or second provider sign-in is required.
- Treat the provider's existing local runtime state as the integration boundary. Token Floor may observe files, hooks, and cache metadata produced by an already configured provider, but it must never impersonate the user, start a helper agent, or send prompts on the user's behalf.
- Keep the product useful when only one provider is installed. Claude and Codex collection, source health, usage, and presentation must degrade independently.
- Preserve the current Phase 00–04 scope: normalized contracts, the live pixel office, Claude integration, Codex integration, lifecycle reliability, durable sanitized logs, and whiteboard memos.
- Phase 05 CLI, lifecycle commands, one-port production serving, package/license review, and local tarball verification are implemented. Keep npm registry publication, remote provenance, and any browser not actually exercised labeled pending; never imply that registry `npx` or the full Chrome/Edge/Firefox/Safari matrix is complete before external verification.

## Product Standard

- Treat every visible office screen as production game art. A technically functional placeholder is not an acceptable completion state.
- Preserve a coherent top-down pixel-art language across characters, floors, retained props, effects, and overlays.
- Prefer maintainable package boundaries and explicit data flow over temporary workarounds.
- Handle provider-specific behavior in adapters and the normalization layer. The UI and office scene must consume only normalized contracts.
- Split production source files by responsibility before they exceed 200 lines.
- Never mention or copy assets from unrelated public code repositories in source comments, documentation, prompts, or product UI.

## Provider Local State

- Before designing a provider integration, inspect and document the relevant provider-owned local files. Do not assume the data is unavailable until the local roots have been searched.
- Prefer Claude data from `~/Library/Application Support/Claude` and `~/.claude`, and Codex data from `~/.codex`.
- Collect both Claude Desktop and Claude CLI local state when available. Select the newest valid
  snapshot, preferring the more complete snapshot when the provider writes summary and detailed
  cache entries within the same five-second refresh window.
- For CLI-only Claude users, capture provider-supplied rate-limit metadata through a silent local
  observer only when no user-owned status line exists. Never replace a user's status-line command,
  persist its raw input, or launch a helper Claude process to refresh usage.
- Do not introduce OAuth, login, API-key, credential storage, visible terminals, or helper agent processes when provider-owned local state can supply the required data.
- Read provider-owned files only in provider collectors and adapters. Normalize observations before they cross into the server, persistence, protocol, or UI layers.
- Persist normalized usage cache data atomically as JSON and normalized lifecycle events in SQLite under the Git-ignored `.token-floor/` runtime directory. Do not persist raw provider records in either store.
- Server projections and UI code must consume normalized Token Floor contracts, never provider files, credentials, browser storage, or provider-specific payloads directly.
- Refresh local provider caches on a bounded interval, avoid rewriting unchanged snapshots, and retain the last valid cache when a provider file is missing, locked, partially written, or malformed.
- Keep explicit path overrides only as diagnostics or platform fallbacks; provider-owned local state remains the default source of truth.
- Add tests for local-source precedence, normalization, cache persistence, malformed input, and last-known-good fallback whenever provider data collection changes.

## Provider-Neutral Contract

- Keep the normalized lifecycle vocabulary limited to `agent.started`, `agent.active`, `agent.message`, `agent.waiting`, `agent.completed`, `agent.failed`, and `usage.updated` unless a versioned protocol change is approved.
- Keep provider source health in the normalized `healthy`, `waiting`, `missing`, `stale`, `malformed`, and `disconnected` conditions. A valid but unsupported provider record is not malformed input.
- Preserve the separation between agent projections, provider usage, provider source status, sanitized chat messages, and sanitized non-chat events in `OfficeState`.
- Make every event identity stable and provider-scoped. Replaying a record, rereading a partial file, reconnecting a socket, or restarting the server must converge without duplicate logs or renewed UI timers.
- Do not let older events roll an agent projection back from a newer lifecycle state.

## Claude Integration Boundary

- Keep the Claude hook receiver on the loopback-only server. Hook installation must be idempotent, preserve unrelated settings, create at most one recovery backup, and never delay Claude when Token Floor is unavailable.
- Observe Claude session, prompt, tool, permission, notification, subagent, stop, failure, and end boundaries through structural hook fields only. Never project raw prompts, tool inputs, commands, tool results, or assistant payloads from a hook body.
- Admit transcript messages only for agents first established by a meaningful hook. Ignore sidechains and internal orchestration records, exclude tool-use and tool-result blocks, and sanitize visible user and assistant text before normalization.
- Tail Claude project transcripts with bounded reads and tolerate incomplete first or final lines. Never rescan unbounded transcript history on every refresh.
- Preserve user-owned Claude status-line configuration. Install the silent local usage observer only when no user status line exists, and never run a helper Claude process to refresh usage.
- Select Claude usage from supported CLI cache, Desktop cache, plan history, and status-line handoff samples by newest validity; within the same five-second window, prefer the more complete sample.

## Codex Integration Boundary

- Discover recent and already tracked Codex session JSONL files under `~/.codex/sessions` with bounded file counts, prefix reads, tail reads, and incremental cursors.
- Keep incomplete JSONL fragments until the next poll and recover safely when a file is truncated or replaced.
- Derive main-agent, subagent, parent, role, workspace, and execution identities from structural session metadata. Exclude guardian actors and internal orchestration messages from agents, chat, and event logs.
- Normalize `mcp_tool_call_begin`, `mcp_tool_call_end`, and `agent_reasoning` as payload-free `agent.active` heartbeats. Decoder-local inspection may identify a waiting boundary, but opaque tool arguments, tool results, invocation payloads, and reasoning must never cross the adapter boundary.
- Infer waiting only from structurally recognized user-input or escalated-permission requests. Unsupported but valid JSON records must be skipped without raising the malformed-source warning.
- Read Codex rate-limit metadata from recent local rollout records only. Do not introduce Codex authentication, API calls, browser storage, or a helper CLI invocation for usage refresh.

## Lifecycle and Retention

- Normalize ongoing Codex `mcp_tool_call_begin`, `mcp_tool_call_end`, and `agent_reasoning` records as provider-neutral `agent.active` heartbeats without retaining reasoning text, tool input, tool output, invocation data, or other provider payloads.
- Refresh `lastEventAt` from every admitted activity heartbeat. Infer completion only after five minutes without a newer active event, and never infer completion for waiting or error agents.
- Keep normalized event processing idempotent. Duplicate provider records must converge on the same stable event identity and must not reset state or presentation timers.
- Retain completed character projections for 60 minutes from their explicit or inferred completion boundary. Do not remove active, waiting, or error characters because of age alone.
- Character retention and log retention are independent. Removing a completed character must not remove its sanitized chat or event history.
- Keep the latest 100 sanitized chat messages and the latest 100 non-chat events as separate bounded logs. Restore both logs from SQLite after restart even when their character projection has expired.

## Durable Log Safety

- Persist only allowlisted normalized event fields to SQLite. Reapply the allowlist and credential redaction while loading legacy rows.
- Never persist provider source records, reasoning text, tool inputs, tool results, invocations, credentials, guardian activity, or internal orchestration prompts as chat or event logs.
- Continue to remove guardian and internal orchestration projections from agents and both logs when structural provider metadata identifies them.
- Add tests for character/log retention separation, independent 100-entry bounds, SQLite restart recovery, legacy-row allowlisting, credential redaction, and duplicate event handling whenever persistence changes.

## Runtime Storage and Memo Safety

- Keep every runtime artifact under the Git-ignored `.token-floor/` directory. The current durable files are `events.db`, `provider-usage.json`, and `memos.json`.
- Keep memo storage versioned and atomic. Write through a same-directory temporary file, rename on success, and retain the previous valid file when parsing or writing fails.
- Accept memo text only from 1 to 1,000 characters. Preserve stable IDs and ISO creation/update timestamps.
- Allow active memos to be copied, edited, or archived. Allow archived memos to be copied, restored, or permanently deleted; never expose edit or delete actions in the wrong tab.
- Never mix memo persistence with provider logs, SQLite lifecycle retention, or browser local storage.

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
- The current compact office has workspace on the upper left, the sealed executive suite on the lower left, one meeting room on the upper right, coffee lounge at the middle right, and an intentionally empty future zone on the lower right.
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
- Keep the approved 10-second lounge speaker rotation. Preserve the current role-based pause distribution of approximately 9–14.4 seconds for subagents and 11–15.4 seconds for main agents.
- Do not make idle conversation timing configurable or replace the approved short cycle with the superseded 60–120-second proposal.
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
- Prefer actual assistant messages over state-transition speech, and state-transition speech over idle phrases. Never use user messages as agent speech.
- Keep state-transition bubbles visible for 3–5 seconds and do not restart their lifetime when an idempotent event is replayed.
- Keep chat and event panels usable after the related character leaves the office; logs are historical projections, not character-owned UI state.
- Use the shared floating-panel and action-icon primitives for chat, event, memo, and future overlay tools. Panels use translucent dark navy surfaces without backdrop blur.
- Keep the memo and activity panels responsive at 70 viewport-height units and narrow enough that the office remains observable. Position the memo panel above the character picker and away from the right-side activity panel.
- The whiteboard is the memo-panel toggle. One activation opens the panel and the next closes it; do not create a second competing Phaser interaction path beneath the accessible DOM overlay.
- Keep memo actions on the same row as the timestamp and expand control, aligned to the far edge. Use recognizable, accessible icons with labels or tooltips.

## Input and Interaction Ownership

- Arrow keys always control the player, even after a panel, tab, memo, button, or whiteboard receives focus. Capture and prevent arrow-key focus navigation before forwarding the same direction to the game input state.
- WASD controls the player through the same cardinal resolver, except while an input, textarea, or editable element owns text entry.
- Never allow simultaneous horizontal and vertical player displacement. When both axes are held, use the most recently engaged axis.
- Keep the player spawn in the meeting room and preserve the whiteboard at the meeting room's upper-right side unless the office layout is deliberately redesigned and reverified.

## Connection and Degraded Operation

- Keep the app WebSocket connection state separate from each provider's normalized local-source condition.
- Preserve the last valid snapshot while reconnecting. Use bounded retry backoff and recover the newest snapshot after reconnection.
- Represent healthy, waiting, missing, stale last-known-good, malformed-but-continuing, and disconnected provider sources independently so one provider failure never masks the other.
- Locale, avatar preset, provider status, and provider capability may appear in local settings. Do not add idle conversation timing, credentials, provider paths, OAuth, login, or API-key controls.

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

## Documentation Source of Truth

- Keep `README.md`, `docs/README.ko.md`, and `docs/README.ja.md` feature-equivalent. Keep `ARCHITECTURE.md`, `docs/ARCHITECTURE.ko.md`, and `docs/ARCHITECTURE.ja.md` architecture-equivalent.
- Put English, Korean, and Japanese navigation links at the top of every translated document and verify every relative link from the document's own directory.
- Every README must mention all shipped user-visible features, the no-additional-login local-first advantage, current local development commands, runtime storage privacy, and MetroCity asset attribution.
- Credit the MetroCity Free Top-Down Character Pack at `https://jik-a-4.itch.io/metrocity-free-topdown-character-pack`. Do not imply that Token Floor owns or relicenses upstream artwork.
- Keep documentation screenshots under `docs/assets/`, use descriptive alt text and captions, and update or remove screenshots when they materially misrepresent the current UI.
- Keep architecture documents synchronized with actual provider sources, polling bounds, normalization rules, redaction boundaries, HTTP/WebSocket routes, persistence files, retention limits, package ownership, and degraded behavior.
- Document locally verified Phase 05 distribution features consistently in every language. Distinguish package capability from registry availability, and keep npm publication, remote provenance, and untested browsers visibly pending.

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
- For documentation changes, also verify translated heading parity, local Markdown links, image paths, Mermaid fence balance, feature inventory completeness, and accurate separation between local Phase 05 verification and pending external release checks.
