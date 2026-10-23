---
name: mazebench-hook-transfer
description: Design, build, and structurally verify MazeBench shape-dependent contact puzzles. Use independent transport, usable docking, true member contact, shared clearance, and continued passage work from GxE, FxE, and FxG. For authoring, not model evaluation.
---

# MazeBench Hook Transfer

Use a rigid tool's shape and relative position to solve a pushing, stance, reachability, or movement-constraint problem. Rear and lateral contact are useful relationships; ordinary straight chain pushing alone does not establish shape-dependent function.

Official source rooms: [GxE](references/official-case.md), [FxE](references/official-fxe-case.md), and [FxG](references/official-fxg-case.md). Each preserves its original room bytes and separate replay scope. Use the [reference synthesis](references/reference-library.md) and [difficulty guide](references/difficulty.md) to select relevant functions and a local reference level; levels do not certify a new map or human difficulty.

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

For new maps, first read [Mechanism logic](references/mechanism-logic.md). Extract the functional roles, real input/contact relationships, movement preconditions, structural functions, and causal dependencies before choosing shapes or coordinates. Consult [GxE](references/official-case.md) for rear release and passage work, [FxE](references/official-fxe-case.md) for a released tool and repeated contact roles, or [FxG](references/official-fxg-case.md) for competing footprints, input access restored by withdrawal, and changing tools across two passages. Read their states/checks when evidence or physics needs confirmation. Skill maintenance requires complete analysis of the affected case; reproductions retain its full evidence workflow.

Record the mechanism document path, SHA256, and `readBeforeLayout: true` in the new contract. An unchanged previously read version may be reused. The receipt checks document version consistency; it cannot prove reading, timing, understanding, or mechanism necessity. For each inherited relation, identify this map's actual members, boundaries, passages, and stances as described in [the contract interface](references/complex-validation.md).

Before laying out a default complex room, also read [Planning depth](references/planning-depth.md) and the [contract and verification interfaces](references/complex-validation.md), then establish a concise design contract. Include at least three interdependent functional stages. Walking, repeated pushes in one direction, separately clearing unrelated obstacles, and returns without a functional effect do not count. Declare all members and elevations, fixed boundaries, voids and support, stage access regions, complete blocked destinations and stances, releasing actions, recovery space, key inputs and contacts, and subsequent work. Identify where the new geometry carries each inherited function.

Complex mode uses `scripts/build-complex.cjs` and `scripts/verify-complex.cjs`. The basic entrypoints and fixed fixtures retain their existing profiles; passing them does not certify a default complex room. Use the basic workflow for an explicitly requested local demonstration or reproduction and label its mode accurately. Missing evidence, unsupported inputs, and capped searches are unknown and cannot pass.

## Design from the goal

Derive the map in this order: user goal -> functional roles and relationships -> player stances and real contact -> rigid shape, connection, support, and clearance -> layout -> complete-goal verification. Re-derive the spatial implementation without changing core physics. New mechanisms are optional; translation, reflection, renaming, or one added cell alone does not establish substantive variation.

Choose the geometry unless the user specifies it. Read [Design](references/design.md) when deriving a new tool:

1. Choose the useful target change and explain how it advances the actual objective.
2. Establish a real restriction on direct operation. Check alternate target members, pushing directions, and approaches.
3. Derive player stance P, input member I, working member C, target contact T, and direction d. Require `I=P+d` and `C+d=T` at the actual elevations.
4. Connect I and C with supported rigid geometry and complete movement clearance. Test the contact through official moves.
5. For active docking, choose a separated start and feasible independent transport. Preparation must change relative positions; walking to an already usable tool does not establish it. Preserve access to P after docking.
6. Plan continued work after contact. Define the intended event, solve and replay, then search for bypasses and revise the actual failing relationship.

When several tools share the work area, check the next input after each contact. A useful member can become an obstacle to another stance; reserve an executable withdrawal or recovery and test that it restores the intended action. Where the objective includes multiple passages, verify the uninterrupted complete route and earlier-route retention or explicit recovery. FxG supplies this optional branch; its particular four shapes and two-door count are not universal requirements.

