---
name: mazebench-boundary-stagger
description: Design, build, and structurally verify MazeBench boundary and offset puzzles. Default to connected preparation and dependent route opening, with transferable HxH mechanism logic. Choose shapes and coordinates autonomously. For authoring, not model evaluation.
---

# MazeBench Boundary Stagger

Build mechanisms where changing the relative placement of independent rigid groups releases a move, pushing position, or walking route constrained by a fixed boundary. A visible opening or two moved objects alone does not establish this mechanism.

Official source room: **HxH**; see [the source and evidence](references/official-case.md).

## Automatic authoring record

For new authored work, choose the absolute design-spec path before reading mechanism references or laying out cells. Start its local recording session and viewer through the packaged bridge; this is part of the agent's workflow and requires no extra command from the user:

```text
node scripts/authoring-observer.cjs start --spec SPEC.json --title "Authoring task"
node scripts/authoring-observer.cjs read --spec SPEC.json --file references/mechanism-logic.md
```

Use `read --spec SPEC.json --file FILE` for the other source files actually needed. Keep the spec path stable across revisions so ordinary build and verification commands join the same session automatically. The existing authoring CLI entrypoints record command output, candidate snapshots and fresh reports when the optional runtime is available; official-reference regression helpers remain reference checks rather than new-map sessions. For custom helpers, use `exec --spec SPEC.json --kind command -- EXECUTABLE ARGS`, or `--kind test --report FRESH_REPORT.json` for a validation report.

Record concise design goals and revision reasons with `note --spec SPEC.json --json NOTE.json`; supported note fields are `goal`, `sources`, `change`, `reason`, and `expectedChecks`. Preserve unsuccessful candidates and tests, and use `finish --spec SPEC.json` when delivery is complete. Notes are agent statements, not private internal reasoning. File delivery records access, while contract read receipts establish version consistency; neither proves comprehension or causal use.

The bridge discovers an optional local runtime through configuration or a surrounding checkout. An unavailable or failed recorder is reported explicitly. Continue the authorized design work when recording is unavailable, disclose the missing coverage, and never claim that unrecorded reads or commands were captured. Keep machine-specific runtime configuration and generated sessions outside the distributed skill package.

## Required reading and default complex mode

For new maps, first read [Mechanism logic](references/mechanism-logic.md). Extract the functional roles, real input/contact relationships, movement preconditions, structural functions, and causal dependencies before choosing shapes or coordinates. Read [the complete official case](references/official-case.md) and its states/checks when evidence or physics details need confirmation. Skill creation or maintenance requires full case analysis; reproductions retain the complete case workflow. Read other cases only when combining their mechanisms.

Record the mechanism document path, SHA256, and `readBeforeLayout: true` in the new contract. An unchanged previously read version may be reused. The receipt checks document version consistency; it cannot prove reading, timing, understanding, or mechanism necessity. For each inherited relation, identify this map's actual members, boundaries, passages, and stances as described in [the contract interface](references/complex-validation.md).

Before laying out a default complex room, also read [Planning depth](references/planning-depth.md) and the [contract and verification interfaces](references/complex-validation.md), then establish a concise design contract. Include at least three interdependent functional stages. Walking, repeated pushes in one direction, separately clearing unrelated obstacles, and returns without a functional effect do not count. Declare all members and elevations, fixed boundaries, voids and support, stage access regions, complete blocked destinations and stances, releasing actions, recovery space, key inputs and contacts, and subsequent work. Identify where the new geometry carries each inherited function.

Complex mode uses `scripts/build-complex.cjs` and `scripts/verify-complex.cjs`. The basic entrypoints and fixed fixtures retain their existing profiles; passing them does not certify a default complex room. Use the basic workflow for an explicitly requested local demonstration or reproduction and label its mode accurately. Missing evidence, unsupported inputs, and capped searches are unknown and cannot pass.

## Design from the goal

Derive the map in this order: user goal -> functional roles and relationships -> player stances and real contact -> rigid shape, connection, support, and clearance -> layout -> complete-goal verification. Re-derive the spatial implementation without changing core physics. New mechanisms are optional; translation, reflection, renaming, or one added cell alone does not establish substantive variation.

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

Default new authoring uses the complex contract and entrypoints in [Complex validation](references/complex-validation.md). Start new maps with [design-template.json](references/design-template.json), an intentionally incomplete contract with no case cells, coordinates, event poses, or route. Fill it from the requested goal and [Mechanism logic](references/mechanism-logic.md). Keep [official-design.json](references/official-design.json) for reproduction and regression; its spatial implementation is not the authoring template. Run:

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

Preserve existing maps and engine code. Do not launch evaluated models, paid evaluations, or unauthorized remote publication as part of this authoring skill. Report intended difficulty separately from any human playtest findings.

## Website completion in Maze Harness

When working on the Maze Harness project, follow its repository `AGENTS.md` and `docs/website.md` after a successful build and verification. The owner has authorized ongoing GitHub Pages updates for completed skills and verified playable trials. Run the repository's `scripts/publish-site.cjs` with this skill, the separate engine, actual design, build manifest and matching successful verification report; this registers the case, captures its real 3D thumbnail, validates, commits and pushes. Check the Pages run before reporting the example live. Treat this as part of delivery without waiting for another website prompt. Preserve earlier cases and do not publish unfinished or unknown results. Outside that project, use the destination's own publication authorization.
