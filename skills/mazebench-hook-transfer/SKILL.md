---
name: mazebench-hook-transfer
description: Design, build, and verify MazeBench puzzles using shape-dependent contact to transfer force. Include active transport, usable docking, and post-use passage planning when a challenging multi-stage room is requested. Derive geometry from the goal without requiring specified shapes or solutions. For authoring, not model evaluation.
---

# Hook mechanisms

A **hook** uses shape and relative position to solve a pushing, stance, reachability, or movement-constraint problem. Official pushing transfers force through useful contact between independent objects. A rear hook and a lateral arm are verified approaches; ordinary straight chain pushing alone does not establish shape cooperation.

## Design from the goal

An unspecified shape is a design decision, not missing information. Choose the geometry and layout, explain the functional relationship, then build an actual map. Respect user-specified constraints. Read [function to geometry](references/function-to-geometry.md) for the detailed method:

1. Choose the target change and explain how it enables the objective.
2. Establish a real restriction on direct operation; check alternate target members, directions, and routes.
3. Derive player stance P, tool input I, working part C, target contact T, and direction d. Check `I=P+d` and `C+d=T` at their actual elevations.
4. Connect I and C with useful rigid geometry, openings, support, and full movement clearance. Test the local contact through official moves.
5. For active docking, add a separated start and feasible independent transport. Preparation must change relative positions and enable usable contact; walking to a predocked tool is insufficient. Verify the player can reach the input stance after docking.
6. Define the expected event, solve and replay, and search for bypasses. Adjust geometry from actual failures rather than adding unrelated obstacles.

These are design decisions, not a fixed player action sequence. Default constructors reproduce examples; size and distance changes are parameter variants. Reuse verified methods where appropriate, and write new layout functions when needed. Require changed causal structure only when structural diversity is requested.

## When the user asks for a challenging room

Read [Planning depth](references/planning-depth.md). Make the contact event an intermediate change with consequences: preparation must enable a usable stance and contact, and the resulting arrangement must support further work toward the objective. Design the before-use and after-use access together. A distant start or repeated identical push does not by itself add a planning stage.

State which decisions depend on earlier object arrangements, then test those claims. GxE demonstrates transport, rear contact, and continued passage work, but its target need not move right in every solution. Generalize the changing constraints, not one witness's compass sequence. If a candidate collapses to a predocked demonstration or has a goal bypass, revise it or narrow the claim.

## Build and validate

- Use official Toolbox, parser, save services, engine, and solver. Same M ID means one rigid group; distinct IDs identify independent objects. Do not invent pulling, attraction, permanent binding, or object rotation.
- Prefer planar layouts unless height serves contact, stance, observation, or dependencies. Arbitrary 3D contact, multi-object relays, and repeated tool reuse need separate evidence.
- Save a fresh draft and preserve existing maps and engine code. See [setup and commands](references/usage.md).
- Follow [validation rules](references/rules-and-validation.md): report legal solution, intended mechanism use, mechanism necessity, preparation necessity, and key-part function separately. Check actual contacts and task effects, not only joint movement. Adapt case-specific validators to the design.
- Capped searches are unknown. Local shape controls do not prove global minimality; solving does not prove player insight. Record separation, preparation, docking, use, and completion for active tasks.
- Provide a [composition interface](references/patterns-and-composition.md) and revalidate combined puzzles. This skill does not run Prime, benchmark models, or paid evaluation.

## Read as needed

| Topic | Reference |
|---|---|
| Capabilities, constructors, and composition | [Patterns and composition](references/patterns-and-composition.md) |
| Official rear hook and baseline examples | [Mechanism](references/mechanism.md) |
| Saved GxE reconstruction, explicit passage goal, and counterexample | [Reconstruction](references/reconstruction.md) |
| Connected planning before and after contact | [Planning depth](references/planning-depth.md) |
| Predocked repair and elevated bridge | [Structures](references/structures.md) |
| Transport and dock before rear transfer | [Active docking](references/active-docking.md) |
| Lateral transfer and bent-arm geometry | [Side reach](references/side-reach.md) |
| Recorded evidence and its limits | [Validation history](references/validation.md) |
