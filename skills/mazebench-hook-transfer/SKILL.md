---
name: mazebench-hook-transfer
description: Design, build, and verify MazeBench puzzles using shape-dependent contact to transfer force. Include active transport, usable docking, and post-use passage planning when a challenging multi-stage room is requested. Derive geometry from the goal without requiring specified shapes or solutions. For authoring, not model evaluation.
---

# Hook Transfer

Use a rigid tool's shape and relative position to solve a pushing, stance, reachability, or movement-constraint problem. Rear and lateral contact are useful relationships; ordinary straight chain pushing alone does not establish shape-dependent function.

## Design from the goal

Choose the geometry unless the user specifies it. Read [Design](references/design.md) when deriving a new tool:

1. Choose the useful target change and explain how it advances the actual objective.
2. Establish a real restriction on direct operation. Check alternate target members, pushing directions, and approaches.
3. Derive player stance P, input member I, working member C, target contact T, and direction d. Require `I=P+d` and `C+d=T` at the actual elevations.
4. Connect I and C with supported rigid geometry and complete movement clearance. Test the contact through official moves.
5. For active docking, choose a separated start and feasible independent transport. Preparation must change relative positions; walking to an already usable tool does not establish it. Preserve access to P after docking.
6. Plan continued work after contact. Define the intended event, solve and replay, then search for bypasses and revise the actual failing relationship.

For a challenging room, read [Planning depth](references/planning-depth.md). Design access before and after use together. A tool or helper may occupy space temporarily, but its later movement must remain possible. A longer transport distance alone is not a new planning stage.

## Rules and verification

- Use the official Toolbox, parser, save services, engine, and solver. Same M ID means one rigid group; distinct groups interact through contact. Do not invent pulling, attraction, permanent attachment, or object rotation.
- Prefer planar geometry unless height serves a specific function. Multi-object relays, mixed-height contact, sliding, and repeated tool reuse need compatible observations and checks.
- Read [Verification](references/verification.md). Separate legal completion, useful contact, contact necessity, preparation necessity, and the local function of a shape part. Joint movement alone proves none of the stronger claims.
- `contact-events.cjs` observes direct same-elevation unit translations for rear or lateral contact. `verify-contact.cjs` is narrower: it checks active lateral transfer onto a plate with two groups. It is not a universal hook verifier. Other outcomes require a matching scoped checker.
- Capped searches are unknown. Preserve and replay successful bypasses. Removing a part can change support, stance access, and clearance as well as contact; do not claim global shape minimality from a local edit.
- Use [Composition](references/composition.md) when integrating other mechanisms, and recheck the complete room.

## Build and deliver

Author `title`, a complete 16-by-16 `cells` array, and a `contract` with the intended roles and effects. The agent chooses coordinates; the user need not provide a map. Run:

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_OUTPUT
```

Then apply the checker matching the contract, as documented in [Verification](references/verification.md). Deliver Play/Edit links, Build JSON, a replayed route, contact states, dependency evidence, and unresolved limitations.

Preserve existing drafts and engine code. This is map authoring: do not launch evaluated models, paid evaluations, or remote publication. Solver correctness and human difficulty are separate questions.
