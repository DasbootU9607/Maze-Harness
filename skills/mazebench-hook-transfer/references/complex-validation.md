# Complex room contract and executable verification

Before choosing a layout, read this file, the [complete official case](official-case.md), and [Planning depth](planning-depth.md). Default authoring requires at least three connected functional stages. Legacy scripts and fixtures retain their original profiles for basic mechanisms and regression; their results do not replace this interface.

## Minimum input and commands

Use [official-design.json](official-design.json) as a runnable structural example. Supply `title`, `cells`, and `contract`, optionally with a `witness`. Declare `mode: complex` and profile `planar-hook-depth-v2`. The supported geometry is one 16-by-16 room, one player at z=0, floor, walls and voids, and two to five M0-M4 rigid groups. A gem goal requires exactly one gem; a task without a gem declares an explicit reach coordinate. Declare legal whole-group removal in `allowRemoval`; removal must result from ordinary engine moves. Other elevations, slopes, ice, room transitions, and multiple players are unsupported.

`members` lists every coordinate and elevation, `roles` covers all groups, and `necessaryRoles` supplies per-group freezing checks. `spatial` declares concrete boundaries, voids, support, blocked positions, and reserved space; replay records each stage's frozen-object access region. `inherited` and `changes` map reference functions to new geometry. `readReceipt` records the path and fingerprint of the case read before layout. Scripts check its version; actual reading and timing still require the author's record and human review.

Supported event selectors are `move` (group and optional direction or direct push), `remove` (legal engine removal), `independent-tool`, `contact`, `offset`, and `all-motion`. Contact uses P/I/C/T from the current state, directional member contact, and complete unit translation of both groups. Side contact requires a lateral offset; rear contact requires T behind the player relative to the input direction. Joint movement alone does not establish contact. Delivery combines the player stance, complete tool and target poses, and the next legal ordinary action; a tool center or static alignment is insufficient.

`stages` declares events, actual spatial conflicts, effects, and optional `after` events. `dependencies` specifies `prepare` and `before` (an event opportunity or `goal`), optionally using `after` to restrict history. Every stage needs a dependency. The checker searches for the first usable B opportunity or goal while forbidding preparation A, and runs a positive control with B's event transition forbidden. An unsolved whole-map freeze does not replace that prefix check. Transfer contracts declare independent preparation, force transfer, and work after contact. Boundary contracts declare preliminary preparation, an offset, dependent subsequent movement, and matched `boundaryControls`.

Transport also requires `opposingDirections` and `reuse`. Each opposite-direction restriction ends at a declared real progress opportunity, such as usable contact, or the goal. Reuse records `first`, `return`, `before`, the conflict, and concrete progress. History-aware search tests whether the ordered reuse can be bypassed. The first forward push does not establish progress into the next workspace. If an ordered relationship fails, revise the contract or geometry and preserve the bypass instead of imposing the witness order.

`selectedPost` freezes groups only at specified witness inputs and has selected-state scope. `postContactGroups` tests particular groups after any first-contact history. All modes search for complete solutions requiring only walking after the first key mechanism. An exhausted search excludes that class of solutions; it does not establish solvability from every reachable event state.

`boundaryControls` compares a blocked push at the same player stance reached through an ordinary prefix. Removing the declared wall must enable the corresponding group push and a complete goal bypass without the declared preparation. Record added and lost walking positions to limit claims about side effects. This does not establish global shape uniqueness.

```text
node scripts/build-complex.cjs --repo ENGINE --spec YOUR_SPEC.json --out NEW_DRAFT_OUTPUT
node scripts/verify-complex.cjs --repo ENGINE --spec YOUR_SPEC.json --out NEW_REPORT_OUTPUT --cap 1000000
```

Replay every bypass with ordinary moves and check its restriction. Compare ordinary and search transitions step by step. The official solver supplies a separate positive control for the complete goal. Restriction analysis merges post-push states only within the same frozen-object walking component. Analyzer nodes explicitly clone history and include it in their key because the official A* snapshots do not retain added fields. The cap counts object-configuration/history nodes separately from official action states. Unknown, exceptional, and unsupported contracts report unknown. A pass verifies the declared structural conditions; it does not establish human difficulty.

## Degenerate solutions and human review

Complex mode must exhaust the relevant bypass searches: initial frozen-object walking, each necessary role frozen, mechanism bypasses, dependency prefixes, at most one push followed by walking, histories using only one compass direction for all object pushes even when contact changes the moving cluster, walking alone after the first mechanism, and pre-docked transfer opportunities without independent preparation. Save frozen-object walking regions along the witness after relevant events. Witness length does not exclude short solutions. Missing opposite-direction or reuse evidence cannot pass where required by the profile.

The guidance explains shape functions and transfer of engine relationships. Scripts enforce contracts, physics, declared dependencies, actual contact, degenerate-solution searches, and treatment of unknown. Human review still covers understanding of the case, the design value of spatial conflicts, truthful declaration of necessary functions, reasonable functional correspondence after shape edits, and readable hints. Author self-tests are not independent-author experiments; input counts are not difficulty scores.
