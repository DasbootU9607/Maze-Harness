# Reference library and difficulty

## A maintained library per mechanism skill

A skill can accumulate related official cases, human-authored variants and deliberately authored test cases. Preserve a shared mechanism core, with optional branches and a relative difficulty ladder. Similar silhouettes, equal route lengths or simultaneous motion do not establish membership: map each reference to the skill's stable functional relation IDs and compatible motion rules.

Use `references/reference-catalog.json` as the inventory and `references/difficulty.md` as the human-readable selection and comparison guide. Keep full case evidence in its existing case family. Additions extend this library; they do not replace the original reference or silently rewrite its conclusions. Official status says where a map came from, not how difficult it is.

| Reference kind | Stable ID and file family | Source and role |
| --- | --- | --- |
| Official | Room ID such as FxE; retain an existing `official` or `official-fxe` family | Unmodified upstream map resolved through the world index |
| Human variant | `user-offset-easy`; matching `user-offset-easy-*` files | User-created/supplied variant, with actual source and differences |
| Agent-authored | `authored-offset-recovery`; matching family | New fixture created under an explicit human variant brief; never labeled official |

Record `parentCase` when a map derives from a particular reference, and `changeSummary` describing both retained functions and changed geometry, constraints or objective. Parent references may come from the imported baseline catalog. Preserve their IDs; reject missing parents and cycles. A standalone human design can have no single map parent, but must explain its relationship to the shared mechanism. An additional official case is related evidence, not a user-derived child of another official room.

Keep copies of supplied files. The helper imports exported world-map `.txt` bytes without modification and pins the engine used for analysis. For Build JSON or another supported save format, retain the supplied original and export a map through the official tooling; record both hashes and any conversion differences in the analysis. A screenshot or prose-only proposal remains a candidate until its actual state can be established. Importing bytes does not validate the map or its solution.

## Human input for additions

Each new official case or supplied human variant needs the user's core logic before extraction. For variants, also capture what is intended to stay invariant, what changes, and any desired difficulty. Accept information already supplied; do not ask for it twice. If several agent-created variants are requested under one explicit human brief, record how each maps to that brief instead of demanding another prompt for each generated map.

Ask for the core logic when missing; difficulty preference is optional. Preserve explicit user tier assignments as human-assigned judgments. Otherwise propose a structural estimate autonomously after analysis, label it provisional, and explain its basis. Do not invent human confirmation or demand approval of every estimate. If a new case changes the defining mechanism rather than realizing it differently, identify a conditional branch or a separate skill; do not distort the existing core merely to fit the addition.

## Relative difficulty ladder

Use the user's tier names and ordering when supplied. Otherwise start with the editable l1 Foundation, l2 Combination, and l3 Planning levels from the helper. These organize references inside this skill and its stated objectives; they are not an official MazeBench ranking or calibrated human-difficulty scores. Ties and empty tiers are valid. Mark incomparable or insufficiently understood references unranked with a reason; do not fabricate an ordering to populate every tier.

Assess the following dimensions qualitatively and cite actual causal states/checks:

- Preparation depth: dependent opportunities that must be created before useful action.
- Working constraints: complete-body clearance/support and accessibility of the next input stance or ice stop.
- Reuse and coordination: shared-space competition, changing tool/helper roles, restoration and withdrawal.
- Commitment and recovery: alternatives lost after a move, reversible preparation and dead-end risk.
- Inference and visibility: how readily the useful relationship is apparent, labeled as a design judgment unless supported by player evidence.

Describe why a reference differs from a nearby lower or higher tier. Prefer variants that change an identifiable constraint or dependency while preserving the core relation. When several dimensions change together, report that confound; additional groups, longer routes and more search nodes do not by themselves establish greater difficulty. Raw counts may be supplementary observations, never the sole rubric. Compare like goals and entry states; separate incompatible motion profiles or explain why no single ordering is warranted.

| Basis | Required interpretation |
| --- | --- |
| `human-assigned` | The user supplied the tier; retain the private input source and a public rationale. This is a preference/judgment, not a playtest result. |
| `structural-estimate` | The agent infers a provisional tier from analyzed dependencies and constraints. Cite the analysis; do not claim empirical human difficulty. |
| `playtest-supported` | Actual relevant player evidence supports the placement. Preserve the goal/map versions, protocol, sample, observations and limits; a solver run is not a playtest. |
| `unranked` | There is an explicit reason not to order this reference yet. Use `unranked` for both level and basis. |

The helper validates these declarations and binds working ratings to analysis/rubric versions. It does not evaluate the truth of the rating or authenticate its evidence. Keep private rating evidence in WORK; the public catalog contains the tier, basis, rationale and case link. Add the relevant anonymized evidence summary to the case or difficulty guide before making playtest claims.

