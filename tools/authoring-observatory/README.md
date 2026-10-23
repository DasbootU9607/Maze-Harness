# Local authoring recorder

This optional Node/Python runtime integrates with the mechanism skill bridges. It saves append-only events, immutable candidate snapshots, resource copies, command stdout/stderr and version-bound test reports. It starts or reuses a loopback-only, read-only viewer. No database, npm install or model API is needed. Node 20+ and Python 3 are required.

## One-time installation

From the repository root, run:

```text
node scripts/install-authoring-observer.cjs --skills SKILLS_DIRECTORY --runtime RUNTIME_DIRECTORY --backup BACKUP_DIRECTORY
```

The installer preserves unrelated installed skill content. It adds the observer instructions and CLI bridge to the eight installed mechanism skills, backs up every replaced file, and writes private discovery settings beside those skills. Use an absolute runtime path. The runtime directory must contain this folder's files; local runs and an existing local viewer can be retained there. To use the runtime directly from this checkout, point at `tools/authoring-observatory`.

After setup, invoke a maze skill normally. The agent starts a task before reading mechanism references, records the resources it reads and concise design summaries, then uses the normal builders and verifiers. Their CLI wrappers automatically record each operation. Every task appears in the viewer without a separate user command. An explicit `start` creates a new task; supported commands using the same spec join an active task. A command after `finish` starts a new task.

Private settings accept `runtime`, `runsRoot`, `python` and `viewer` (default true). `MAZEBENCH_OBSERVER_CONFIG` selects a settings file; `MAZEBENCH_OBSERVER_RUNTIME` overrides the runtime path. These paths are local configuration, never published package data. `viewer: false` is intended for isolated tests. Imported helper APIs remain unchanged; automatic capture applies to CLI entrypoints, not arbitrary direct function calls.

## Shared local process view

The viewer can serve the checked public website on its existing port under `/Maze-Harness/`. Set `publicSiteDir` in a private `.mazebench-observatory.json` beside the runtime or in an ancestor directory. Paths resolve relative to that settings file. The server also honors `MAZEBENCH_OBSERVER_CONFIG`, or an explicit `node server.cjs --site PUBLIC_SITE_DIRECTORY` argument.

For example, in the directory containing the runtime and repository:

```json
{
  "runtime": "./authoring-observatory",
  "publicSiteDir": "./Maze-Harness/site"
}
```

Restart the viewer after changing configuration. Its normal polling discovers newly registered cases without another server or refresh command. A matching run displays **Key events and 3D preview**, opening the same collapsible process page and 3D player used by Pages. Raw evidence remains available in the original viewer.

Matching requires the local run's last candidate and the public process's last candidate to agree on cells, contract and explicitly recorded skill. The public final pointer and actual cells fingerprint must also agree. Missing, ambiguous or stale matches show no link. This identifies a matching published artifact, not identical event histories: separate runs producing the same final artifact can link to the same public case. The current run's original evidence remains authoritative for its own operations.

Only configure an already checked public `site` directory. Public routes reject hidden files, path traversal and symlink escapes. They allow same-origin frames, hashed import maps and renderer styles; private evidence retains its stricter content policy. The mount does not expose raw run directories as static files, write data or upload evidence.

## Evidence behavior

`authoring-session.json` beside a spec joins operations to its run. A per-spec mapping avoids mixing different designs in the same directory. A successful build also writes a marker to its output directory, binding that build to its saved candidate and input file hashes. Validation of an older build remains bound to that build, even if its source spec has changed. Modified build files mark the binding as mismatched, never a passing result for the new map.

When a legacy verifier replaces an existing report, the adapter archives the old report first and clears its pathname. If no new report is produced, the recorded test is an error and the previous file is restored for the caller. The original helper's stdout and exit code are preserved. Exit code zero alone does not establish test success. Reports without input fingerprints carry the narrower command-boundary binding basis.

The agent's `read`, `note`, `exec`, `snapshot`, `artifact` and `finish` operations are routed through the same bridge. Notes describe goals, changes, reasons and expected checks. They are explicit author statements, not private internal reasoning. Resource delivery is evidence of access, not comprehension. Direct editor changes become snapshots at the next captured operation; unwrapped commands and direct imported helper calls are outside coverage. Interrupted tasks remain visibly running until finalized; no completion is invented.

The observer writes local evidence only. The website publisher separately audits a completed run, checks its final map/contract against the verified case and exports an allowlisted public process. Raw logs and source paths stay local. The audit checks internal consistency, not cryptographic authenticity against a malicious rewriter.

