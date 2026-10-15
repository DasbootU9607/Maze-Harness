# Maze Harness

Agent skills for designing, building, and verifying MazeBench puzzles.

[Explore the website](https://dasbootu9607.github.io/Maze-Harness/) · [256-room world map](https://dasbootu9607.github.io/Maze-Harness/world.html) · [Play the full maze](https://dasbootu9607.github.io/Maze-Harness/player.html)

The website pairs mechanism skills with complete official references and existing agent-authored trials. Every room thumbnail opens the 3D player; highlighted tiles on the 16 × 16 world map link to the associated skill. The playground includes room search, an unrestricted room picker, keyboard and touch controls, undo/reset, and saved solution playback. See [website maintenance](docs/website.md) for local preview, data provenance, and GitHub Pages publishing.

The [six-map planning batch](trials/planning-batch/README.md) adds reciprocal shield handoffs, enclosure recovery, self-crossing single-shield routes, reserved bridge convoys, offset release, and ordered tool retreat/recovery. Each trial has a complete ordinary-engine route, a public design contract, scoped exclusion checks and reachable branch evidence. Difficulty labels are structural estimates, without human playtests.

## Skills

| Skill | Original room | Use it for |
| --- | --- | --- |
| [MazeBench Case Workflow](skills/mazebench-case-workflow/SKILL.md) | Official cases and supplied variants | Collect core logic, analyze evidence, maintain related references and difficulty tiers, and create or extend a standardized skill |
| [MazeBench Boundary Stagger](skills/mazebench-boundary-stagger/SKILL.md) | HxH | Fixed boundaries and relative offsets that release a route or pushing position |
| [MazeBench Hook Transfer](skills/mazebench-hook-transfer/SKILL.md) | GxE; FxE; FxG | Shape-dependent contact, shared clearance, tool-role changes, and connected passage opening |
| [MazeBench Constrained Transport](skills/mazebench-constrained-transport/SKILL.md) | GxF; GxG; GxH | Goal-dependent tool selection, shared workspace, reserved circulation, and usable delivery with return |
| [MazeBench Skating Cross](skills/mazebench-skating-cross/SKILL.md) | JxG | Directed ice stopping, reusable cross poses, changing pushing sides, and collecting a gem before returning to the doorway |
| [MazeBench Bridge Convoy](skills/mazebench-bridge-convoy/SKILL.md) | BxE | Limited bridges, gate occupancy, independent staging, and turning a floor-first convoy |
| [MazeBench Block Coordination](skills/mazebench-block-coordination/SKILL.md) | BxB; BxC | Sequential shield handoffs, joint transport followed by separation, and retaining tools for later access |
| [MazeBench Enclosure Navigation](skills/mazebench-enclosure-navigation/SKILL.md) | CxB; DxB | Reachable cavity entry, shape-dependent protected directions, and safe release at the exit |
| [MazeBench Clear Ground Turning](skills/mazebench-clear-ground-turning/SKILL.md) | ExB | Reusing one gate-shielding block through safe-ground changes of pushing side |

New authoring reads the skill's extracted mechanism logic before choosing shapes or coordinates, then derives roles, player stances/contact, rigid shape/support/clearance, and layout. It maps each inherited relationship to concrete authored geometry and an executable verification plan. Stage count follows the selected mechanism and requested scope. Full cases remain available for evidence questions, maintenance, reproduction, and regression; they are not new-map templates. Each case identifies its complete upstream official room. Compact mechanism demonstrations remain available when explicitly requested.

## Install

Copy each desired directory from `skills/` into your coding agent's configured skill directory. Keep the entire directory together: its instructions reference the included documentation and scripts. Alternatively, ask the agent to read the relevant `SKILL.md` directly from a checkout of this repository.

The skills need a separate [MazeBenchEngine](https://github.com/mazebench/MazeBenchEngine) checkout, Node.js, the engine's dependencies, and write access to its local drafts. Pass that checkout explicitly as `--repo`; the skill packages do not bundle the engine or game assets. The website includes a separate, pinned browser runtime for playing the published examples.

For automatic authoring records, configure the optional [local recorder](tools/authoring-observatory/README.md) once. Skill tasks then appear in its live viewer, and normal build/verification commands save version-bound evidence automatically. Verified website cases with a recorded run expose a **Build process** graph showing revisions, failed attempts, tests and concise design annotations. The graph presents saved evidence, not private internal reasoning.

## Use

To create a new mechanism skill or add an official case to an existing one:

```text
Use $mazebench-case-workflow to build a skill from official room HxH.
```

For each introduced case, the agent first asks for the human's core operating logic, unless that input is already available. A short natural-language explanation is sufficient. It then pins the original map, analyzes initial states and motion rules, replays the full objective, extracts and integrates causal relations, writes the package, and checks the implemented scope. Additional cases get separate human-input records. The helper detects missing input and stale analysis/synthesis versions; it does not certify human authorship or gameplay truth. Source capture may continue while input is pending. Working records remain private and outside distributed skills.

The Case Workflow supplies templates and a resumable `workflow.cjs` helper. Its scaffold is explicitly unfinished; the agent must supply actual evidence and compatible helpers before installation. Run `node scripts/test-case-workflow.cjs` for its source-capture, input-gate, stale-record and scaffold regressions. Existing gameplay profiles retain their original scope; newer reference verifiers do not automatically certify new maps.

Later additions can be similar official cases or user-supplied variants. The workflow preserves their provenance, parent/change records, shared mechanism relations and stable case families in `reference-catalog.json`. A difficulty guide compares skill-relative levels using explicit human assignments, provisional structural estimates or actual playtest evidence; ties and unranked cases are allowed. Baseline catalog imports support incremental merges without replacing original cases. New variants require their own replay and mechanism checks; neither the parent's proofs nor its difficulty automatically transfer. Each current catalog states its actual grading basis.

Give the authoring request to the coding agent:

```text
Use $mazebench-constrained-transport to design a new room where collecting
the gem requires helper rearrangement, temporary parking, and usable tool
delivery. Choose the geometry. Build a new draft, replay a complete solution,
test the dependencies you claim, and provide Play/Edit links and the map.
```

For a combined room, name the skills whose mechanisms you need. Each `SKILL.md` routes first to mechanism logic, then planning guidance, an empty design scaffold, and its documented verification interface. Reading records establish document version consistency, not understanding or necessity. The established complex authoring profiles require at least three dependent functional stages; walking and repeated pushes alone do not count. Official reference profiles instead check their actual source, complete route and declared local or restricted controls. They cannot certify a newly authored room without a compatible observer and fresh evidence. Capped or unsupported searches remain unknown. Ice needs the Skating Cross observer; unit-translation profiles do not certify sliding.

Builders create fresh local drafts. Verification checks supported mechanics and declared restrictions; it does not measure human difficulty. These skills are for map authoring, not benchmark model evaluation.

## Package structure

Each skill contains `SKILL.md`, agent metadata in `agents/`, focused guidance in `references/`, and reusable helpers in `scripts/`. References contain unmodified official room maps, selected key states, scoped restriction results, and runnable design contracts. Development drafts, screenshots, raw human demonstrations, complete extraction traces, and test-run archives stay outside the distribution. Original Git LF and checkout CRLF maps retain their own hashes; publication accepts only exact bytes or CRLF-to-LF equivalence.

The legacy helpers retain their existing profiles. The complex entrypoints and official case evidence were validated against engine commit `0ac96b8a2648db09f375989cd7bc33699222c1e6`; earlier basic helpers used baseline `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe` with Node 24.13.0. Review engine interfaces and revalidate generated maps when changing that dependency. Each checker documents its supported profile and reports capped searches as unknown.

Author self-tests accepted three full official cases and six constrained or local shape variants, and rejected four solvable controls that bypassed the required planning. These results do not establish human difficulty or improved independent-author performance. The reusable official regression evidence is included in each skill's `official-checks.json`; the full development archive remains local.

The additional [FxE case](skills/mazebench-hook-transfer/references/official-fxe-case.md) has a complete 149-input ordinary replay and separate scoped checks. It adds tool-role changes and repeated contact pairs. Some global exclusions are capped, so it is not included in the earlier three-case complex-pass claim. Its `official-fxe-checks.json` preserves those limits, and `verify-official-fxe.cjs` reruns the scoped regression.

The newer references extend the rule library without adding authored mazes. In particular, GxG witnesses short-bar delivery but its target-freeze and transfer-exclusion searches are capped; they do not prove a unique final tool or mandatory contact. GxH witnesses an L-shaped final tool with exhaustive scoped controls. The updated GxF solution includes the post-gem doorway return while preserving its historical gem-route contract. Difficulty tiers are structural estimates unless a catalog explicitly states another basis. Transfer to new geometry remains to be tested.

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)

## Skill authoring conventions

Follow [AGENTS.md](AGENTS.md) when adding or editing a skill. Skill IDs use `mazebench-<mechanism>`; entrypoint titles, UI names, README labels, and invocation prompts must agree. Case resources use `official-*` for upstream maps, `user-*` for user-authored maps, and `authored-*` for new fixtures. Using the official engine does not change a map's provenance.

All maintained documentation, metadata, comments, and explanatory strings are in English. Run `node scripts/check-skills.cjs` before completing an edit; GitHub Actions runs the same naming, language, link, provenance, and fingerprint checks. Original source-map bytes and historical verification results remain preserved; current package fingerprints are recorded separately.

The Skating Cross checker accepts the complete official JxG case. Historical checker controls accepted reflection and quarter-turn variants, rejected a solvable easy bypass and a false directional dependency, and returned unknown for capped and unsupported-shape controls. Its complete objective includes the post-gem return to the doorway; its ordinary-move search preserves directed stopping and checks full rigid footprints. See its `official-checks.json` for scoped evidence.

`node scripts/test-read-records.cjs` checks current legacy/new reading formats, stale-version rejection, local receipt paths, and authored anchor membership. Pass `--repo ENGINE --out NEW_OUTPUT` to also replay all complete packaged case routes through a separate official engine checkout. Format acceptance alone does not prove the declared functional explanations or human difficulty.
