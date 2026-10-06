# Maze Harness

Agent skills for designing, building, and verifying MazeBench puzzles.

## Skills

| Skill | Use it for |
| --- | --- |
| [MazeBench Boundary Stagger](skills/mazebench-boundary-stagger/SKILL.md) | Fixed boundaries and relative offsets that release a route or pushing position |
| [MazeBench Hook Transfer](skills/mazebench-hook-transfer/SKILL.md) | Shape-dependent contact, usable docking, and movement transferred between objects |
| [MazeBench Constrained Transport](skills/mazebench-constrained-transport/SKILL.md) | Tool delivery through shared space, helper rearrangement, and changing pushing positions |
| [MazeBench Skating Cross](skills/mazebench-skating-cross/SKILL.md) | Directed ice stopping, reusable cross poses, changing pushing sides, and collecting a gem before returning to the doorway |

New authoring defaults to connected, multi-stage rooms. Before choosing shapes or coordinates, new authoring reads the skill's extracted mechanism logic and derives roles, player stances/contact, rigid shape/support/clearance, and then layout. It maps each inherited relationship to concrete authored geometry and builds an executable contract. Full cases remain available for evidence questions, maintenance, reproduction, and regression; they are not new-map templates. The first three skills use upstream official levels; Skating Cross uses the user's authored reference map. Compact mechanism demonstrations remain available when explicitly requested.

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

For a combined room, name the skills whose mechanisms you need. The agent constructs an authored specification and uses the supplied helpers; the browser is for editing and playing the result. Each `SKILL.md` routes first to mechanism logic, then planning guidance, an empty design scaffold, and the complex validation interface. New receipts fingerprint mechanism logic; legacy case receipts remain supported. Reading records establish document version consistency, not understanding or necessity. At least three dependent functional stages are required; walking, repeated pushes in one direction, and unrelated blockers do not count. The checks reject missing evidence and report capped or unsupported searches as unknown. Ice needs the Skating Cross observer; the other skills' unit-translation profiles do not certify sliding.

Builders create fresh local drafts. Verification checks supported mechanics and declared restrictions; it does not measure human difficulty. These skills are for map authoring, not benchmark model evaluation.

## Package structure

Each skill contains `SKILL.md`, agent metadata in `agents/`, focused guidance in `references/`, and reusable helpers in `scripts/`. The references include three unmodified official case-map excerpts and one user-authored Skating Cross map, selected key states, scoped restriction results, and runnable design contracts. Development drafts, screenshots, complete extraction traces, and test-run archives stay outside the distribution.

The legacy helpers retain their existing profiles. The complex entrypoints and official case evidence were validated against engine commit `0ac96b8a2648db09f375989cd7bc33699222c1e6`; earlier basic helpers used baseline `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe` with Node 24.13.0. Review engine interfaces and revalidate generated maps when changing that dependency. Each checker documents its supported profile and reports capped searches as unknown.

Author self-tests accepted three full official cases and six constrained or local shape variants, and rejected four solvable controls that bypassed the required planning. These results do not establish human difficulty or improved independent-author performance. The reusable official regression evidence is included in each skill's `official-checks.json`; the full development archive remains local.

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)

## Skill authoring conventions

Follow [AGENTS.md](AGENTS.md) when adding or editing a skill. Skill IDs use `mazebench-<mechanism>`; entrypoint titles, UI names, README labels, and invocation prompts must agree. Case resources use `official-*` for upstream maps, `user-*` for user-authored maps, and `authored-*` for new fixtures. Using the official engine does not change a map's provenance.

All maintained documentation, metadata, comments, and explanatory strings are in English. Run `node scripts/check-skills.cjs` before completing an edit; GitHub Actions runs the same naming, language, link, provenance, and fingerprint checks. Original source-map bytes and historical verification results remain preserved; current package fingerprints are recorded separately.

The Skating Cross checker accepted the complete user case and two symmetry controls (reflection and quarter-turn), rejected a solvable easy bypass and a false directional dependency, and returned unknown for capped and unsupported-shape controls. Its complete objective includes the post-gem return to the doorway; its ordinary-move search preserves directed stopping and checks full rigid footprints. See its `user-checks.json` for scoped evidence.

`node scripts/test-read-records.cjs` checks current legacy/new reading formats, stale-version rejection, local receipt paths, and authored anchor membership. Pass `--repo ENGINE --out NEW_OUTPUT` to also replay all complete packaged case routes through a separate official engine checkout. Format acceptance alone does not prove the declared functional explanations or human difficulty.
