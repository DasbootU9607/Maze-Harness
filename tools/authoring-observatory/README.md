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

The local server accepts GET only, checks loopback Host headers, prevents traversal and symlink escapes, and serves only its configured run directory. It has no write, command-execution or upload API.
