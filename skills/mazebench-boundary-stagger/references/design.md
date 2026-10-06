# From a blocked route to useful geometry

Read [Mechanism logic](mechanism-logic.md) first for new layouts. Derive user goal -> roles and relations -> player stance/contact -> shape, connection, support, and clearance -> layout -> full-goal verification. Explain this map's realization of each chosen inherited relation; source shapes and coordinates are regression evidence, not starting geometry.


Use this method when moving independent rigid groups relative to fixed boundaries should change a route, a pushing stance, or another group's movement clearance. The desired dependency comes first; the shapes are design decisions. User-specified geometry is a task constraint, not a permanent skill rule.

## Design process

1. **Specify the change.** Identify a blocked gem approach, an inaccessible pushing stance, or an obstructed destination footprint. State what becomes reachable after the mechanism works. Check walking with all objects frozen before designing additional moves.
2. **Locate the real obstruction.** For a proposed direction, consider every cell of the translating rigid group and every group added by contact propagation. A boundary may stop the leading member, block the player behind a member, or prevent an unwanted escape. A wall's appearance alone establishes none of these roles.
3. **Derive a useful offset.** Choose which independent group must move and which overlap, contact, or occupied stance that translation removes. Record the other group's allowed direction or the newly connected floor cells. Visible holes between shapes need not form a continuous player route.
4. **Connect only the necessary shape parts.** A prong can reach a blocking cell; a recess can admit the player; a crossbar can obstruct several lanes at once; a stem can provide an alternative pushing face. Connect these parts as one legal rigid group and check its entire swept footprint. Do not choose a silhouette merely because it resembles a staircase, hook, or letter.
5. **Provide the preparation space.** The player must actually reach the first pushing face and later change sides where required. Include a parking area or temporary sacrifice, such as covering the gem, only when it creates a useful state. Verify forward moves; reverse planning does not grant a pulling action.
6. **Place purposeful boundaries.** Use a stop to bound an offset, a notch to forbid a tempting translation, or a sealed edge to make a particular opening matter. Check that each important wall blocks the claimed member or stance. Check that excess space does not create a bypass.
7. **Build and test the full task.** Define group roles, expected motion events, and the goal before selecting checks. Solve through the official engine, replay every action, then test frozen groups, fixed relative offset, and the named preparation restrictions. Adjust the actual collision, access, or contact problem when a counterexample appears.

These are design decisions, not a universal player action sequence. Two preparations may commute. An unnecessary early restoration may be possible even when a later restoration is useful.

## Geometry and coverage

Derive bent, forked, stepped, or unequal shapes from their useful cells. A recess may admit a pushing stance; a protrusion may reach a blocked lane; a crossbar may temporarily occupy a later route. Check the full shape and the actual sequence of access changes.

Default to ordinary floor at z=0. The reusable construction and checker cover the documented two-group planar profile. Extra groups, height, slopes, unsupported spans, or cross-height contact need a compatible verifier. Separate identities remain separate after touching.

## What counts as evidence

The verified rule basis is the official `games/maze/level_parsing.json` and `toolbox.json` (`M0` through `M4`: weightless boxes; `#`: wall), plus `public/maze-engine.js`: `weightlessGroupMembers`, `collectWeightlessPushCluster`, `moveWeightlessCluster`, and `weightlessComponentSupportedElevation`. The cluster code examines every destination at actual elevation, propagates contact to other groups, and rejects the move when a required destination is blocked. `isSolved` checks the actual collected gem state. These functions, not token names or blue coloring, define the behavior. Source line positions may change between engine revisions.

Record the directly pushed group, action direction, all group translations, player position, relevant contacts or blocking wall cells, and walking reachability before and after the move. Relative offset is the difference between the two groups' translations; preserving that offset while both move is not a stagger event.

Distinguish a legal solution, observed use of the intended event, necessity for the full goal, necessity of a preparation before a particular first event, and the local function of a shape part. They are separate claims. A prefix search ends at a legal first-event opportunity or the gem; reaching that opportunity does not itself prove a complete bypass. Keep a positive control for such searches.

A wall probe should compare the same actor state with only named terrain cells changed. Report the admitted or blocked action and any changed contact cluster. Deleting a wall may also change walking space, so a resulting bypass does not establish globally necessary or unique geometry. Apply the same caution to removing a shape part.

An exhausted restricted search supports only its declared room, goal, and forbidden transitions. A search limit means **unknown**. Do not infer difficulty from action count, object count, or area; do not claim a solver proves human insight or that every player must change the camera. The verifier's current planar contract must reject unsupported scenarios rather than silently accepting them.

## Common failures

- A visible opening is only diagonal or isolated: inspect frozen-object walking reachability and clear a cardinally connected corridor.
- A push joins another group that hits a remote wall: inspect every member destination and release that contact or provide meaningful clearance.
- An intended push has no accessible rear stance: provide a functional recess or intermediate offset; an empty destination alone is insufficient.
- A boundary removal opens an unintended entrance: recheck the complete goal and disclose the changed walking space in controls.
- Matching group IDs accidentally bind distant pieces: allocate distinct official IDs and update the contract before testing.
- A push parks a needed face against a wall: search the resulting state, then check official Undo/Reset. The optional browser helper exercises the first push only; check additional error states when the design requires them.
