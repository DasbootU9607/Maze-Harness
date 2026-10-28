# Build actions and source evidence

The process page derives `maze-build-actions/1` from the existing public process and recovery documents. It never rewrites observer events, client sessions, saved maps, reports, usage measurements or their hashes. `Evidence JSON` downloads the combined source projection; `Actions JSON` downloads the versioned interpretation, counts, links and coverage. The source download is public evidence, not an unrestricted dump of private client transcripts.

## Counting units

| Activity | Unit and evidence requirement |
| --- | --- |
| Read | One recorded file delivery. Unique paths are counted separately. A dependency snapshot or a client read request is not a confirmed delivery. |
| Design | An explicit public note. An identical recovered copy supports the existing note; it does not create a second decision. |
| Version | Every saved snapshot, including duplicates. Cell revisions, declaration changes and other saved-field changes are distinguished using recorded parent links and hashes. Unlinked snapshots do not imply a revision. |
| Solver search | A labeled search execution. Saved results without execution identities are separately labeled; they are not added to execution counts. |
| Diagnostic | A recorded probe or diagnostic execution, separate from formal acceptance. |
| Verification | One recorded verification run, with individual checks inside it. Failed and unknown outcomes remain visible. |
| Playtest | One browser attempt/report. Corrections within a named attempt remain with that attempt; individual inputs and screenshots are evidence inside it. An environment probe is a diagnostic. |
| Visual review | An explicit review record. A screenshot, a rendered frame or successful asset loading alone does not establish review. |
| Feedback, method, memory, transfer, decisions | Explicit source event types only. No reconstructed hypotheses, research rounds or unrecorded causal decisions. |
| Publication | A saved publication binding; this is not proof of when a deployment finished. |

Command start, completion and report records share an action only when saved IDs establish the connection. A client log call, a related map or a nearby timestamp does not establish that identity. Client tool calls remain searchable in the separate evidence series. Temporal or version context is labeled separately from exact action association. Zero classified actions means **not recorded under this evidence rule**, not that the agent never did the activity.

Historical cases and new publications use the same projection. This is a display/export normalization, not a collector migration. Future automatic capture needs explicit action IDs, file-delivery outcomes, input/output version hashes and review events to improve certainty. Older absent evidence cannot be recovered by classification.

## Maps and time

The Map versions view retains every source candidate ID and the existing official-engine preview/replay binding. All 45 valid snapshots across the current 18 process cases remain playable. One recovered DeepSeek hook-transfer draft is malformed and retains its unavailable-preview explanation; the original geometry is not repaired or invented by this view.

Usage remains the original observed interval and scope. Additional recovered events do not extend build wall time or add tokens. Events without timestamps keep null timestamps. The timeline follows saved ordering and recovery placement, not a claim of uninterrupted chronological execution. Stage durations and stage token usage are not inferred.

Run `node scripts/test-process-actions.cjs` to check source preservation, units, associations and all saved-version bindings. Add `--browser` with local Chrome and the engine's Playwright dependency to exercise every version selector, official move/undo, evidence navigation, downloads and responsive layout.
