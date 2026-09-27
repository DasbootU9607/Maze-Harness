---
name: mazebench-hook-transfer
description: Derive, build, and verify MazeBench shape-cooperation and contact-transfer mechanisms from design goals, including active transport and docking. Users need not specify shapes, coordinates, or solutions. Supports rear hooks and lateral arms; ordinary straight chain pushes alone are not hook designs. Not for model evaluation.
---

# Shape cooperation and contact transfer

A **hook** is a functional relationship: the player moves and aligns independent objects so that a protrusion, recess, edge, or other working part makes useful contact. Official pushing then changes a target's position, available movement, pushing stance, or passage. The shape relationship must solve a direct-pushing, stance, reachability, or movement-constraint problem. A half-frame and L-shaped load are one example; multiple objects moving together can also be an ordinary chain push.

## Autonomous design responsibility and scope

“Design a mechanism that requires discovering a tool's use, actively transporting it, and docking it to finish. Choose the shape and layout yourself” is enough to begin and complete a design. An unspecified shape is not missing information. Choose the target restriction, contact parts, player stance, tool geometry, transport, alignment, and validation yourself. Explain the choices briefly, then construct the map. Explicit user geometry becomes a task constraint; otherwise make the design decisions.

- Use official Toolbox modules, parsing, saving, engine, and solver. Do not invent pulling, attraction, permanent attachment, or object rotation. Camera rotation changes observation.
- Members with the same M ID form a rigid group; different IDs identify independent objects. Tool and target are task roles, not permanently M0/M1. Let official physics determine contact propagation, actual elevations, support, and clearance of the entire push cluster.
- Read [rules and validation](references/rules-and-validation.md). Legal solution, intended use, mechanism necessity, preparation necessity, and working-part function are separate conclusions. One event flag cannot establish all five.
- Choose object count, dimensionality, use count, and outcome independently, then check compatibility. Prefer planar space unless height or another module changes observation, contact, stance, or causal dependency.
- Evidence extends only to the concrete capabilities in [patterns and composition](references/patterns-and-composition.md). Arbitrary 3D contact, multi-object relays, and repeated repurposing need new evidence.

## Derive geometry from function

1. **Target change:** Decide where the target must move or what function it must acquire. Explain how this changes the final passage or task state.
2. **Direct-operation restriction:** Establish a real official-rule reason why the player cannot perform that operation directly. Check all pushable target members and directions. The tool must be able to overcome this restriction.
3. **Contact and input:** Choose a reachable player stance P, tool input member I, working member C, target member T, and input direction d. Check `I=P+d` and `C+d=T` at their actual elevations. Infer the rigid connection between I and C.
4. **Shape and local core:** Route that connection around the player, target, and fixed obstructions. Preserve openings, support, and clearance for the whole translation. Explain each key part. Choose a rear hook, lateral arm, or separately verified relationship as needed; no default shape is mandatory. Test the core contact with the official engine.
5. **Active preparation:** For an active-docking task, arrange a separated start, transport space, alignment, and changes of pushing stance. The delivered initial state must not already offer a usable docking relationship. Independent preparation must change relative object positions and matter to the goal. Record separation, transport, docking, use, and completion. A predocked prototype or a longer walk does not satisfy this mode.
6. **Validate and adjust:** Define this design's events and constraints before choosing or writing checks. Solve and replay through official moves; check use, bypasses, preparation, docking, and key-part function. Fix actual collision, support, stance, or bypass counterexamples. Capped searches are unknown; local controls do not prove a unique shape, and solving does not prove player insight.

These are design decisions, not a universal player action sequence. See [function to geometry](references/function-to-geometry.md) for operational guidance. Examples explain mechanics and provide regression baselines. A default constructor reproduces its template; size, coordinate, and travel changes are parameter variants. Reusing a verified relationship is reasonable. Require different causal dependencies, roles, or usage only when structural diversity is requested.

Deliver actual official tokens and a fresh saved draft, preserving existing maps and engine code. If a constructor cannot express the desired relationship, write a new cells layout function. If a validator's assumptions do not fit, adapt the task checks rather than distorting the design. Supply a composition interface and recheck the whole combined puzzle.

## Read on demand

| Need | Reference and entry point |
|---|---|
| Autonomous design without a supplied shape | [function-to-geometry.md](references/function-to-geometry.md) |
| Physics, events, necessity, controls, result categories | [rules-and-validation.md](references/rules-and-validation.md); `scripts/contact-events.cjs` |
| Optional patterns, construction, composition | [patterns-and-composition.md](references/patterns-and-composition.md) |
| Official GxE rear hook and three baseline parameter cases | [mechanism.md](references/mechanism.md); `build.cjs` / `verify.cjs` |
| Predocked repair-and-hold and elevated bridge | [structures.md](references/structures.md); `build-structures.cjs` / `verify-structures.cjs` |
| Transport, dock, then rear-transfer a bridge at z1 | [active-docking.md](references/active-docking.md) |
| Planar lateral-arm transfer after preparation | [side-reach.md](references/side-reach.md); `build-side-reach.cjs` / `verify-contact.cjs` |

Scripts take `--repo ENGINE` and a fresh `--out OUTPUT`; the installation need not be adjacent to the engine. Existing manifests refuse overwrite. The observer is not a universal task validator. The distribution's root `examples/` includes portable maps and case-specific checks; the installed skill's references remain usable without that examples directory.

This skill owns its mechanism and composition interface, not an entire world, other mechanism skills, or an evaluation harness. Do not launch Prime, benchmark models, or paid evaluation.
