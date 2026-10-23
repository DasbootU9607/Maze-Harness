---
name: mazebench-skating-cross
description: Design, build, and verify MazeBench ice puzzles in which a rigid cross creates stopping points, enables changing pushing sides, and opens a gem route with a return to the doorway. Derive connected stages from extracted official-case logic. For map authoring, not model evaluation.
---

# MazeBench Skating Cross

Use a movable rigid cross to change stopping points and pushing stances on ice. All four arms participate in whole-group sliding collisions and can provide braking surfaces for the player. Moving the cross opens some routes and closes others. The complete objective includes collecting the gem and returning to the declared doorway cell.

Source room: **JxG** in the official world map. The packaged [official reference](references/official-case.md) contains the complete original room and its scoped mechanism analysis.

## Automatic authoring record

Token usage, runtime-reported model names, and build wall time are default deliverables. Keep the current model, CLI or desktop client and perform the work in this conversation. Never launch a Codex worker, switch models, or delegate merely to collect usage. The ordinary `start` command binds a passive adapter to the current session; build, read, test and finish boundaries refresh its measurements. Client hooks supply exact session identity when available. Unsupported clients still record duration; absent model or token fields must be reported as "Not provided", never estimated or replaced with zero.

After `finish`, deliver the room and `token-usage.json` / `token-usage.md`. Distinguish the measured session interval from a complete task total: the current in-flight response, delayed usage, earlier conversation and other agents are excluded. Cached input and reasoning output are subsets. If several models appear in actual runtime records, retain each model's measured usage. No extra user command is required.

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

The included case is the complete official JxG room. Preserve its original map and provenance. The confirmed objective is to collect the gem and return to the starting doorway; entering an adjacent room is not required.

By default, build at least three interdependent functional stages. Before laying out the map, read [Planning depth](references/planning-depth.md) and the [contract and verification interfaces](references/complex-validation.md), then establish a concise design contract. A stage must change stopping positions, usable pushing surfaces, whole-group sliding constraints or the objective route. Long slides, repeated pushes in one direction, walking alone and returns without a functional effect do not count. When the user explicitly requests a reproduction or compact demonstration, use the corresponding mode and label it accurately.

## Derive the layout from the objective

Derive the map in this order: user goal -> functional roles and relationships -> player stances and real contact -> rigid shape, connection, support, and clearance -> layout -> complete-goal verification. Re-derive the spatial implementation without changing core physics. New mechanisms are optional; translation, reflection, renaming, or one added cell alone does not establish substantive variation.

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

Start new maps with [design-template.json](references/design-template.json), an intentionally incomplete contract with no case cells, coordinates, event poses, or route. Fill it from the requested goal and [Mechanism logic](references/mechanism-logic.md). Keep [official-design.json](references/official-design.json) for reproduction and regression; its spatial implementation is not the authoring template.

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_BUILD_OUTPUT
node scripts/verify.cjs --repo ENGINE --spec SPEC.json --out NEW_CHECK_OUTPUT --cap 300000
```

Use new output directories and preserve existing maps. Deliver Play/Edit links, Build JSON, a complete replay route, key poses, stopping points and pushing stances, explanations of their functions, and scoped verification results. Actual browser play and save/export require separate checks.

Keep engine code and the official reference map unchanged. This skill is for level authoring; it does not launch evaluated models, paid evaluations or unauthorized remote publication. Input counts are not human-difficulty scores.

## Website completion in Maze Harness

When working on the Maze Harness project, follow its repository `AGENTS.md` and `docs/website.md` after a successful build and verification. The owner has authorized ongoing GitHub Pages updates for completed skills and verified playable trials. Run the repository's `scripts/publish-site.cjs` with this skill, the separate engine, actual design, build manifest and matching successful verification report; this registers the case, captures its real 3D thumbnail, validates, commits and pushes. Check the Pages run before reporting the example live. Treat this as part of delivery without waiting for another website prompt. Preserve earlier cases and do not publish unfinished or unknown results. Outside that project, use the destination's own publication authorization.
