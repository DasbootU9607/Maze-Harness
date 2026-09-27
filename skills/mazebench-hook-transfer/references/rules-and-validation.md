# General mechanics and validation

This is the general layer. Particular directions, C6/L5 shapes, slots, dimensions, and coordinates belong to patterns or examples. Evidence uses official MazeBenchEngine baseline `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe`. Recheck after engine changes or module combinations.

## Verified physics and observation limits

- Official Toolbox Box 0 through 4 use M0 through M4, as confirmed by `level_parsing.json` and `toolbox.json`. Same-ID members form one rigid group even if drawn apart. Contact between distinct IDs does not permanently bind them. Prefer connected geometry unless disconnected rigid membership is intentional and explained.
- In `public/maze-engine.js`, `weightlessGroupMembers` finds members; `collectWeightlessPushCluster` recursively includes blocking pushable groups using each member's actual bottom elevation and destination; `moveWeightlessCluster` performs the legal move. Several moving groups alone do not establish shape cooperation.
- Walls, boundaries, other objects, overhead clearance, support, and slope paths can block the entire move. `weightlessComponentSupportedElevation` participates in support/gravity behavior. Partial overhang can be legal; do not assume an entirely unsupported group will remain suspended.
- Contact depends on actual members and elevations. Overlap in a top view does not prove cross-layer pushing. Uniform group height is not a universal engine restriction, but these examples do not establish arbitrary mixed-height construction.
- Use official paths, slopes, and lifts to acquire stances. Do not invent arbitrary jumping, climbing, teleportation, pulling, or group rotation. Parse `+` stacks officially instead of treating separators as literal elevation counts.
- Orange Button is `o`; Orange Wall is `O`. Multiple buttons in one room must all be pressed to open its orange walls. Floating Floor `f` is consumed when filling a hole and changes terrain. Record those effects when relevant.

## Record observable events

A candidate event needs input direction, directly pushed group/member, actual contact pairs with IDs/member indices/coordinates/heights, complete before/after object states, rigid-shape and survival checks, module changes, and the changed task reachability.

`scripts/contact-events.cjs` accepts roles `{toolGroup,targetGroup,eventKind}`. It currently observes **one player, same-height one-cell translations, and direct contact between two roles**:

| Event | Test | What it does not establish |
|---|---|---|
| `rearTransfer` | Player directly pushes tool; both groups translate one cell in the input direction; a tool destination hits a same-height target; the target contact has a negative projection from the player along the input vector | Not the only hook mode; not proof of necessity |
| `sideTransfer` | Same direct contact and translation; target contact has a nonzero lateral offset from the player's input line | Only a candidate lateral transfer until that offset solves a real stance/reachability problem |
| `coupled` | Verified direct propagation without the shape-purpose conclusion | Not hook acceptance; an ordinary collinear push is coupled but neither rear nor side |

Rear and side events may overlap. This is not an exhaustive, mutually exclusive physics taxonomy. Multi-cell sliding, slope elevation changes, simultaneous clone input, indirect three-object chains, and constraint-only effects need different observers. Engine support and validator coverage are distinct questions.

`candidates` enumerates potential input cells and contact geometry, not support, clearance, or reachability. **Usable docking** additionally requires a normal walking route from the actual player state with objects frozen, followed by a legal triggering move. Legacy z0 and active-bridge observers remain case-specific; do not weaken their checks to imply generality.

## Five separate conclusions

Define the design before choosing checks. `verify.cjs` covers the legacy z0 release template. `verify-structures.cjs` covers its two named contracts. `verify-contact.cjs` covers active lateral transfer onto a plate, not every hook. Its stationary-before-use target, immediate button activation, and post-event frozen-box completion are case assumptions. `--contrast-no-rear` is optional and must not become a prohibition on rear or mixed designs. Recheck assumptions after changing shape, count, elevation, or outcome.

1. **Legal solution:** Official solver returns solved; ordinary moves replay from the original state with survival, objective, shape, and height checks. Replay every solved restricted route used as evidence. Say verified route unless optimality is separately established.
2. **Intended mechanism used:** Show member contacts, force propagation, the stance restriction being solved, and the task-state change. The lateral case also compares goal reachability with all boxes frozen before and after use. A Boolean event is insufficient.
3. **Mechanism necessary in this room:** Delete precisely defined event transitions from the unchanged physics graph and search the full objective. Disabling tool or target motion provides additional checks. Conclusions apply to this initial state and event class, not every possible design.
4. **Active preparation and docking necessary:** Check initial candidate geometry and actual usable events, not merely the player's current distance from a pushing stance. Independent preparation must change relative positions. Use the first-event prefix method below to prohibit preparation, tool preparation, or entry into declared docking geometry. Two-axis transport is optional and case-specific.
5. **Key part has a function:** Use a controlled comparison at the same pre-contact state. Disclose changes to terrain, input access, support, clearance, and other routes. If the remaining input still moves normally while the target does not, the removed part had a local transmission role. This is not global shape uniqueness or minimality.

### First-event prefix search

Do not add a history flag such as `seenEvent` unless cloning, snapshots, and hashing actually preserve it. The existing checks explore the subgraph **before any first event**: reject event edges and the preparation edges under test. The search goal is “gem collected OR a legal next event exists.” Test that boundary by cloning the official state and trying ordinary moves; use a zero heuristic.

- Exhaustion without reaching either goal proves no complete route under the restriction.
- A solved boundary proves an event opportunity can be reached without that preparation; it does not establish a complete bypass. Record the endpoint and check continuation.
- A positive control with preparation allowed must reach the boundary, guarding against an always-false detector.
- Deleting entries into docking geometry is only meaningful if that geometry matches the actual usable contact relationship.

### Search outcomes, controls, and recovery

Only completed `unsolved` or exhausted reachability without the target supports absence of a route under the specified restriction. Capped, interrupted, exceptional, or incomplete searches are **unknown**. The examples deliberately probe cap=1. A nonzero process exit can mean unknown; read the report.

An active-bridge shape control removed the rear tip and found a different 35-input solution. The edit also changed sideways clearance and enabled a different bridge. Preserve this counterexample; neither a failed modified map nor a successful one alone proves a global shape theorem about the original map.

The lateral tip control keeps terrain, player, target, and supported input unchanged; the input still moves while the target stays. This establishes local transmission. Removing the cantilever handle confounds input access and sole pre-event support; disclose both instead of claiming shape minimality.

Solve actual error states to check deadlocks. A successful main route does not mean other pushes are safe. Check official Undo/Reset. Room Reset can retain already collected world gems; use a fresh unfinished session to assess the original state.

## Evidence to deliver

Keep maps/configuration, engine identity, restriction definitions, search caps/counts, ordinary replays, contact states, failures, and unknowns. Browser Play/Edit/save/export and camera inspection are separate acceptance checks. Logic replay does not prove visual clarity or player cognition. Tool recognition and planning remain design goals unless player research establishes them.
