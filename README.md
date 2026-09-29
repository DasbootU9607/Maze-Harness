# Maze Harness

A growing collection of reusable agent skills for designing and building MazeBench puzzles.

## Skills

| Skill | Purpose |
|---|---|
| [mazebench-hook-transfer](skills/mazebench-hook-transfer/SKILL.md) | Design and verify puzzles that use object shapes, transport, and docking to transfer force. |
| [mazebench-boundary-stagger](skills/mazebench-boundary-stagger/SKILL.md) | Design and verify routes opened by offsetting movable groups around fixed boundaries. |
| [mazebench-constrained-transport](skills/mazebench-constrained-transport/SKILL.md) | Design and verify rigid-tool delivery through constrained spaces, helper preparation, and final contact transfer. |

## Use

Copy the desired folder from `skills/` into your agent's skill directory, or point the agent directly at its `SKILL.md`. Each skill keeps its instructions, scripts, references, and examples together.

> Use $mazebench-hook-transfer to build a puzzle that requires actively transporting and docking a tool. Choose the shape and layout yourself.

Setup and verification: [Hook Transfer](skills/mazebench-hook-transfer/references/usage.md) · [Boundary Stagger](skills/mazebench-boundary-stagger/references/usage.md) · [Constrained Transport](skills/mazebench-constrained-transport/references/verification.md).

New skills belong in `skills/<skill-name>/`, with an entry in the table above. Keep detailed guidance and supporting files within the relevant skill.

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
