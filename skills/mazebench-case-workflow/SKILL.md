---
name: mazebench-case-workflow
description: Create and maintain MazeBench mechanism skills from official rooms and human-provided variants. Collect core logic per introduced reference, analyze source and motion evidence, integrate related cases, and maintain a reference library with explicit difficulty tiers and grading evidence. Use for case-to-skill authoring and later reference additions, not ordinary room generation or model evaluation.
---

# MazeBench Case Workflow

Turn official cases and supplied variants into reusable map-authoring skills, then maintain their reference libraries as new cases appear. The human chooses the operating logic worth extracting; the agent establishes what the evidence supports, integrates related cases, explains relative difficulty, writes the skill, and validates it.

## Start with the case-specific human input

For **every newly introduced official case or human-provided variant**, obtain the user's own description of the core causal behavior to preserve before extracting its mechanism or integrating it into a skill. A room ID, screenshot, solution sequence, or instruction to analyze it is not itself a description of that behavior. For a variant, also identify what it intentionally preserves and changes; the supplied description may already answer both. Agent-authored variants may use an explicit human variant brief covering the intended family, with a traceable per-case mapping. Do not invent an answer, infer consent from silence, or reuse unrelated case input.

Use relevant input already supplied by the user in this conversation or a user-authored case brief; retain its source and do not ask again. A previously recorded focus for the same case and scope may be reused. Existing agent-written case analysis alone does not satisfy this requirement. A new case added to an existing skill gets its own input record.

Ask one concise, localized question per missing case, bundling several cases when practical: **What core operating relationship should this case contribute? Describe what is prepared, what action or contact that enables, and what it makes possible next. Include the complete objective or constraints if they matter.** Natural language is enough; the user need not supply coordinates, JSON, complete routes, or proofs. Use an asynchronous question tool when available. Continue source lookup and work on already supplied cases while waiting; keep the dependent extraction pending.

Record the user's words separately from agent interpretation. Read [Workflow and records](references/workflow.md) before beginning. Use the [case analysis template](assets/case-analysis.md) for each case and the [synthesis template](assets/synthesis.md) for integration.

## Follow the construction workflow

1. **Register the request.** Identify the case IDs, source kinds, new-skill versus extension mode, and destination. Register new cases before synthesis; for an extension, load the existing reference catalog and preserve unaffected entries. Use [existing patterns](references/existing-patterns.md) to choose relevant precedent without importing its conclusions.
2. **Pin the source.** Resolve official rooms through the world index. Preserve variant inputs separately, recording their parent references, changes, original bytes, map hash and engine version. Using official tools never changes a variant into an official case. Source capture/import can proceed while human input is pending.
3. **Analyze each case after its human input.** Follow [Analysis and evidence](references/analysis-guide.md): full initial state and entry context, complete rigid groups, source-backed movement rules, full-goal replay, key events, structural functions, and scoped counterfactuals. Read the entire affected case and its evidence when extending an existing skill.
4. **Extract transferable relations.** For each human-requested relationship, distinguish source fact, witnessed realization, restricted-search result, and unresolved hypothesis. Separate function from coordinates, silhouette, and a particular move order. Ask a focused question if the user's intended relationship conflicts with the evidence; preserve both until resolved.
5. **Integrate and grade the reference library.** Follow [Reference library and difficulty](references/reference-library.md). Write the synthesis before the skill; classify each addition as corroboration, an optional realization, a graded variant, or a changed mechanism. Maintain shared invariants, conditional branches and source-specific evidence. Record each reference's tier and rationale as human-assigned, a provisional structural estimate, playtest-supported, or explicitly unranked. Do not concatenate narratives or promote a case-specific necessity result to another case.
6. **Write or update the package.** Follow [Package format and acceptance](references/package-format.md). Derive the skill's authoring rules from the synthesis. Keep the full official cases for regression and the new-map template empty. Choose unspecified names, shapes, coordinates, and implementation details autonomously.
7. **Verify and install.** Check package conventions and the affected helpers, replay the complete official objectives, then try a substantively new authored realization when claiming transfer. Report unknowns honestly. Install the completed skill in the configured skill directory; follow repository instructions and existing authorization for synchronization.

8. **Update the project website.** In Maze Harness, completed skill and playable-trial publication is already authorized. Follow [Website completion](references/website.md), run the repository publisher, and check the Pages result before ending the task. Include this step for later reference additions and newly generated verified examples; do not wait for another website prompt.

The workflow records are resumable. The helper checks input, provenance, lineage, grading records and artifact versions. It cannot prove human authorship, understanding, mechanism truth or human difficulty. Never describe its success as gameplay verification.

## Automation

Run from this skill directory; keep working records outside distributed skills. Node.js and a local Git checkout of the official engine are sufficient for source capture. Gameplay analysis also needs the engine's dependencies.

```text
node scripts/workflow.cjs init --work NEW_WORK --case HxH --case GxE --target mazebench-new-mechanism
node scripts/workflow.cjs capture --work NEW_WORK --case HxH --repo ENGINE
node scripts/workflow.cjs status --work NEW_WORK
node scripts/workflow.cjs record-analysis --work NEW_WORK --case HxH
node scripts/workflow.cjs rate --work NEW_WORK --case HxH --level l2 --basis structural-estimate --rationale "PUBLIC_STRUCTURAL_REASON" --evidence "ACTUAL_ANALYSIS_REFERENCE"
node scripts/workflow.cjs record-synthesis --work NEW_WORK
node scripts/workflow.cjs scaffold --work NEW_WORK --out NEW_SKILL_PARENT
```

Capture/import and record each case separately. Fill `workflow.json` with actual human input, entry context and adopted relation IDs; complete each analysis before assigning its difficulty. The sample l2 is illustrative, not an automatic rating. `scaffold` requires current records for **all** cases and creates an explicitly unfinished package including the reference catalog and difficulty-guide template. Fill and validate it before installation. For extensions, import the baseline catalog, export a reviewed merged catalog and update the existing package deliberately.

Use `add-case --work WORK --case FxE` for a similar official case, or `add-case --work WORK --case user-offset-easy --parent HxH` for a human variant. Each addition reopens its own input gate. See [incremental commands and grading rules](references/reference-library.md) for import, baseline merge, relative tiers and selective revalidation. `status` reports the earliest unmet obligation.

Preserve original maps, engine code, existing skills, and historical evidence. Raw human messages and local work paths stay out of public packages by default. This workflow does not invoke evaluated models or paid evaluations. Website publication follows the explicit project authorization and the completion procedure above. Repository maintenance follows the repository's own instructions.
