# Use the skills to create a map

Give the task to your **coding agent**. The agent reads the skill, designs the geometry, creates a fresh MazeBench draft, and checks it. Use the MazeBench browser interface to inspect, edit, and play the result. MazeBench CLI starts or controls the game environment; skill selection happens in the coding-agent conversation.

## Prepare the two parts

1. Keep a separate [MazeBenchEngine](https://github.com/mazebench/MazeBenchEngine) installation with its dependencies available. This repository contains authoring instructions and examples, not the engine runtime.
2. Make the complete desired `skills/<name>/` folder available to the agent. Keep its `SKILL.md`, `references/`, `scripts/`, and bundled examples together. Follow your agent's skill installation instructions, or explicitly ask it to read the repository's `SKILL.md` and apply the workflow.
3. Start the local engine using its documented launcher. In the engine checkout used for these cases, `npm run dev` starts the development server. Open the address printed by the server and visit `/build`.
4. Ask the agent to create a new draft. Review the resulting Play/Edit links, exported map, design explanation, and verification evidence.

For Codex skill discovery and explicit invocation, see the [official skill documentation](https://learn.chatgpt.com/docs/build-skills). When the skills are available, you can name them in the conversation; Codex CLI and IDE also provide skill selection through `/skills` or `$`. You do not enter this authoring prompt into a game movement console.

## Request a new map

For a composed room, use this prompt in the coding-agent conversation:

```text
Use $mazebench-boundary-stagger, $mazebench-hook-transfer, and
$mazebench-constrained-transport to create a new MazeBench room whose
goal is to collect a gem and whose solution requires multi-stage planning.

Choose shapes and coordinates yourself. Connect preparation, constrained
transport, usable contact, and continued passage. Include purposeful
temporary parking or recovery where it creates a real dependency.

Explain how the required dependencies differ from existing examples.
Check whether the declared tool, helper, or contact can be bypassed.
Create a separate draft and preserve existing maps. Deliver Play/Edit
links, world.json, a design explanation, a replayed solution, and verification.
Distinguish one successful route from evidence that a step is necessary.
Do not use input count as a human-difficulty score.
```

Keep only one skill name to test a single mechanism. Supply concrete constraints when they matter, such as planar versus layered geometry, room count, or a desired size. Unspecified shapes and coordinates are design choices for the agent.

An existing-example request is different:

```text
Reproduce the bundled Borrowed Bay example in a new local draft and verify it.
Preserve its layout. Give me the Play/Edit links and a short explanation.
```

Reproduction should recover the saved layout. New authoring is not guaranteed to produce the same layout across runs. These skills are instructions and tools, not a fixed random-map generator or a seed-based sampling algorithm.

## What to receive

| Artifact | What it tells you |
| --- | --- |
| Play and Edit links | Where to inspect the newly created local draft |
| `world.json` | The portable Build map, including room cells |
| `spec.json` and/or `contract.json` | The requested layout, roles, delivery state, and declared mechanism claims |
| Solution and ordinary replay evidence | Whether a complete route actually reaches the stated goal |
| Restricted searches and counterexamples | Which declared dependencies survive attempts to bypass them |
| Screenshots or browser reports | What was checked in the visible game/editor interface |

Use the builder and verifier documented by the selected skill. Their supported profiles differ. A checker limited to two groups cannot certify a three-group composition without a validated extension. A search cap or unsupported profile is not a pass.

## Inspect existing examples

Browse the [before/after case collection](../examples/skill-comparison/README.md). Each record has a Build `world.json` and a description of its status. Import the map into your local Build environment or ask the agent to create a new draft using the official save services.

Historical draft IDs and routes in archived reports belong to the environment where they were recorded. They are not public hosted play links. New installations should use their newly generated manifest. The original Windows environment encountered a native Import symlink-permission failure on an older run; an installed draft and official save/export services still worked. If this occurs, ask the agent to use the documented fresh-draft builder with the required assets copied from the engine installation.

For the first manual review, play without reading the solution. Then follow the [review guide](reviewing-skills.md). Editing a map changes what must be verified; a report for the original layout does not automatically apply to the edited version.
