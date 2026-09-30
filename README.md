# Maze Harness

Agent skills for designing, building, and verifying MazeBench puzzles.

## Skills

| Skill | Use it for |
| --- | --- |
| [Boundary Stagger](skills/mazebench-boundary-stagger/SKILL.md) | Fixed boundaries and relative offsets that release a route or pushing position |
| [Hook Transfer](skills/mazebench-hook-transfer/SKILL.md) | Shape-dependent contact, usable docking, and movement transferred between objects |
| [Constrained Transport](skills/mazebench-constrained-transport/SKILL.md) | Tool delivery through shared space, helper rearrangement, and changing pushing positions |

Use one skill for a focused mechanism or combine them for a connected, multi-stage room.

## Install

Copy each desired directory from `skills/` into your coding agent's configured skill directory. Keep the entire directory together: its instructions reference the included documentation and scripts. Alternatively, ask the agent to read the relevant `SKILL.md` directly from a checkout of this repository.

The skills need a separate [MazeBenchEngine](https://github.com/mazebench/MazeBenchEngine) checkout, Node.js, the engine's dependencies, and write access to its local drafts. Pass that checkout explicitly as `--repo`; the engine and game assets are not bundled here.

## Use

Give the authoring request to the coding agent:

```text
Use $mazebench-constrained-transport to design a new room where collecting
the gem requires helper rearrangement, temporary parking, and usable tool
delivery. Choose the geometry. Build a new draft, replay a complete solution,
test the dependencies you claim, and provide Play/Edit links and the map.
```

For a combined room, name all three skills. The agent constructs an authored specification and uses the supplied helpers; the browser is for editing and playing the result. Detailed input contracts and verification limits are linked from each `SKILL.md`.

Builders create fresh local drafts. Verification checks supported mechanics and declared restrictions; it does not measure human difficulty. These skills are for map authoring, not benchmark model evaluation.

## Package structure

Each skill contains `SKILL.md`, agent metadata in `agents/`, focused guidance in `references/`, and reusable helpers in `scripts/`. Development maps, solved routes, screenshots, and test-run archives are kept outside the distribution.

The helpers were developed against engine baseline `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe` with Node 24.13.0. Review engine interfaces and revalidate generated maps when changing that dependency. Each checker documents its supported profile and reports capped searches as unknown.

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
