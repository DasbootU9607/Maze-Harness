---
name: mazebench-case-workflow
description: Create or extend MazeBench mechanism skills from official reference rooms. Collect the user's core operating logic for each introduced case, analyze official initial states and motion evidence, integrate transferable relations, and produce a standardized, validated skill package. Use for case-to-skill authoring workflows, not ordinary room generation or model evaluation.
---

# MazeBench Case Workflow

Turn official cases into reusable map-authoring skills. The human chooses the operating logic worth extracting; the agent establishes what the source and replay support, integrates the cases, writes the skill, and validates it. This is an authoring workflow, not another puzzle mechanism.

## Start with the case-specific human input

For **every newly introduced official case**, obtain the user's own description of the core causal behavior to preserve before extracting its mechanism or integrating it into a skill. A room ID, screenshot, solution sequence, or instruction to analyze it is not itself a description of that behavior. Do not invent an answer, infer consent from silence, or reuse another case's focus.

Use relevant input already supplied by the user in this conversation or a user-authored case brief; retain its source and do not ask again. A previously recorded focus for the same case and scope may be reused. Existing agent-written case analysis alone does not satisfy this requirement. A new case added to an existing skill gets its own input record.

Ask one concise, localized question per missing case, bundling several cases when practical: **What core operating relationship should this case contribute? Describe what is prepared, what action or contact that enables, and what it makes possible next. Include the complete objective or constraints if they matter.** Natural language is enough; the user need not supply coordinates, JSON, complete routes, or proofs. Use an asynchronous question tool when available. Continue source lookup and work on already supplied cases while waiting; keep the dependent extraction pending.

Record the user's words separately from agent interpretation. Read [Workflow and records](references/workflow.md) before beginning. Use the [case analysis template](assets/case-analysis.md) for each case and the [synthesis template](assets/synthesis.md) for integration.

## Follow the construction workflow

1. **Register the request.** Identify the official case IDs, new-skill versus extension mode, and destination. Register all cases before synthesis. Use [existing patterns](references/existing-patterns.md) to choose relevant precedent without importing its conclusions.
2. **Pin the source.** Resolve each room through the official world index and record the engine commit, original map bytes and hash. Source capture can proceed while human input is pending.
3. **Analyze each case after its human input.** Follow [Analysis and evidence](references/analysis-guide.md): full initial state and entry context, complete rigid groups, source-backed movement rules, full-goal replay, key events, structural functions, and scoped counterfactuals. Read the entire affected case and its evidence when extending an existing skill.
4. **Extract transferable relations.** For each human-requested relationship, distinguish source fact, witnessed realization, restricted-search result, and unresolved hypothesis. Separate function from coordinates, silhouette, and a particular move order. Ask a focused question if the user's intended relationship conflicts with the evidence; preserve both until resolved.
5. **Integrate all supplied cases.** Write the synthesis before the skill. Keep common invariants, optional branches, case-specific conclusions, compatible motion profiles, and unresolved limits distinct. Map every adopted relation to its human focus and source evidence. Do not concatenate case narratives or promote one case's necessity result to another.
6. **Write or update the package.** Follow [Package format and acceptance](references/package-format.md). Derive the skill's authoring rules from the synthesis. Keep the full official cases for regression and the new-map template empty. Choose unspecified names, shapes, coordinates, and implementation details autonomously.
7. **Verify and install.** Check package conventions and the affected helpers, replay the complete official objectives, then try a substantively new authored realization when claiming transfer. Report unknowns honestly. Install the completed skill in the configured skill directory; follow repository instructions and existing authorization for synchronization.

The workflow records are resumable. The helper checks that required records and artifact versions exist; it cannot prove that text came from a human, that the agent read it, or that a mechanism claim is true. Never describe its success as gameplay verification.

## Automation

Run from this skill directory; keep working records outside distributed skills. Node.js and a local Git checkout of the official engine are sufficient for source capture. Gameplay analysis also needs the engine's dependencies.

```text
node scripts/workflow.cjs init --work NEW_WORK --case HxH --case GxE --target mazebench-new-mechanism
node scripts/workflow.cjs capture --work NEW_WORK --case HxH --repo ENGINE
node scripts/workflow.cjs status --work NEW_WORK
node scripts/workflow.cjs record-analysis --work NEW_WORK --case HxH
node scripts/workflow.cjs record-synthesis --work NEW_WORK
node scripts/workflow.cjs scaffold --work NEW_WORK --out NEW_SKILL_PARENT
```

Capture and record each case separately. Fill `workflow.json` with actual human input and the inspected entry context; complete each analysis and the synthesis before recording them. `scaffold` requires current records for **all** cases and creates an explicitly unfinished package, never a verified skill. Fill and validate it before installation. For extensions, update the existing package from the checked synthesis instead of overwriting it with a scaffold.

Use `add-case --work WORK --case FxE` to introduce another case; the missing human input reopens the gate and invalidates the old synthesis. `status` reports the earliest unmet obligation. See the workflow reference for fields, version changes, and exact command behavior.

Preserve original maps, engine code, existing skills, and historical evidence. Raw human messages and local work paths stay out of public packages by default. This workflow does not invoke evaluated models, paid evaluations, or publish a game. Repository maintenance follows the repository's own instructions.
