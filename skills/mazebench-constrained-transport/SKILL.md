---
name: mazebench-constrained-transport
description: Design, build, and verify MazeBench puzzles that transport a rigid tool through constrained spaces. For challenging rooms, develop necessary helper rearrangement, temporary parking, return moves, and changing pushing stances before usable delivery. Choose shapes and coordinates autonomously. For authoring, not model evaluation.
---

# Constrained Tool Transport

Build puzzles where a tool has a concrete purpose and delivering it to its working position is itself a puzzle. Plan the complete rigid footprint, helper configurations, and reachable pushing faces. A path for the tool's center, a long walk, or several objects moving together does not establish constrained transport.

## Autonomous construction

The user supplies a goal and necessary constraints. Choose the tool's purpose, why the target is constrained, tool shape, helper objects, transport route, temporary parking, player start, and gem position. Unspecified shapes, counts, and coordinates are design variables. Respect explicitly requested geometry, dimensions, and mechanics.

Work backward from function to the initial layout:

1. **Define the result of use.** What object or route changes, and how does that let the player collect the gem? Verify the core tool-use relationship before adding transport constraints.
2. **Define an operable delivery state.** Specify the tool's complete footprint and elevation, the player's reachable pushing cell, and the input direction. A positioned tool with an inaccessible pushing stance is not delivered successfully.
3. **Derive transport stages.** Check every member's destination, support, propagated contacts, and access to the next pushing face. Reserve real circulation space; use retreat, detours, or temporary parking when useful.
4. **Give helpers a causal role.** Independently reposition helpers to release a specific tool move, parking area, or player stance. Explain which action was blocked, by what, and which change enables it. Helpers may be reused; retreat and reuse are not mandatory in every design.
5. **Construct an unprepared start.** Initial object poses should not already allow the intended use after walking alone. The first preparation, subsequent transport, and final use must all be reachable.
6. **Solve, replay, and test claims.** Verify the complete route to the gem, record delivery and actual contact events, and run appropriate restrictions for claimed necessary helper motion, tool use, and preparation. Revise collisions, support, stances, or bypasses based on concrete counterexamples.

See [Design and composition](references/design.md). Do not turn the example's two-cell bar, two L shapes, four groups, coordinates, or 219 inputs into universal requirements. Distinguish reproduction, size/orientation variants, and new structures with changed necessary dependencies. Reuse verified relationships when appropriate; require structural diversity only when requested.

## When the user asks for a challenging room

Read [Planning depth](references/planning-depth.md). Design a shared workspace whose useful configuration changes between stages. A helper should release a particular tool translation or pushing face, and the player must retain a way to reach the next one. Include a purposeful complication such as moving away from delivery to enable a later move, recovering temporary parking, or returning a helper for a new role. Avoid turning every helper into an independent obstacle removed once.

State and test the intended dependencies. In the reconstructed GxF, excluding either horizontal direction of either helper prevents completion; tool and M1 also require both vertical directions. This establishes necessary movement in opposing directions, not a unique parking sequence. Deliver evidence of the new room's own dependencies rather than treating this example's route length as a difficulty threshold.

## Physics and scope

- Use the current official Toolbox, parser, save services, engine, and solver. Cells with the same M ID form one rigid group; different IDs interact through current contact. Do not invent pulling, object rotation, snapping, or permanent attachment. Camera rotation does not rotate objects.
- Let the official engine determine complete footprints, the moving cluster, and support. The example permits one tool end to overhang a void; this does not establish arbitrary spans, elevations, loads, or unsupported configurations. Void `+` differs from floor `.`.
- This skill owns transport and its delivery interface. Optionally combine `mazebench-boundary-stagger` for movement released by offsets around fixed boundaries, and `mazebench-hook-transfer` for shape-dependent contact transfer. They are complementary skills, not script dependencies. Revalidate the combined map.
- The bundled checker covers one enclosed 16-by-16 planar room, one player, one gem, floor/wall/void cells, and 3-5 independent groups from M0-M4. After delivery, the tool pushes one target group on the same level. Shapes and role IDs may vary; stacked layers, slopes, ice, gates, clones, and room transitions are unsupported. Extend and validate the checker before claiming broader coverage. Unsupported or capped checks are not passes.

## Build and deliver

Read [Inputs, commands, and evidence limits](references/verification.md). Pass the actual engine checkout as `--repo`, author custom `cells` and a `contract`, and choose a fresh `--out`. The skill and engine need not be adjacent directories.

```text
node scripts/build.cjs --repo REPO --spec YOUR_SPEC.json --out NEW_OUTPUT
node scripts/verify.cjs --repo REPO --out NEW_OUTPUT --cap 1000000
```

`build.cjs` creates a new local draft and exports Build JSON without overwriting existing drafts. Use `--example gxf` only for explicit reproduction. Loading and saving use official services; ordinary asset copies avoid requiring Windows symlink privileges.

Deliver playable links, Build JSON, a concise mechanism explanation, a verified route, and the object roles, delivery state, preserved passages/stances, and restriction evidence. Solvability, mechanism use in a witness, mechanism necessity, and preparation necessity are different claims. Freezing a group and finding no solution does not prove a unique ordering. Input count is not human difficulty.

Preserve the user's map, existing artifacts, and engine code. This is an authoring workflow; do not launch evaluated models, Prime, paid evaluations, or remote publication as part of the skill.

## Read as needed

- [User-reconstructed GxF example](references/gxf-case.md): initial layout, 219-input witness, working stance, key transfer, and exact restriction definitions.
- [Authored Borrowed Bay example](references/borrowed-bay.md): a different tool/helper structure with preparation, contact, recovery, and withdrawal, tested in an independent authoring trial.
- [Design and composition](references/design.md): autonomous geometry, stage connections, failure diagnosis, and responsibilities of the companion skills.
- [Planning depth](references/planning-depth.md): changing workspace, temporary retreat, stance preservation, and tests for required return movement.
- [Verification](references/verification.md): specification fields, supported profile, counterexamples, and result interpretation.
- `node scripts/check-runtime.cjs --repo REPO`: replay, role remapping, rollback, and unsupported-input checks after script changes.