For default complex authoring, read [Planning depth](references/planning-depth.md). Design access before and after use together. A tool or helper may occupy space temporarily, but its later movement must remain possible. A longer transport distance alone is not a new planning stage.

## Rules and verification

- Use the official Toolbox, parser, save services, engine, and solver. Same M ID means one rigid group; distinct groups interact through contact. Do not invent pulling, attraction, permanent attachment, or object rotation.
- Prefer planar geometry unless height serves a specific function. Multi-object relays, mixed-height contact, sliding, and repeated tool reuse need compatible observations and checks.
- Read [Verification](references/verification.md). Separate legal completion, useful contact, contact necessity, preparation necessity, and the local function of a shape part. Joint movement alone proves none of the stronger claims.
- `contact-events.cjs` observes direct same-elevation unit translations for rear or lateral contact. `verify-contact.cjs` is narrower: it checks active lateral transfer onto a plate with two groups. It is not a universal hook verifier. Other outcomes require a matching scoped checker.
- Multi-pair complex events can name `tool`, `target`, and `contactKind`; check each actual input/contact pair separately. [FxE's scoped regression](scripts/verify-official-fxe.cjs) replays its complete goal and reports exhausted, bypassed, and capped restrictions individually; it does not automatically certify every default complex requirement.
- [FxG's scoped regression](scripts/verify-official-fxg.cjs) verifies both room-local doorways in one route, final south access, real contact pairs and selected clearance controls. Its ordinary complex goal represents only the final eastern doorway, so run this helper for the complete FxG objective. It makes no all-history necessity claim; no new map was authored to test this extension's transfer.
- Capped searches are unknown. Preserve and replay successful bypasses. Removing a part can change support, stance access, and clearance as well as contact; do not claim global shape minimality from a local edit.
- Use [Composition](references/composition.md) when integrating other mechanisms, and recheck the complete room.

## Build and deliver

Default new authoring uses the complex contract and entrypoints in [Complex validation](references/complex-validation.md). Start new maps with [design-template.json](references/design-template.json), an intentionally incomplete contract with no case cells, coordinates, event poses, or route. Fill it from the requested goal and [Mechanism logic](references/mechanism-logic.md). Keep [official-design.json](references/official-design.json) for reproduction and regression; its spatial implementation is not the authoring template. Run:

```text
node scripts/build-complex.cjs --repo ENGINE --spec SPEC.json --out NEW_BUILD_OUTPUT
node scripts/verify-complex.cjs --repo ENGINE --spec SPEC.json --out NEW_CHECK_OUTPUT --cap 1000000
```

Use the following basic workflow only for an explicitly requested compact mechanism demonstration or a supported legacy profile. Label that result accordingly; a basic pass does not certify default complex authoring.

Author `title`, a complete 16-by-16 `cells` array, and a `contract` with the intended roles and effects. The agent chooses coordinates; the user need not provide a map. Run:

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_OUTPUT
```

Then apply the checker matching the contract, as documented in [Verification](references/verification.md). Deliver Play/Edit links, Build JSON, a replayed route, contact states, dependency evidence, and unresolved limitations.

Preserve existing drafts and engine code. This is map authoring: do not launch evaluated models, paid evaluations, or unauthorized remote publication. Solver correctness and human difficulty are separate questions.

## Website completion in Maze Harness

When working on the Maze Harness project, follow its repository `AGENTS.md` and `docs/website.md` after a successful build and verification. The owner has authorized ongoing GitHub Pages updates for completed skills and verified playable trials. Run the repository's `scripts/publish-site.cjs` with this skill, the separate engine, actual design, build manifest and matching successful verification report; this registers the case, captures its real 3D thumbnail, validates, commits and pushes. Check the Pages run before reporting the example live. Treat this as part of delivery without waiting for another website prompt. Preserve earlier cases and do not publish unfinished or unknown results. Outside that project, use the destination's own publication authorization.
