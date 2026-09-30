# Review the skills and their cases

Read the instructions, inspect a concrete map, and compare the claimed design relationships with the evidence. `SKILL.md` is the entry point. Supporting references teach detail; examples demonstrate it; scripts build or check it.

## Suggested reading order

| Read | What to check |
| --- | --- |
| [Boundary Stagger SKILL.md](../skills/mazebench-boundary-stagger/SKILL.md), [Hook Transfer SKILL.md](../skills/mazebench-hook-transfer/SKILL.md), [Constrained Transport SKILL.md](../skills/mazebench-constrained-transport/SKILL.md) | Are the task, construction steps, physics limits, and deliverables clear? Can the agent choose new geometry? |
| Planning depth: [boundary](../skills/mazebench-boundary-stagger/references/planning-depth.md), [hook](../skills/mazebench-hook-transfer/references/planning-depth.md), [transport](../skills/mazebench-constrained-transport/references/planning-depth.md) | Does difficulty come from necessary preparation, reachable pushing positions, and changing use of shared space? |
| Reference analysis: [HxH](../skills/mazebench-boundary-stagger/references/reconstruction.md), [GxE](../skills/mazebench-hook-transfer/references/reconstruction.md), [GxF](../skills/mazebench-constrained-transport/references/gxf-case.md) | Does the interpretation match the preserved reconstruction? Are differences from the official room and limits of inference stated? |
| [Borrowed Bay](../skills/mazebench-constrained-transport/references/borrowed-bay.md) and its [earlier candidates](../examples/skill-comparison/after/prototypes/attempt-01/README.md) | Did the workflow produce different useful geometry and dependencies? Did failed candidates lead to specific repairs? |
| A case's `world.json`, `spec.json`/`contract.json`, and reports | Does the actual map support the prose? Are claimed necessary steps checked against the correct goal? |
| Verification scope: [boundary](../skills/mazebench-boundary-stagger/references/usage.md), [hook](../skills/mazebench-hook-transfer/references/rules-and-validation.md), [transport](../skills/mazebench-constrained-transport/references/verification.md) | Does the checker support the map's group count, terrain, elevation, goal, and interactions? |

`agents/openai.yaml` mainly supports display and invocation. Read `scripts/` when you want to audit execution and verification logic; it is not the best starting point for learning the design ideas.

## Check the abstraction

A useful skill explains what makes a mechanism work and how to construct another instance. It should not turn a particular example's coordinates, object count, shape, or compass sequence into universal rules.

For each instruction, ask:

- What action does this preparation enable, and what previously blocked it?
- Can the player reach the required pushing position when the object arrives?
- Does the tool's whole rigid footprint fit, including support and propagated contacts?
- What remains to do after the target moves?
- Could a different tool shape implement the same function?
- Is a specific order required, or does it merely describe the saved route?

The right level is a reusable design procedure with concrete examples and explicit limits. Highly general advice such as "make it challenging" does not guide construction. A fixed recipe copied from one official room does not establish generalization.

## Read evidence precisely

| Observation | Supported conclusion | Not established by that observation alone |
| --- | --- | --- |
| A complete route is replayed | This route reaches the stated goal under the recorded engine | Shortest route, unique route, or human difficulty |
| The route uses a helper | This witness uses the helper | Every solution needs the helper |
| Freezing a helper exhausts the supported state graph without the goal | Some motion of that helper is necessary under the tested restriction | A unique sequence or exact parking pose |
| A restriction still permits a complete replayed route | The proposed necessity claim has a counterexample | The whole mechanism is useless |
| A search is `capped` or `unknown` | The search did not settle the question | Unsolvability or a passed necessity check |
| Continuation checks start after one recorded contact | The conclusions apply to that selected state | The same conclusions hold after every possible first-contact state |

Check the actual goal. The reconstructed GxE has no gem; its checker uses the explicit passage endpoint `(2,13,0)`. An empty-gem success condition would not establish that passage objective.

Failures in the [prototype records](../examples/skill-comparison/README.md) are part of the evidence. They include walking bypasses, a helper substituting for the tool, inaccessible pushing positions, and unnecessary recovery. Successful counterexamples should narrow a claim or prompt a geometry change.

## Manual play review

First play without opening the solution. Record where you pause to plan, which facts you needed to notice, and whether an action changes a later possibility. Separate travel time from decisions. Afterward, compare your route with the intended explanation and inspect any bypass you found.

A small reusable review sheet:

| Question | Record |
| --- | --- |
| What is the visible objective? | Gem or explicit passage target |
| Which preparations unlock later moves? | Object, blocked action, enabling change |
| Where must you change pushing position? | Whether the route to that position remains open |
| What must be parked, recovered, or moved away from the goal? | Why the detour is useful |
| Can you skip a declared mechanism? | A complete counterexample route if found |
| Where did you get stuck? | Planning difficulty, unclear rules, visibility, or a deadlock |
| Was recovery usable? | The Undo/Reset behavior you actually tried |

## Measure an update fairly

The [existing collection](../examples/skill-comparison/README.md) documents successful uses and corrections. The earlier four-map trial and the later Borrowed Bay trial differ in authoring context and requirements. Their route lengths do not estimate a skill improvement rate.

For a controlled comparison, fix the model, task constraints, resource budget, available engine tools, and scoring rules. Run multiple independent authoring attempts with the old version, new version, and a no-skill baseline. Keep the same evaluation checks available across conditions. Have reviewers who do not know the condition assess the maps.

Measure solvable-map rate, claimed-dependency verification rate, repair effort and causes, diversity of necessary relationships, and human play observations. Define these measures before examining outcomes. Report uncertainty and failed attempts, not just the best map.

The current published skills include Borrowed Bay. Reproducing it after reading that package is not a fresh unseen-example generalization test. Consult [version provenance](skill-version-comparison.md) before assigning a snapshot to an experiment.
