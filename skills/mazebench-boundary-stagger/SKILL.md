---
name: mazebench-boundary-stagger
description: Design, build, and verify MazeBench puzzles in which fixed boundaries and offset movable rigid groups unlock a route. Derive shapes and movement dependencies from the goal; users need not supply shapes, coordinates, or solutions. Includes an official staircase example and different authored shapes. Not for model evaluation.
---

# Boundary Stagger

Build mechanisms where a fixed boundary constrains a rigid group's movement and changing the relative placement of independent groups releases a useful move, pushing position, or walking route. A visible hole or two moved boxes alone does not establish this mechanism.

Use the official engine, Toolbox tokens, editor format, solver, and ordinary replay. Black walls are ordinary fixed walls; blue cells with the same group ID move rigidly. Different IDs interact through current contact, not permanent binding. Do not invent pulling, rotation, diagonal squeezing, or new physics.

## Autonomous design

The user supplies a goal and necessary constraints. Choose the shapes, group roles, boundaries, player start, gem, preparation, and solution yourself. Unspecified geometry is a design choice, not a reason to ask the user for coordinates. Respect explicitly requested shapes or heights as task constraints.

1. **Choose the route to unlock.** Identify the connected walking region the player needs to reach and which occupied cells currently separate it from the start. Distinguish a walkable corridor from isolated or diagonally touching holes.
2. **Derive the boundary restriction.** Identify a specific destination cell or pushing position blocked by a wall, notch, or confined bay. Account for every member of the rigid group, not just the cell being pushed.
3. **Choose the enabling change.** Decide how another group's translation releases a contact chain, exposes a pushing position, provides parking clearance, or permits temporary displacement and restoration. State the necessary causal dependency before choosing a silhouette.
4. **Derive geometry.** Connect each group's functional cells into a legal rigid shape. Size protrusions, recesses, stems, and bays from their contact, clearance, and stance roles. Preserve player access between stages. A staircase pair is one solution, not a required template.
5. **Construct the initial state.** Ensure the claimed route is initially blocked, the first push is reachable, and the complete preparation is possible. Use a fresh draft and official cells. Explain clues and predicted mistakes without claiming a solver proves human insight or difficulty.
6. **Validate and revise.** Solve, replay, measure reachable walking regions with objects frozen, search relevant bypasses, and test the boundary's specific role. Adjust the actual conflicting footprint, stance, or support; avoid padding the puzzle with unrelated obstacles.

This is an authoring process, not a universal player action sequence. Reuse evidence sensibly: fixture import is reproduction; changing only coordinates, lengths, or orientation is a parameter variant. A new geometry need not invent new physics. Require changed necessary dependencies or object roles only when structural diversity is requested.

## Evidence and limits

- Separate file facts, rule-based hypotheses, replay observations, and exhaustive restricted-search conclusions. A legal solution, use of the intended mechanism, and necessity are different claims.
- Record player and all group cells before/after key moves, directly pushed group, affected groups, relative offsets, actual contacts or blocked destinations, and route changes. Verify a real stance exists; visual alignment is insufficient.
- A successful paired-room delivery needs more than both groups moving: show a cross-group enabling dependency linked to the boundary. The current checker requires a wall intervention that admits a blocked group push and allows the full goal without the declared preparation. Use equally specific evidence for a different supported pattern; never weaken the test to “both moved.”
- Exhausted restricted searches establish only their stated exclusion and modeled initial state. Caps mean **unknown**. Wall removal can also change walking access; it does not prove a unique or globally minimal shape. Check illegal shortcuts after composition.
- The supplied checker covers one 16-by-16 room, two independent M0–M4 groups, one player and gem, floor/wall terrain, and z=0 motion. It rejects extra groups, rooms, layers, and unsupported tokens. The skill's concept is broader than this implemented profile: adapt and validate the checker before claiming other dimensions or modules work.
- Keep engine code, official maps, existing drafts, and evidence intact. Use fresh IDs and outputs. Do not launch evaluated models, Prime, paid evaluation, releases, or remote publication as part of this skill.

## Read as needed

- [Design and verified rules](references/design.md): functional geometry, alternatives, boundary reasoning, capability limits.
- [Examples](references/examples.md): official HxH identification, coordinates, traces, two different authored layouts, and a rejected ordering claim.
- [Usage and validation](references/usage.md): construct custom cells, reproduce fixtures, run the official solver, interpret contracts and reports.
- [Composition](references/composition.md): inputs, occupied region, outputs, preserved access, and relation to hook-transfer.

Start with `scripts/build.cjs` for a fixture or a new authored cells specification, then `scripts/verify.cjs`. Use `scripts/check-examples.cjs` and `scripts/check-negative.cjs` when changing shared construction or verification logic. Deliver a playable draft, Build JSON, concise mechanism explanation, verified route, and evidence with explicit remaining uncertainties.
