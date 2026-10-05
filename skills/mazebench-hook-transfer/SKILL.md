---
name: mazebench-hook-transfer
description: Design, build, and structurally verify MazeBench shape-dependent contact puzzles. Default to independent transport, usable docking, true member contact, and continued passage work, with full GxE case evidence. For authoring, not model evaluation.
---

# MazeBench Hook Transfer

Use a rigid tool's shape and relative position to solve a pushing, stance, reachability, or movement-constraint problem. Rear and lateral contact are useful relationships; ordinary straight chain pushing alone does not establish shape-dependent function.

## Required reading and default complex mode

Before building or iterating on a level, read the [complete official case and mechanism analysis](references/official-case.md) and inspect the key states and spatial relationships that the new design will inherit. Identify necessary mechanisms, prerequisites, stage dependencies, and variable elements before choosing shapes, coordinates, or a layout. The abstract summary in this entrypoint is insufficient. Default authoring requires connected planning beyond a single offset, release, or contact followed only by walking.

Read the case belonging to the skill in use; other cases are needed only when their mechanisms are being combined. A previously read, unchanged version may be reused. A filename, link, or summary is not a reading record. Record the path, content fingerprint, and inherited relationships; reading does not replace necessity or bypass checks.

Before laying out a default complex room, also read [Planning depth](references/planning-depth.md) and the [contract and verification interfaces](references/complex-validation.md), then establish a concise design contract. Include at least three interdependent functional stages. Walking, repeated pushes in one direction, separately clearing unrelated obstacles, and returns without a functional effect do not count. Declare all members and elevations, fixed boundaries, voids and support, stage access regions, complete blocked destinations and stances, releasing actions, recovery space, key inputs and contacts, and subsequent work. Identify where the new geometry carries each inherited function.

Complex mode uses `scripts/build-complex.cjs` and `scripts/verify-complex.cjs`. The basic entrypoints and fixed fixtures retain their existing profiles; passing them does not certify a default complex room. Use the basic workflow for an explicitly requested local demonstration or reproduction and label its mode accurately. Missing evidence, unsupported inputs, and capped searches are unknown and cannot pass.

## Design from the goal

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

Default new authoring uses the complex contract and entrypoints in [Complex validation](references/complex-validation.md). Use [official-design.json](references/official-design.json) as a runnable schema example, then author the new geometry and its own evidence:

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
