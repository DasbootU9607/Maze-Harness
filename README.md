# Maze Harness

A growing collection of reusable agent skills for designing and building MazeBench puzzles.

## Skills

| Skill | Purpose |
|---|---|
| [mazebench-hook-transfer](skills/mazebench-hook-transfer/SKILL.md) | Design and verify puzzles that use object shapes, transport, and docking to transfer force. |

## Use

Copy the desired folder from `skills/` into your agent's skill directory, or point the agent directly at its `SKILL.md`. Each skill keeps its instructions, scripts, references, and examples together.

> Use $mazebench-hook-transfer to build a puzzle that requires actively transporting and docking a tool. Choose the shape and layout yourself.

See the skill's [setup and examples](skills/mazebench-hook-transfer/references/usage.md) for requirements and local verification commands.

New skills belong in `skills/<skill-name>/`, with an entry in the table above. Keep detailed guidance and supporting files within the relevant skill.

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
