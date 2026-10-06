---
name: mazebench-hook-transfer
description: Design, build, and structurally verify MazeBench shape-dependent contact puzzles. Default to independent transport, usable docking, true member contact, and continued passage work, with transferable GxE mechanism logic. For authoring, not model evaluation.
---

# MazeBench Hook Transfer

Use a rigid tool's shape and relative position to solve a pushing, stance, reachability, or movement-constraint problem. Rear and lateral contact are useful relationships; ordinary straight chain pushing alone does not establish shape-dependent function.

## Required reading and default complex mode

For new maps, first read [Mechanism logic](references/mechanism-logic.md). Extract the functional roles, real input/contact relationships, movement preconditions, structural functions, and causal dependencies before choosing shapes or coordinates. Read [the complete official case](references/official-case.md) and its states/checks when evidence or physics details need confirmation. Skill creation or maintenance requires full case analysis; reproductions retain the complete case workflow. Read other cases only when combining their mechanisms.

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

For default complex authoring, read [Planning depth](references/planning-depth.md). Design access before and after use together. A tool or helper may occupy space temporarily, but its later movement must remain possible. A longer transport distance alone is not a new planning stage.

## Rules and verification

- Use the official Toolbox, parser, save services, engine, and solver. Same M ID means one rigid group; distinct groups interact through contact. Do not invent pulling, attraction, permanent attachment, or object rotation.
- Prefer planar geometry unless height serves a specific function. Multi-object relays, mixed-height contact, sliding, and repeated tool reuse need compatible observations and checks.
- Read [Verification](references/verification.md). Separate legal completion, useful contact, contact necessity, preparation necessity, and the local function of a shape part. Joint movement alone proves none of the stronger claims.
- `contact-events.cjs` observes direct same-elevation unit translations for rear or lateral contact. `verify-contact.cjs` is narrower: it checks active lateral transfer onto a plate with two groups. It is not a universal hook verifier. Other outcomes require a matching scoped checker.
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

Preserve existing drafts and engine code. This is map authoring: do not launch evaluated models, paid evaluations, or remote publication. Solver correctness and human difficulty are separate questions.