## Incremental update sequence

1. Locate the current skill, its catalog/difficulty guide and prior private workflow records when available. Read the affected case evidence and current mechanism core. Preserve existing relation IDs, case families, goals, maps, routes and scoped conclusions.
2. Resume the previous WORK or initialize a new extension containing only the new/revised cases and import the existing catalog. Unchanged baseline cases do not require re-entering human focus or rerunning unchanged searches. For a legacy skill without a catalog, first inventory its existing cases into a catalog with honestly labeled provisional/unranked entries; do not invent historical human input or empirical ratings.
3. Register the addition, collect its required human logic, capture/import the map, and analyze/replay its complete objective. For a variant, compare parent and child states, retained relations, changed constraints and possible bypasses. Check the child independently; the parent's necessity proof does not transfer.
4. Map the contribution to shared relations. Classify it as corroboration, a new realization/conditional branch, a graded variant, or a distinct mechanism. Update common invariants only with supporting evidence; preserve case-specific statements and counterexamples.
5. Assign or revise the relative tier with a rationale and evidence basis. Compare affected neighbors. Review all affected placements when changing the rubric, objective scope or level meanings; do not silently relabel old grades. Keep different mechanisms/profiles unranked or in explicitly described comparison groups when needed.
6. Renew the synthesis and export a merged catalog. Preserve unaffected baseline entries exactly. Update the difficulty guide, affected mechanism/design/verification guidance, and the new case family. Add hooks for reference selection by desired level and mechanism branch; select functions rather than copying a solved map's geometry.
7. Run format/catalog checks and the affected game regressions. Revalidate existing cases only where changed shared code or claims can affect them, plus repository-required replays. Install the updated package. Report added references, lineage, tier/basis/rationale, changed claims and remaining uncertainty.

The reference tier and authoring mode are separate. A lower-tier reference may be a compact demonstration; it does not silently disable the target skill's default complex-authoring contract. New maps still need their own full-goal and mechanism checks, even when their reference has a supported tier.

## Helper commands

Run from this workflow skill directory. New WORK records include the default ladder; legacy records without it continue to work and can opt in with `enable-library` without invalidating their unchanged case analyses.

```text
node scripts/workflow.cjs enable-library --work EXISTING_WORK
node scripts/workflow.cjs import-baseline --work EXTENSION_WORK --file EXISTING_SKILL/references/reference-catalog.json
node scripts/workflow.cjs add-case --work EXTENSION_WORK --case user-offset-easy --parent HxH
node scripts/workflow.cjs import-variant --work EXTENSION_WORK --case user-offset-easy --map VARIANT.txt --repo ENGINE --origin "ACTUAL_SOURCE_REFERENCE"
node scripts/workflow.cjs record-analysis --work EXTENSION_WORK --case user-offset-easy
node scripts/workflow.cjs rate --work EXTENSION_WORK --case user-offset-easy --level l1 --basis structural-estimate --rationale "PUBLIC_COMPARISON_REASON" --evidence "PRIVATE_ANALYSIS_REFERENCE"
node scripts/workflow.cjs record-synthesis --work EXTENSION_WORK
node scripts/workflow.cjs export-catalog --work EXTENSION_WORK --out NEW_OUTPUT/reference-catalog.json
```

Register FxE with `add-case` and use `capture` for an official addition. Fill human focus, entry context, `parentCase`/`changeSummary` as applicable, adopted `relations`, actual analysis, rating and synthesis before recording the corresponding phase. Parent IDs must already exist in WORK or the imported catalog. Baseline imports preserve content-addressed snapshots and existing file families, and avoid a new official reference colliding with the original `official-*` family. They do not copy all old maps; baseline extensions therefore use `export-catalog`, not a partial scaffold masquerading as a complete skill.

`rate` requires a current analysis, known level, rationale, source/evidence and shared relation IDs. Changes to analysis, map/entry/focus, or rubric require reviewing the dependent rating; changing only a rating invalidates the synthesis, not the official replay. Regrading metadata belongs in the catalog/guide so a label edit alone need not rewrite a full case. If case prose changes, update its reading receipt/current fingerprints as usual. New map versions get new variant IDs or a fresh work directory; existing evidence is not overwritten.

The exported catalog schema contains `schemaVersion`, `targetSkill`, `scope`, ordered `levels`, and `references`. Each reference records `id`, `kind`, stable `family`, `parentCase`, `changeSummary`, `relations`, map/engine fingerprints, `casePath`, and `difficulty` with `level`, `basis`, `rationale`. These fields enable selection and maintenance; they are not a gameplay certificate. The package checker validates catalog structure, lineage, local case/map links and relation IDs when a catalog is present.
