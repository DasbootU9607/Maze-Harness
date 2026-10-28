# Saved experiment evidence recovery

This recovery covers the 12 measured experiments currently published: eight
ChatGPT 6 Astra builds, two DeepSeek builds and two Qwen builds. It does not
rerun any model or change a sealed observer run, acceptance verdict, usage
interval, model attribution or leaderboard total.

## What was recovered

The selected observer logs already represented all 415 of their recorded events.
That denominator did not include other sessions, external files or CLI tool
calls. The supplement adds 1,887 tool invocations from the exact client sessions
bound by the observer, 88 other saved evidence records, and the original
DeepSeek boundary construction session (35 events).

| Model | Existing evidence now visible |
| --- | --- |
| ChatGPT 6 Astra | Eight bound client tool histories; saved exploration and browser report details; publication repairs; recorded read requests, tool responses and round-trip times. |
| DeepSeek, boundary-stagger | Original three candidates and failed/unknown/passed tests; intermediate revalidation events; final browser video; original client history. The second and third candidates have the same geometry; the third fixes the route endpoint. |
| DeepSeek, hook-transfer | Earlier saved draft files, including an invalid draft that cannot be rendered; the token-normalization snapshot; original final browser video; client diagnostics and file-read requests. Filename order does not establish version ancestry. |
| Qwen, boundary-stagger | First browser attempt failed before input handlers were ready; second attempt had a broken gem counter and is explicitly superseded; third and fourth attempts retain their corrected reports. Client tool history includes SKILL.md read requests absent from the observer resource index. |
| Qwen, hook-transfer | Original 43-input browser video and observations, plus client history. Formal v001/v002 differ in direction notation, not geometry. The author's earlier geometry-revision claim remains an annotation because its corresponding map snapshot was not found. |

Every supplemental file has a SHA-256 fingerprint. Client entries also identify
the call and response record hashes. Raw tool arguments, output bodies, user
messages, provider configuration and reasoning records are not published. The
public record download includes the supplemental evidence, and the local viewer
uses the same static process page as GitHub Pages.

Existing scope distinctions remain: a file-read request is not an independently
verified delivery of every file mentioned by a compound command; a saved skill
snapshot is not a read; a successful command is not a passed gameplay test.

## What is still unavailable

- A complete map state after every edit. Files may have been overwritten before
  the observer saved a candidate. An edit command proves an edit was requested,
  but not a full recoverable map snapshot or a successful mechanism revision.
- Some individual file-read outcomes. The original observer records SKILL.md
  delivery in only two of these 12 runs. Client read requests are recoverable in
  all 12, but compound commands and generated scripts need narrower instrumentation
  before each referenced file can be treated as a verified read.
- A native video or complete actor-state frames for Qwen's boundary browser
  attempts. Saved player coordinates and actor-match booleans are displayed as
  reports. No newly simulated animation is presented as the original recording.
- Complete per-stage model time and token attribution. Existing totals describe
  their original measured interval. Recovered tool round-trip durations include
  transport and waiting; summing them is not model thinking time. Overlapping
  tools cannot be added as independent wall time.
- Actions outside the bound session or after an unflushed interruption, and
  intermediate in-memory states that were never persisted. These remain unknown.

This is recovery of observable production evidence, not a claim to capture the
model's private internal processing.

## Changes needed for automatic completeness

The remaining problem spans three layers; changing page layout alone cannot
solve it.

1. **Capture and client adapters.** Start before the first model turn. Bind every
   supported client to an experiment and session. Persist tool call/response IDs,
   timestamps, exit status and a sanitized operation type automatically. Record
   gaps explicitly when a client exposes no such interface. Keep private raw
   evidence locally, separate from the public projection.
2. **Artifact and usage instrumentation.** Save before/after hashes and immutable
   map snapshots at successful write/build boundaries. Record file-read results
   with resolved file identity and content hash. Give browser reports one replay
   schema containing build/cells/contract hashes, input sequence, observed frames,
   timestamps and optional video. Capture real provider usage per request where
   available; retain unknown fields otherwise. Use explicit stage spans for read,
   design, build, test, play and publication, with overlap-aware wall-time totals.
3. **Export and publication checks.** Export all sessions belonging to an
   experiment, including failed and superseded attempts. Compare source events,
   artifacts and client records against published coverage; flag missing bindings
   and sequence gaps. Keep recovery additions separate from original acceptance
   and usage, and check they survive refreshes and republishing.

This change implements recovery, public display and validation. It does not yet
replace the live collector with those new capture adapters. In particular,
`recover-experiment-history.cjs` is a reviewed recovery manifest for these 12
experiments, not a promise that arbitrary future client logs are automatically
discoverable.

## Maintenance

From the repository root, using local archive directories:

```powershell
node scripts/recover-experiment-history.cjs --experiments '<experiment runs>' --observer '<observer runs>' --engine '<MazeBenchEngine>'
node scripts/capture-site.cjs --engine '<MazeBenchEngine>' --missing
node scripts/test-process-recovery.cjs
node scripts/check-site.cjs
node scripts/test-process-recovery.cjs --browser
```

The recovery index is separate from the ordinary process exporter, so refreshing
a selected run cannot silently erase it. Fingerprint checks reject supplements
if the published final map or contract changes. Publication tests check the
supplement index, graph identities, source fingerprints, original outcome
retention and unchanged usage.
