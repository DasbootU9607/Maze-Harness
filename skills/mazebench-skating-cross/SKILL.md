---
name: mazebench-skating-cross
description: Design, build, and verify MazeBench ice puzzles in which a rigid cross creates stopping points, enables changing pushing sides, and opens a gem route with a return to the doorway. Derive connected stages from the included user-authored case. For map authoring, not model evaluation.
---

# MazeBench Skating Cross

Use a movable rigid cross to change stopping points and pushing stances on ice. All four arms participate in whole-group sliding collisions and can provide braking surfaces for the player. Moving the cross opens some routes and closes others. The complete objective includes collecting the gem and returning to the declared doorway cell.

## Required reading and default complex mode

Before building or iterating on a level with this skill, read the [complete reference case and mechanism analysis](references/user-case.md) and inspect the [key states](references/user-states.json) relevant to the functions you intend to inherit. Identify necessary mechanisms, preparatory stops, stances for changing pushing sides, stage dependencies and variable elements before choosing shapes, coordinates or a layout. This entrypoint summary alone is insufficient for construction. A previously read, unchanged version may be reused; record its path, content fingerprint and inherited relationships. A reading record does not replace necessity checks.

The included case is a complete map created by the user in the local editor. Preserve its original map and provenance, and describe it as the "user reference case" rather than an upstream official level. The confirmed objective is to collect the gem and return to the starting doorway; entering an adjacent room is not required.

By default, build at least three interdependent functional stages. Before laying out the map, read [Planning depth](references/planning-depth.md) and the [contract and verification interfaces](references/complex-validation.md), then establish a concise design contract. A stage must change stopping positions, usable pushing surfaces, whole-group sliding constraints or the objective route. Long slides, repeated pushes in one direction, walking alone and returns without a functional effect do not count. When the user explicitly requests a reproduction or compact demonstration, use the corresponding mode and label it accurately.

## Derive the layout from the objective

Choose coordinates autonomously when a new map is needed; do not require the user to supply shapes or a solution in advance. Read [Design](references/design.md):

1. Establish the complete gem-and-doorway objective and confirm that the initial stopping graph with the cross frozen cannot complete it.
2. Work backward from the final turn: where the player stops, which cross member provides the braking surface, how the next input passes through the gem, and how the player returns to the doorway afterward.
3. Establish reachable pushing surfaces. Use the complete footprint to determine sliding endpoints and identify the actual member and boundary causing each collision; inspecting only the center or contacted arm is insufficient.
4. Derive preparatory parking, changes of pushing side and restoration. A pose may unlock a new pushing side while closing an old stop; preserve later entry and retreat routes.
5. Create an initial state that requires preparation. Arm lengths and positions may vary, provided the cross remains connected, fully supported and clear throughout whole-group travel, with concrete functions for its arms. Confirm these properties through official moves.
6. Record stopping graphs with the cross frozen, executable next pushes, complete blocking positions and the moves that clear them. Search for bypasses of stages claimed to be necessary, and replay successful counterexamples with ordinary moves.

## Rules and evidence

- Use the official Toolbox, parser, save services, engine and solver. Members sharing an M ID form one rigid group; do not add pulling, free rotation or one-cell braking rules.
- One input on ice may cross multiple cells. Passing through a cell does not mean the player can stop, turn or push there. Stopping relationships are directed; do not merge them into undirected walking regions as in non-ice levels.
- Read [Verification](references/verification.md). Report legal completion, motion necessity, braking necessity, preparation dependencies, local arm functions and doorway restoration separately. Collecting the gem alone does not complete the return objective.
- The current scripts support one planar rigid cross, one player, one gem, and floor, ice and fixed walls, with variable arm lengths. Mixed heights, multiple-group force transfer, slopes, devices and actual room crossings require compatible observers; the current profile reports unsupported/unknown for them.
- Only an exhausted search supports "no solution under this restriction." Search caps, exceptions and unsupported inputs are unknown. Do not extend selected-state conclusions to all histories, or infer a unique order from a direction restriction. Preserve and replay counterexamples.
- Follow [Composition](references/composition.md) when combining mechanisms, and verify the complete objective and stopping relationships again.

## Build and deliver

Use [user-design.json](references/user-design.json) to learn the contract format, then write your own `title`, complete 16x16 `cells`, objective and spatial relationships. New layouts require updated poses, stages and evidence; do not reuse the reference map's search conclusions.

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_BUILD_OUTPUT
node scripts/verify.cjs --repo ENGINE --spec SPEC.json --out NEW_CHECK_OUTPUT --cap 300000
```

Use new output directories and preserve existing maps. Deliver Play/Edit links, Build JSON, a complete replay route, key poses, stopping points and pushing stances, explanations of their functions, and scoped verification results. Actual browser play and save/export require separate checks.

Keep engine code and the user reference map unchanged. This skill is for level authoring; it does not launch evaluated models, paid evaluations or remote publication. Input counts are not human-difficulty scores.
