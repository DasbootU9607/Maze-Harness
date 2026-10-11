# Workflow and records

## Invocation and scope

A short request naming this skill and the official case IDs is enough to start. Do not request a long design prompt. Determine whether the user wants a new mechanism skill, an additional case in an existing skill, or revised logic for an already analyzed case. Reuse relevant explicit user input and authorization.

For an extension, identify which claims, profiles, observers, and regression cases would change. Preserve established behavior and unmodified evidence. New cases need their own human focus even if another installed skill already describes the same room. Existing records for the same case and scope are reusable; adding a source does not require the user to repeat input for unchanged sources.

The human-input requirement is a content dependency, not a general approval step. Once the necessary input is present, continue the authorized analysis, integration, writing, checks, and installation. Do not add confirmation gates after each phase. Only ask again when a material ambiguity or conflict cannot be resolved from the user's instructions.

## Minimum human brief

Ask in the user's language for the core operating relationship of each introduced room. Invite preparation -> enabled action/contact -> subsequent function, plus the complete objective or indispensable constraints when relevant. Accept a short free-form explanation. Do not force answers for every possible field.

Preserve the original statement and its conversation or user-brief reference in the private work record. Separately state the agent's interpretation in the analysis. User-selected logic is an extraction priority, not proof that the map implements it or that it is necessary. If the request is only "analyze this room," ask for the missing relationship; do not supply a preselected mechanism and call it human input. If the user supplies a route plus an explanation of what it demonstrates, the explanation can satisfy the requirement.

If a discrepancy changes the intended mechanism, show the relevant source/replay fact and ask whether to retain the supported interpretation, adjust the extraction target, or treat the proposed behavior as a new authored variant. Until answered, keep that case's integration pending. Ordinary implementation choices do not require confirmation.

## Work directory

`init` creates this layout, refusing an existing directory:

```text
WORK/
  workflow.json
  synthesis.md
  cases/
    hxh/
      analysis.md
      original-map.txt       created by capture
```

The manifest contains a `targetSkill` and one record per room:

| Field | Filled by | Meaning |
| --- | --- | --- |
| `id` | helper | Canonical room ID, for example HxH; H*H is accepted as input |
| `humanFocus.status` | agent from actual input | `awaiting-user` or `provided` |
| `humanFocus.statement` | actual user input | Original core logic, never an agent-generated substitute |
| `humanFocus.source` | agent | Conversation reference or user-authored brief location |
| `source.engineCommit`, `worldMap`, `level` | `capture` | Pinned official source identity |
| `source.mapPath`, `mapSha256` | `capture` | Work-relative original map and SHA256 of its bytes |
| `source.entryMode` | agent after inspection | `authored-player`, `world-transition`, or `specified-state` |
| `source.entryEvidence` | agent after inspection | Entry setup, state evidence and relevant code; explain any noncanonical state |
| `analysis` | `record-analysis` | Analysis artifact hash and fingerprint of the input/source record |
| `synthesis` | `record-synthesis` | Integration artifact hash and fingerprint of all current case records and target |

Edit the structured fields in `workflow.json` with UTF-8 JSON after collecting the input. Keep raw user words only in the work directory. For `specified-state`, retain the unchanged official map and identify the separate state override; do not label the override an official initial state.

## Commands and gates

All commands use `--work WORK`. Paths passed on the command line can be absolute; stored artifact paths remain relative to WORK. The helper has no network, installation, engine-mutation, or publishing behavior.

| Command | Additional arguments | Effect and prerequisite |
| --- | --- | --- |
| `init` | repeated `--case ROOM`, optional `--target SKILL` | Create blank records and analysis templates; no human input is fabricated |
| `add-case` | `--case ROOM` | Register another room; refuse duplicates; the prior synthesis becomes stale |
| `capture` | `--case ROOM --repo ENGINE` | Read HEAD world index and original map through Git; copy exact blob bytes into WORK; require a clean tracked engine tree |
| `status` | none | Show per-case input/source/analysis issues and synthesis readiness; exit 0 for a readable record, even when waiting |
| `record-analysis` | `--case ROOM` | Require human input, captured source, inspected entry context, and completed `cases/ROOM/analysis.md`; fingerprint them |
| `record-synthesis` | none | Require current analyses for every case, a valid target name and completed `synthesis.md`; fingerprint them |
| `scaffold` | `--out NEW_SKILL_PARENT` | Require current synthesis; create the target skill under this parent; refuse to overwrite an existing target |

Run commands with actual paths, not literal WORK or ENGINE. Quote room IDs containing `*` and paths containing spaces. `capture` uses a checkout's HEAD commit, not the remote's mutable branch name. Resolve the requested upstream version before capture; record any deliberate older baseline. The helper verifies room-to-file mapping and raw bytes, but cannot authenticate a Git remote or prove the checkout is official. Inspect the remote and provenance yourself. A vendored export needs its original checkout or an independently verified provenance record; do not invent a commit to make capture pass.

Read and complete the analysis template before `record-analysis`. Clear its `{{...}}` authoring fields by supplying evidence, a reasoned not-applicable finding, or an explicit unknown and its consequence. Do not remove missing obligations simply to pass the helper. Required full-goal evidence cannot be replaced by an unexplained unknown while presenting the target skill as verified.

An analysis fingerprint binds the room, human focus, pinned map and entry context. Changing any of them, the map bytes, or the analysis text makes the old record stale. Reinspect what changed, update the analysis, then record it again. Changes to any case, target name, case list, or synthesis text require renewed synthesis. A focus change need not rerun an unchanged legal route, but may require new causal checks; document which evidence is actually reused.

The helper rejects missing input, altered artifacts, unresolved template fields, duplicate cases, outside-work artifact paths, and target overwrites. These are record-integrity checks, not semantic judgments. Hashes cannot verify human authorship, authentic reading, interpretation, test correctness, or necessity. Do not call `record-*` merely because a file exists.

## Pause and resume

When human input is pending, show the concise missing-case question and continue independent source work. If no independent work remains, leave the record in its awaiting state and tell the user what input is needed. A timeout or no response is never an answer.

When a search is capped or a physics profile is unsupported, retain evidence and label that claim unknown. Continue supported work. If the missing evidence is essential to the requested skill, report an unfinished draft and the specific remaining obligation. Do not register unknown evidence as a verified result. Resuming begins with `status`, not a fresh overwrite.
