---
name: mazebench-boundary-stagger
description: Design, build, and structurally verify MazeBench boundary and offset puzzles. Default to connected preparation and dependent route opening, with full HxH case evidence. Choose shapes and coordinates autonomously. For authoring, not model evaluation.
---

# MazeBench Boundary Stagger

Build mechanisms where changing the relative placement of independent rigid groups releases a move, pushing position, or walking route constrained by a fixed boundary. A visible opening or two moved objects alone does not establish this mechanism.

## Required reading and default complex mode

Before building or iterating on a level, read the [complete official case and mechanism analysis](references/official-case.md) and inspect the key states and spatial relationships that the new design will inherit. Identify necessary mechanisms, prerequisites, stage dependencies, and variable elements before choosing shapes, coordinates, or a layout. The abstract summary in this entrypoint is insufficient. Default authoring requires connected planning beyond a single offset, release, or contact followed only by walking.

Read the case belonging to the skill in use; other cases are needed only when their mechanisms are being combined. A previously read, unchanged version may be reused. A filename, link, or summary is not a reading record. Record the path, content fingerprint, and inherited relationships; reading does not replace necessity or bypass checks.

Before laying out a default complex room, also read [Planning depth](references/planning-depth.md) and the [contract and verification interfaces](references/complex-validation.md), then establish a concise design contract. Include at least three interdependent functional stages. Walking, repeated pushes in one direction, separately clearing unrelated obstacles, and returns without a functional effect do not count. Declare all members and elevations, fixed boundaries, voids and support, stage access regions, complete blocked destinations and stances, releasing actions, recovery space, key inputs and contacts, and subsequent work. Identify where the new geometry carries each inherited function.

Complex mode uses `scripts/build-complex.cjs` and `scripts/verify-complex.cjs`. The basic entrypoints and fixed fixtures retain their existing profiles; passing them does not certify a default complex room. Use the basic workflow for an explicitly requested local demonstration or reproduction and label its mode accurately. Missing evidence, unsupported inputs, and capped searches are unknown and cannot pass.

## Design from the goal

Choose shapes, roles, boundaries, player start, and gem position from the requested goal. Unspecified geometry is a design choice. Respect explicit user constraints.

1. Identify the connected route or pushing position to unlock. Check the initial walking region with objects frozen.
2. Identify the exact blocked destination or inaccessible pushing face. Account for every member of the rigid group and every group added by contact propagation.
3. Choose the independent displacement that changes this restriction. State what contact, occupied cell, or clearance it removes before choosing a silhouette.
4. Connect functional shape parts and reserve real circulation between pushing faces. A prong, recess, stem, or crossbar needs a concrete role.
5. Construct a reachable initial state. Temporary parking must retain a later extraction face; reverse planning does not grant pulling.
6. Solve, replay, and test the stated dependency and boundary role. Repair the actual obstruction or bypass rather than adding unrelated obstacles.

Read [Design](references/design.md) for geometry and failure diagnosis. For default complex authoring, read [Planning depth](references/planning-depth.md): connect preparation, the dependent operation, and later clearance or restoration. A longer approach does not add planning by itself.

## Rules and scope

- Use the official Toolbox, parser, save services, engine, and solver. Same M ID means one rigid group; separate IDs interact through current contact. Do not invent pulling, object rotation, binding, or diagonal squeezing.
- The legacy basic checker supports one 16-by-16 room, two independent M0-M4 groups, one player and gem, floor/wall terrain, and z=0 motion. It rejects void, extra layers, other mechanics, extra groups, and room transitions. Adapt and validate a checker before claiming broader coverage.
- Keep feasibility, use of a mechanism, full-goal necessity, and preparation order separate. A successful witness proves only that route. Exhausted restrictions prove only their specified exclusions; capped searches are unknown.
- Link the boundary to the cross-group dependency. The legacy basic contract requires the same wall intervention to admit a blocked group push and allow the full goal without a declared preparation. Wall removal may also change walking access; disclose that effect.
- For composition, use [the interface guide](references/composition.md) and revalidate the combined map. Companion skills are optional; this package runs independently.

## Build and deliver

Default new authoring uses the complex contract and entrypoints in [Complex validation](references/complex-validation.md). Use [official-design.json](references/official-design.json) as a runnable schema example, then author the new geometry and its own evidence:

```text
node scripts/build-complex.cjs --repo ENGINE --spec SPEC.json --out NEW_BUILD_OUTPUT
node scripts/verify-complex.cjs --repo ENGINE --spec SPEC.json --out NEW_CHECK_OUTPUT --cap 1000000
```

Use the following basic workflow only for an explicitly requested compact mechanism demonstration or a supported legacy profile. Label that result accordingly; a basic pass does not certify default complex authoring.

Read [Usage and contracts](references/usage.md), author a complete cells specification, and run from this skill directory:

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_OUTPUT
node scripts/verify.cjs --repo ENGINE --out NEW_OUTPUT --cap 300000
```

The builder creates a fresh local draft. Deliver Play/Edit links, Build JSON, a mechanism explanation, a replayed route, and scoped dependency evidence. For key moves, show player/group poses, contacts or blocked destinations, relative offsets, and changed walking regions.

Preserve existing maps and engine code. Do not launch evaluated models, paid evaluations, or remote publication as part of this authoring skill. Report intended difficulty separately from any human playtest findings.
