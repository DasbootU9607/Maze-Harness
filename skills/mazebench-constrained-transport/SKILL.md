---
name: mazebench-constrained-transport
description: Design, build, and structurally verify MazeBench tool transport puzzles. Default to shared workspace changes, purposeful recovery, repeated helper roles, and usable delivery, with full GxF case evidence. For authoring, not model evaluation.
---

# MazeBench Constrained Transport

Build puzzles where a tool has a concrete purpose and reaching an operable working position is itself a puzzle. Plan the complete rigid footprint, helper configurations, and reachable pushing faces. A path for the tool's center or several objects moving together is insufficient.

## Required reading and default complex mode

Before building or iterating on a level, read the [complete official case and mechanism analysis](references/official-case.md) and inspect the key states and spatial relationships that the new design will inherit. Identify necessary mechanisms, prerequisites, stage dependencies, and variable elements before choosing shapes, coordinates, or a layout. The abstract summary in this entrypoint is insufficient. Default authoring requires connected planning beyond a single offset, release, or contact followed only by walking.

Read the case belonging to the skill in use; other cases are needed only when their mechanisms are being combined. A previously read, unchanged version may be reused. A filename, link, or summary is not a reading record. Record the path, content fingerprint, and inherited relationships; reading does not replace necessity or bypass checks.

Before laying out a default complex room, also read [Planning depth](references/planning-depth.md) and the [contract and verification interfaces](references/complex-validation.md), then establish a concise design contract. Include at least three interdependent functional stages. Walking, repeated pushes in one direction, separately clearing unrelated obstacles, and returns without a functional effect do not count. Declare all members and elevations, fixed boundaries, voids and support, stage access regions, complete blocked destinations and stances, releasing actions, recovery space, key inputs and contacts, and subsequent work. Identify where the new geometry carries each inherited function.

Complex mode uses `scripts/build-complex.cjs` and `scripts/verify-complex.cjs`. The basic entrypoints and fixed fixtures retain their existing profiles; passing them does not certify a default complex room. Use the basic workflow for an explicitly requested local demonstration or reproduction and label its mode accurately. Missing evidence, unsupported inputs, and capped searches are unknown and cannot pass.

## Work backward from use

The user supplies a goal and necessary constraints. Choose the tool, helpers, route, parking areas, player start, and gem position. Unspecified shapes and coordinates are design variables.

1. Define the useful target change and how it enables the objective. Check the tool-use relationship before adding transport restrictions.
2. Define operable delivery: the full tool footprint and elevation, the player's reachable pushing cell, and a legal input direction.
3. Derive transport stages from every member's destination, support, propagated contacts, and access to the next pushing face. Preserve circulation between stages.
4. Give each helper a causal role. Identify the blocked tool move, parking area, or stance that the helper releases. Independent repositioning must do useful work.
5. Construct an unprepared but solvable start. Include retreat, temporary parking, or helper reuse when it follows from the shared-space constraints.
6. Solve and replay the full task, record delivery and actual contact, and test claimed helper, tool-use, and preparation dependencies. Revise geometry from counterexamples.

Read [Design and composition](references/design.md) for stage interfaces and failure diagnosis. For default complex authoring, read [Planning depth](references/planning-depth.md): make useful configurations change across stages, with a concrete reason for temporary moves and recovery. Avoid a row of unrelated blockers removed once each.

## Rules and scope

- Use the official Toolbox, parser, save services, engine, and solver. Same M ID means one rigid group. Do not invent pulling, rotation, snapping, or permanent attachment; camera rotation does not rotate objects.
- Let the official engine determine complete footprints, contact propagation, and support. Void `+` differs from floor `.`. A supported overhang does not establish arbitrary spans or elevations.
- The legacy basic checker covers one enclosed 16-by-16 planar room, one player and gem, floor/wall/void cells, and 3-5 independent groups from M0-M4. A delivered tool directly pushes one target at the same elevation. Layers, slopes, ice, gates, clones, and room transitions are unsupported.
- A complete route, observed tool use, necessary tool use, and necessary preparation are distinct claims. Freezing a helper does not prove a unique order or exact parking pose. Capped and unsupported checks are not passes.
- Optionally combine boundary staggering for clearance released by offsets and hook transfer for useful contact geometry. The skills have separate responsibilities and no script dependency on each other. Revalidate the combined layout.

## Build and deliver

Default new authoring uses the complex contract and entrypoints in [Complex validation](references/complex-validation.md). Use [official-design.json](references/official-design.json) as a runnable schema example, then author the new geometry and its own evidence:

```text
node scripts/build-complex.cjs --repo ENGINE --spec SPEC.json --out NEW_BUILD_OUTPUT
node scripts/verify-complex.cjs --repo ENGINE --spec SPEC.json --out NEW_CHECK_OUTPUT --cap 1000000
```

Use the following basic workflow only for an explicitly requested compact mechanism demonstration or a supported legacy profile. Label that result accordingly; a basic pass does not certify default complex authoring.

Read [Specification and verification](references/verification.md), author custom `cells` and a matching `contract`, and use fresh outputs:

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_OUTPUT
node scripts/verify.cjs --repo ENGINE --out NEW_OUTPUT --cap 1000000
```

Deliver Play/Edit links, Build JSON, a concise mechanism explanation, a verified route, role assignments, the usable delivery state, and scoped restriction evidence. Report which passages and pushing faces survive each stage.

Preserve existing maps, artifacts, and engine code. Do not launch benchmark models, paid evaluations, or remote publication as part of this skill. Input count is not a human-difficulty score.