## Checks

```text
node scripts/test-authoring-integration.cjs
node scripts/test-authoring-process.cjs
node tools/authoring-observatory/audit-run.cjs --run RUN_DIRECTORY --out NEW_REPORT.json
```

The local server accepts GET only, checks loopback Host headers, and prevents traversal and symlink escapes. It serves its viewer, configured run APIs and optional checked public site. It has no write, command-execution or upload API.

## Passive usage and duration collection

All eight mechanism skills keep the caller's current model and client. The normal observer `start` binds the current session; reads, builds, tests and `finish` refresh runtime usage. Nothing launches a model, chooses a model, changes authentication or delegates the maze. The legacy `run` command is now an alias for starting a passive record; its caller must continue authoring.

| Runtime | Automatic binding and source | Limits |
| --- | --- | --- |
| Codex CLI / Desktop | Current session ID and matching rollout usage counters / turn model metadata | Ambiguous active segments, resets and missing metadata remain partial or unavailable. |
| Claude Code CLI / its compatible clients | PreToolUse hook supplies transcript identity; process ancestry binds the exact client; assistant message usage is deduplicated | A client must run the hook and expose its transcript. Subagents are excluded. |
| Gemini CLI / its compatible clients | BeforeTool hook supplies transcript identity; JSON and JSONL message/token records | Missing fields, unknown schema and inaccessible transcripts stay unavailable. |
| Other CLI, SDK or desktop client | Optional normalized usage JSONL adapter, bound by session ID | Closed clients without usage export cannot supply real token counts. Wall time still records. |

Install the runtime and skill bridge with `scripts/install-authoring-observer.cjs`. Merge the two client hooks once with `node scripts/install-usage-hooks.cjs --runtime RUNTIME_DIRECTORY --backup NEW_BACKUP_DIRECTORY`. This preserves model settings, permissions and unrelated hooks. Add `--skills-source EXISTING_SKILLS_DIRECTORY` to expose the same installed skill packages in Claude Code and Gemini CLI through directory links; existing packages are preserved. Existing clients may need a restart to load changed hook settings. Skill use then requires no extra command from the user. Client-global settings and paths are kept outside distributed skills.

An SDK or another client can export newline-terminated records with `type: "usage"`, `sessionId`, stable `requestId`, runtime-reported `model` and `provider`, `timestamp`, and `usage` containing actual `input_tokens`, `output_tokens` and optional cache/reasoning/total fields. Set `MAZEBENCH_USAGE_LOG`, `MAZEBENCH_SESSION_ID`, and `MAZEBENCH_USAGE_RUNTIME=usage-jsonl` in that integration. Repeated request snapshots replace rather than add. This adapter is an integration contract, not a claim to intercept every proprietary app. No token estimates are accepted.

`token-usage.json` and `token-usage.md` record per-model observed usage and wall time. Start establishes a baseline; finish seals the observed interval. Earlier history, other agents, delayed usage and the in-flight final response are excluded, so `scopeComplete` remains false and complete-task `tokens` stay null. `observedTokens` contains actual reported increments. Missing fields stay null, even when some other metrics exist. Interrupted records stay collecting until explicitly finished. Wall time includes tools and waiting; model inference time is not inferred.

Codex cached input and reasoning output are subsets. Claude total input includes uncached input plus cache reads and cache creation exactly once. Gemini output includes candidate and thought tokens when both are provided, while its provider total may also include tool tokens. Runtime totals are not invoices or subscription quota estimates. Historical records are not backfilled with invented counts.

Local records store only usage/model metadata and source fingerprints, not copied conversation content. The public exporter emits an allowlisted summary with per-model values and duration. Transcript paths, session IDs, prompts and raw responses remain private. The local and public viewers explicitly show unavailable fields. Usage failure does not invalidate unrelated maze evidence.

Protocol validation: `node --test tools/authoring-observatory/tests/session-usage.test.cjs tools/authoring-observatory/tests/token-usage.test.cjs scripts/test-token-usage-install.cjs`. Synthetic fixtures validate adapters, not live calls to other models. See the actual published construction for current-client verification.

Schema references: [Claude hooks](https://code.claude.com/docs/en/hooks), [Claude cache accounting](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [Gemini hooks](https://geminicli.com/docs/hooks/reference/), and [Gemini recording types](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/services/chatRecordingTypes.ts). Codex rollout parsing is grounded in the installed runtime's current session records; unknown future schemas fail closed.
