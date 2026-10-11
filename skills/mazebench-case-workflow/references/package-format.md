# Package format and acceptance

## Canonical deliverable

The generated deliverable is a mechanism skill; this workflow itself is a different package type. Use the current repository's `AGENTS.md` conventions when available. Do not force a workflow package to contain invented gameplay fixtures just to resemble a mechanism package.

```text
mazebench-mechanism/
  SKILL.md
  LICENSE
  agents/openai.yaml
  references/
    mechanism-logic.md
    reference-catalog.json
    difficulty.md
    design.md
    verification.md
    design-template.json
    official-case.md
    official-world-map.txt
    official-design.json
    official-states.json
    official-checks.json
    official-fxe-case.md       additional cases use a qualified family
    official-fxe-world-map.txt
    official-fxe-design.json
    official-fxe-states.json
    official-fxe-checks.json
  scripts/                    only implemented, reusable helpers
```

The scaffold creates the entrypoint, metadata, license, empty new-map contract, mechanism template, reference catalog, difficulty-guide template, and source-qualified official/user/authored maps and case templates. It deliberately creates no fake design, state, verification result or engine wrapper. Add those from actual analysis and execution. For an extension, preserve existing case families and stable IDs; the primary case need not be renamed to add another. Follow [Reference library and difficulty](reference-library.md) to merge references and assign relative tiers.

Use lower-hyphen skill/resource names, matching folder and YAML name, `MazeBench <Mechanism>` H1/UI/README title, and an invocation prompt containing `$mazebench-<mechanism>`. The description should trigger on the mechanism and authoring purpose. UI strings are quoted; the short description is 25-64 characters. Keep normal automatic discovery enabled unless the user explicitly requests otherwise. In Maze Harness, maintained documentation/metadata/comments are English, UTF-8 without BOM, LF with a final newline, and JSON uses two spaces. Converse in the user's language. Preserve original evidence bytes and applicable notices.

## Standard entrypoint sections

Use [the entrypoint template](../assets/skill-template.md) and adapt its instructions to the supported mechanism:

1. Mechanism definition and complete objective; identify the official source cases.
2. Required mechanism reading and full-case reading for maintenance/reproduction; version receipt limitations.
3. Design order and functional stages; choose unspecified geometry autonomously.
4. Source-backed motion rules, supported physics/profile, and distinct claim strengths.
5. Actual build/verify commands and deliverables, with fresh output locations and known limits.

Include reference selection through `reference-catalog.json` and `difficulty.md`: shared relation IDs, provenance/parent, relative tier, grading basis, comparison rationale and limits. Difficulty labels belong in the catalog/guide, so regrading metadata does not automatically change official case analysis or imply a new replay. User variants retain `user-*` families and actual parent/change provenance.

Keep the entrypoint concise. Put case evidence in case documents, transferable relations in `mechanism-logic.md`, layout derivation/composition in `design.md`, and executable contract/search/observer details in `verification.md`. Additional planning/complex-validation references are appropriate when the implementation needs them. Do not promise a script until it exists and has been run.

## Mechanism and new-map contract

Use [the mechanism template](../assets/mechanism-template.md). Each stable relation records roles, preconditions, action/contact, consequence, downstream work, cited case/event and scoped evidence strength. State what must be preserved, what can vary, and what the new map must check. Keep cross-case support and limitations visible.

Start new authoring with [the empty design template](../assets/design-template.json); fill in the supported profile and profile-specific field structure when implementing the runtime. Leave its title, cells, inherited geometry, events, stages, dependencies and witness empty. A scaffold is intentionally not a runnable design. Do not use official case coordinates or a solved case as the default new-map template.

Use `contract.readReceipt` with `path`, SHA256 and `readBeforeLayout: true`. New maps read `references/mechanism-logic.md`; original-case regression may read the full case document. Resolve receipt paths inside the skill and reject stale versions. A receipt is a version consistency declaration, not proof of understanding or timing. Each adopted relation must map to actual authored members, boundaries, passages, stops/stances and support conditions; declarations alone do not verify them.

Keep official runnable contracts separate. Preserve map, engine and entry-state provenance; include all members/elevations, complete endpoint, events, dependencies, witness and compatible profile. Use `official-*` only for genuine upstream maps, `user-*` for user-authored cases and `authored-*` for new fixtures. A derivative using the official engine remains a derivative. For a noncanonical entry-state fixture, explicitly record the override and do not claim the fixture is the untouched initial state.

## Evidence packaging and maintenance

Record each official room's `originRoom.id`, `worldMap`, `level` and `relationship`. Case documents include the engine commit and original-map SHA256. Keep states/checks concise, reproducible and linked to their initial state, full goal, observer/profile, command, cap, restrictions and result. Include source map references and hashes where supported by the schema. Mark reused historical results as historical.

Maze Harness uses `packagedDesign` to fingerprint the current case design's `cells`, `contract` and case document separately from historical run artifacts. Update case reading receipts and these current fingerprints when the documents/contracts change. Do not alter historical evidence to imply a new run. A documentation-only revision need not repeat an unchanged expensive search, but run required regressions and disclose reuse.

Private human-input records guide the synthesis. Distribute a concise mechanism focus and evidence trace, not raw user conversations, local absolute paths, development archives or work-state files. The human focus must remain traceable locally. Reusable skills contain self-contained relative references and the licenses/notices needed for included material.

## Acceptance

Before calling the skill complete:

- Check names, language, encodings, links, metadata, case families, source hashes, current receipts and fingerprints. Run `node scripts/check-skills.cjs` in Maze Harness; use the available skill-creator validator for the entrypoint.
- For reference-library updates, check unique stable IDs/families, valid acyclic parents, source kinds, mapped relation IDs, local case/map fingerprints and defined levels. Every placement needs an explicit basis and rationale; unranked entries need a reason. Review changed neighbor comparisons and rubric meanings. These checks do not certify human difficulty.
- For reading/contract changes in Maze Harness, run `node scripts/test-read-records.cjs`; optionally add `--repo ENGINE --out NEW_OUTPUT` for the full existing official replays. Run affected helpers with fresh outputs for code/observer changes. Unsupported physics must fail as unknown, not pass.
- Replay each affected official case to its complete objective using ordinary official actions, or reuse a clearly identified matching regression only when the change does not affect it. Keep source and derivative results distinct.
- Test claims whose truth the new or changed skill relies on. A legal witness plus an exhausted compatible exclusion supports a scoped dependency; a cap is unknown. Test solvable bypass controls so the observer cannot certify mechanism-free solutions.
- When claiming new-map transfer, build and verify at least one substantively different realization derived from the extracted functions. A reflection, rename or extra cell alone does not establish transfer. If no new realization was checked, state that limitation rather than claiming independent-author reliability.
- If Play/Edit links, browser behavior, saving or export are deliverables, verify them separately; engine replay does not test the UI. Workflow-only changes do not require inventing a new puzzle or rerunning unrelated searches.

Install only the completed package in the configured skill directory, preserving existing installations or updating them deliberately. Report the skill path, short invocation, core extracted logic, cases used, checks actually run and unresolved scope. Do not finish with only a proposed workflow when the user requested the package itself.
