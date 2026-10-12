---
name: mazebench-constrained-transport
description: Design and verify MazeBench tool transport puzzles through shared-space exchanges, recoverable parking and usable delivery. Choose axial or offset tools from the final task, using GxF, GxG and GxH evidence. For authoring, not model evaluation.
---

# MazeBench Constrained Transport

Build puzzles where a tool has a concrete purpose and reaching an operable working position is itself a puzzle. Plan the complete rigid footprint, helper configurations, and reachable pushing faces. A path for the tool's center or several objects moving together is insufficient.

Official references: [GxF](references/official-case.md), [GxG](references/official-gxg-case.md), and [GxH](references/official-gxh-case.md). Each revised analysis includes gem collection and return to the room doorway. GxF/GxG use the short bar as the final tool; GxH uses an L and parks the short bar. Select roles from the final contact, complete footprint and player access, rather than assigning the same role to a silhouette in every room.

Use [the reference catalog](references/reference-catalog.json) and [difficulty guide](references/difficulty.md) to select a compatible branch. Their l3 placements are provisional structural estimates, not an official ranking or playtest scores. GxG's target-freeze and transfer-exclusion searches are capped; its complete solution is verified, but those necessity claims remain unknown.

## Required reading and default complex mode

For new maps, first read [Mechanism logic](references/mechanism-logic.md). Extract the functional roles, real input/contact relationships, movement preconditions, structural functions, and causal dependencies before choosing shapes or coordinates. Read [the complete official case](references/official-case.md) and its states/checks when evidence or physics details need confirmation. Skill creation or maintenance requires full case analysis; reproductions retain the complete case workflow. Read other cases only when combining their mechanisms.

Record the mechanism document path, SHA256, and `readBeforeLayout: true` in the new contract. An unchanged previously read version may be reused. The receipt checks document version consistency; it cannot prove reading, timing, understanding, or mechanism necessity. For each inherited relation, identify this map's actual members, boundaries, passages, and stances as described in [the contract interface](references/complex-validation.md).

Before laying out a default complex room, also read [Planning depth](references/planning-depth.md) and the [contract and verification interfaces](references/complex-validation.md), then establish a concise design contract. Include at least three interdependent functional stages. Walking, repeated pushes in one direction, separately clearing unrelated obstacles, and returns without a functional effect do not count. Declare all members and elevations, fixed boundaries, voids and support, stage access regions, complete blocked destinations and stances, releasing actions, recovery space, key inputs and contacts, and subsequent work. Identify where the new geometry carries each inherited function.

Complex mode uses `scripts/build-complex.cjs` and `scripts/verify-complex.cjs`. The basic entrypoints and fixed fixtures retain their existing profiles; passing them does not certify a default complex room. Use the basic workflow for an explicitly requested local demonstration or reproduction and label its mode accurately. Missing evidence, unsupported inputs, and capped searches are unknown and cannot pass.

## Work backward from use

Derive the map in this order: user goal -> functional roles and relationships -> player stances and real contact -> rigid shape, connection, support, and clearance -> layout -> complete-goal verification. Re-derive the spatial implementation without changing core physics. New mechanisms are optional; translation, reflection, renaming, or one added cell alone does not establish substantive variation.

The user supplies a goal and necessary constraints. Choose the tool, helpers, route, parking areas, player start, and gem position. Unspecified shapes and coordinates are design variables.

1. Define the useful target change and how it enables the complete objective, including any return. Compare candidate tools at the terminal contact before adding transport restrictions. Axial reach and offset contact are distinct realizations; an L is not universally too large and a bar is not universally the tool.
2. Define operable delivery: the full tool footprint and elevation, the player's reachable pushing cell, and a legal input direction.
3. Derive transport stages from every member's destination, support, propagated contacts, and access to the next pushing face. Preserve circulation between stages.
4. Give each helper a causal role. Identify the blocked tool move, parking area, or stance that the helper releases. Before exchanging relative positions, reserve the player's next pushing side and future exit route. A parked group may later become an active helper again.
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

Default new authoring uses the complex contract and entrypoints in [Complex validation](references/complex-validation.md). Start new maps with [design-template.json](references/design-template.json), an intentionally incomplete contract with no case cells, coordinates, event poses, or route. Fill it from the requested goal and [Mechanism logic](references/mechanism-logic.md). Keep [official-design.json](references/official-design.json) for reproduction and regression; its spatial implementation is not the authoring template. Run:

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

Preserve existing maps, artifacts, and engine code. Do not launch benchmark models, paid evaluations, or unauthorized remote publication as part of this skill. Input count is not a human-difficulty score.

For official GxG/GxH reference maintenance, use `scripts/official-runtime.cjs` with the matching `official-gxg-design.json` or `official-gxh-design.json`, as described in [verification](references/verification.md). Those reference contracts certify ordinary replay and scoped checks, not default complex authoring. The original GxF design and historical gem-only checks remain preserved; [its additional solution](references/official-solution.json) verifies the stronger return goal. No new maze was generated while extracting these references, so new-map transfer remains a separate authoring validation obligation.

## Website completion in Maze Harness

When working on the Maze Harness project, follow its repository `AGENTS.md` and `docs/website.md` after a successful build and verification. The owner has authorized ongoing GitHub Pages updates for completed skills and verified playable trials. Run the repository's `scripts/publish-site.cjs` with this skill, the separate engine, actual design, build manifest and matching successful verification report; this registers the case, captures its real 3D thumbnail, validates, commits and pushes. Check the Pages run before reporting the example live. Treat this as part of delivery without waiting for another website prompt. Preserve earlier cases and do not publish unfinished or unknown results. Outside that project, use the destination's own publication authorization.
