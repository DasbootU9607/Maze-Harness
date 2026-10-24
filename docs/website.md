# Maze Harness website

The buildless website lives in `site/`. GitHub Actions validates it and publishes that directory to [GitHub Pages](https://dasbootu9607.github.io/Maze-Harness/). No backend, remote game server, CDN, or runtime package installation is required. All asset and navigation URLs work beneath the `/Maze-Harness/` project path.

## Automatic task completion

Publishing completed skills and verified playable examples is an authorized completion step in `AGENTS.md`, the case workflow and the mechanism skills. After the skill's own checks pass, run from this checkout:

```sh
node scripts/publish-site.cjs --engine PATH_TO_ENGINE --skill mazebench-mechanism
```

For every newly built playable example, supply the actual build and matching successful verification outputs:

```sh
node scripts/publish-site.cjs --engine PATH_TO_ENGINE --skill mazebench-mechanism --spec DESIGN.json --build BUILD_OUTPUT/manifest.json --verification CHECK_OUTPUT/verification.json
```

Do this in the same authoring task without requesting another website prompt. The publisher discovers all completed mechanism packages, matches their `official*-design.json` and original map files to the published 256-room world, refreshes official cases and highlighted rooms, adds the verified trial, captures missing real 3D thumbnails, validates packages and every saved route, commits and pushes `main`. Pages runs on skill changes as well as website changes. Check the `Deploy GitHub Pages` run for the resulting commit and affected public links before reporting completion. Find the commit's run with `gh run list --workflow pages.yml --commit COMMIT`, then use `gh run watch RUN_ID --exit-status`. A queued push is not a successful deployment.

The publisher preserves previous examples and stable links. Reimporting the same skill/map does not create another card. New static world IDs include the map hash, so editing a local draft cannot silently change an earlier published trial. The report must say `overall: passed` and `replayPassed: true`, with matching cell, contract and engine fingerprints. The actual saved map must also match the design, and the website engine replays the complete objective. Failed, unknown, stale, multi-room or unsupported trials stop before registration; they need a compatible verifier/exporter rather than fabricated evidence. Public provenance includes hashes and a concise verification summary, not local paths, full working reports or human workflow records.

An optional `references/website.json` in each skill supplies `verb`, `description`, `steps` and `exampleDescription`; a new skill without it uses the package title and description. Do not hardcode new skill IDs or counts in website scripts. A completed skill can appear before its first verified trial, with an explicit empty state. Once the trial is ready, use the second command to add it. The workflow utility itself is not a mechanism card. An official room may belong to multiple skills; the atlas links to its first listed skill and the reference list contains every association.

Git publication requires `main`, the expected repository remote and an up-to-date `origin/main`. It stages only `site/`, the named skill and `README.md`. Commit other intended task changes separately after their checks; preserve unrelated work. It never force-pushes or rewrites history. If a push or deployment fails, retain the prepared files, resolve the concrete failure and rerun; synchronization is idempotent. Honor an explicit local-only request with `--prepare-only`, which prepares and checks without Git network operations, commits or pushes.

For read-only drift detection, run `node scripts/sync-site.cjs --check`. For local catalog synchronization alone, run `node scripts/sync-site.cjs`. These do not capture thumbnails or push; use the publisher for task completion. Fresh checkouts need no engine to validate the committed static site.

## Public authoring processes

A recorded authoring run can accompany a verified playable trial:

```sh
node scripts/publish-site.cjs --engine ENGINE --skill mazebench-mechanism --spec DESIGN.json --build BUILD/manifest.json --verification CHECKS/verification.json --authoring-run RUN_DIRECTORY
```

Use `--prepare-only` for local preparation. The same `--authoring-run` argument works with `scripts/sync-site.cjs`. Without an explicit run, synchronization checks `authoring-session.json` beside the spec. Its version-1 record uses marker-relative `runDir` and `specPath`; an optional `sessions` object maps individual relative spec filenames to relative run directories. The matching `sessions` entry takes precedence. Otherwise `specPath` must resolve to this exact spec before the main `runDir` is used. A neighboring marker for a different spec does not attach a process.

The exporter runs the recorder's read-only evidence audit, requires a completed run and an exactly bound passed test, and compares both the final candidate's cells and contract fingerprints with the published spec. Stale, incomplete, altered or mismatched evidence stops the import before pending website changes are written. The saved process goes to `site/data/processes/CASE_ID.json`; the case catalog carries `process: {data, schemaVersion: 1}`. Older cases without recorded evidence retain their existing behavior and have no invented process link.

Only an allowlisted public projection is written: map snapshots and hashes, recomputed cell differences, recorded parent links, scoped test outcomes, concise agent annotations, and resource names plus hashes. Raw reports, resource contents, command arguments, stdout/stderr, local paths, personal identifiers, credentials and original human messages are excluded. Short permitted text fields are sanitized before an additional privacy scan. Failed diagnostic executions remain visible as diagnostic outcomes, separate from mechanism-test verdicts; an exit code is not treated as proof that a maze passed.

The graph links revisions, tests, explicit citations, annotations and scoped delivery evidence. Snapshot order does not prove causal reasoning. Inferred historical relationships are labelled, and unrecorded branches or merges are never reconstructed. Resource delivery does not establish comprehension or actual use; annotations are explanations, not internal thought transcripts.

The public process page gives most of the desktop width to an inline arc timeline, with a wider detail card on the right and room between its sections. The [editable Figma layout](https://www.figma.com/design/Vay83UrZFSUG02c8SxfHFB?node-id=2-2) defines the circular numbered nodes, short action cards, and neutral page palette. Each event kind has a consistent card tint, border, and node color; category labels identify the kind without relying on color. Color is limited to the diagram; the surrounding interface and detail card remain black, white, and gray. Action labels use 18 px type and detail paragraphs use 16 px type, including on phones, where category labels move inside the action cards. Full labels, explanations, tests, and source references appear after selecting an event.

The timeline initially shows key events: core source snapshots and their first recorded reads, the initial design note, saved candidates, selected formal test outcomes, recorded replays, and delivery. A saved dependency snapshot and an actual file read remain separate events; neither hides the other from the key-event controls. All records includes every original event in source order, including command starts and ends, run and collector lifecycle records, build saves, and artifact archives. The progress slider selects a position in the active filter; adjacent-event buttons, wheel, drag, touch and arrow keys also move the arc. Selecting an event updates the detail card immediately. Direct links and related-record navigation automatically switch to All records when the selected event is not a key event. Only nearby cards are rendered, while every record remains reachable. Publication binding is an additional derived node, not an original recorder event.

Each node carries its original event ID and type. The export and site checks verify one-to-one event coverage, contiguous source order, event-type counts, and a fingerprint of the original ID/sequence/type list. Unknown event types retain a neutral metadata node; their private payloads are not copied. Search and probe archives expose allowlisted observations and saved-file fingerprints. Command execution status is separate from a test verdict, with links between starts, completions and bound test results. These checks establish coverage of the saved log, not capture of unrecorded activity.

The right-hand detail card displays the original author notes, execution or test scope, saved observations, and recorded check payloads. Retrospective evidence-review prose does not replace those fields or add review-derived links. Tests retain their recorded verdict summaries and individual check details. The event browser test verifies these original fields across every current case.

The public data retains its derived explanation metadata and supporting evidence links for compatibility. Export and integrity checks continue to validate that metadata and unchanged per-check verdicts; short timeline diagnostic badges can still use it. This retained metadata is separate from the restored detail-card presentation.

To refresh all existing process cases after changing the projection, run `node scripts/refresh-authoring-processes.cjs --runs-dir ORIGINAL_RUNS_DIRECTORY`. It requires a unique matching complete candidate chain, audits every selected source, retains verified preview/replay assets, and updates process provenance only after all cases can be prepared. Add `--check` for read-only drift detection. Finish the normal site validation and publication workflow afterward.

Resource reads remain visible alongside versions, diagnostics, revisions and checks. Selecting a source shows the recorded access and any explicit design-note citations. A skill dependency snapshot is labelled as a snapshot, separately from a recorded read. Source rooms associated with a skill are indirect provenance unless an original-case read was actually recorded. Revision branches require recorded parent relationships; citation and test associations are not version branches. Rooflock has a single v001-to-v004 revision chain.

Every intermediate candidate can carry a playable 3D preview generated by the official MazeBench level parser. These are iteration artifacts, including unsuccessful or unverified versions; they are not additional verified case cards. Playable maps appear on candidate events. Resource reads, design notes, operations, test results, and delivery show their own evidence and related-record links instead of repeating the map. The small player uses the same physics and models as the main playground. Its initial view is aligned with the map axes; expansion restores that orientation while preserving the game or replay state. Preview data has its own bytes hash and source-cell binding, checked before publication and in static CI.

A recorded replay is offered only on the event for that exact saved, bound replay artifact. The player selects it by replay ID and verifies its candidate, source, and file fingerprints; missing or mismatched replay evidence cannot fall back to a playable map. Replay mode has playback, stepping, seeking, restart, and speed controls, while ordinary gameplay input is disabled. Candidate events have a separate play mode without replay controls, even if that version also has a recorded replay. The exporter verifies every replay input and saved actor frame through the ordinary engine before publication. A solver path alone does not become a historical play session. The Rooflock record has one 22-frame replay for v004, plus four playable candidate versions. Its browser-test records have no separately bound replay artifacts. Its skill and extracted-mechanism reads are recorded, while a direct read of the original HxH case is not.

To inspect a public projection without changing the website:

```sh
node scripts/export-authoring-process.cjs --run RUN_DIRECTORY --case CASE_ID --spec DESIGN.json --skill MECHANISM --out OUTPUT.json
node scripts/test-authoring-process.cjs
```

Pass `--run RUN_DIRECTORY --spec DESIGN.json` to the test command to include a real completed run. Add `--engine ENGINE --build BUILD/manifest.json --verification CHECKS/verification.json` to exercise verified trial synchronization in a disposable website copy. These tests never publish or modify the source run.

## Initial content

| Skill | Official rooms | Existing authored trial | Original local draft |
| --- | --- | --- | --- |
| Boundary Stagger | HxH | Shiftlock Vault | `draft-depth-972ac6fc10` |
| Hook Transfer | GxE, FxE | Offset Gallery | `draft-depth-bb5740533c` |
| Constrained Transport | GxF | Borrowed Aisle | `draft-depth-0c26344924` |
| Skating Cross | JxG | Glacier Turn | `draft-skating-52a89ba3c6` |

These are existing four-skill playtest maps, not newly generated examples. Official map bytes are checked against the references distributed with the skills. The full 256-room world matches the separate official local installation's source maps and game runtime. The website records the source engine commit `0ac96b8a2648db09f375989cd7bc33699222c1e6` and SHA256 fingerprints in `site/data/provenance.json`.

The source maps and exported level states are unmodified. Twenty official rooms contain no player token because they normally receive a player from a neighboring room. For a direct jump only, `room-entry.js` adds an arrival actor at an unoccupied, matching floor boundary with a verified legal inward move. The catalog records its adjacent source room. Normal doorway transitions still consume the original room JSON and use the engine's player-transfer logic. Reset restores the current entry state. Collected gems are stored per world in local browser storage, as in the original engine.

The initial nine examples had 738 saved inputs; subsequent reference additions are discovered from the skill packages. Current totals are reported by `check-site.cjs`. These are witnesses, not shortest-path or difficulty claims. Return objectives include the post-gem doorway, and gem-free cases use explicit passage endpoints.

An optional `official*-solution.json` can provide a verified longer objective while preserving the historical design contract. Synchronization checks its map identity and freshly replays it before publication. Original packaged Git LF and website CRLF maps keep separate hashes when needed; only full CRLF-to-LF equivalence is accepted. Ordered passage objectives track both visits in the same route and, when declared, verify a final walking return with all other actors frozen. Causal necessity remains within each skill verifier's documented scope.

## Planning batch and repeatable trials

The [six-map planning batch](../trials/planning-batch/README.md) keeps public design contracts and full solutions in `trials/planning-batch/`. Detailed working reports and build outputs remain in the local authoring outputs. Each map was registered through the publisher with its actual saved build and matching passed verification report.

The [five observed skill trials](../trials/observed-skill-batch/README.md) add a fresh room for Boundary Stagger, Hook Transfer, Constrained Transport, Skating Cross and Block Coordination. Their automatically discovered authoring sessions include actual skill/original-source reads, 14 saved versions, 26 test records and five complete browser playthroughs. Every room has two distinct geometries. Final checks pass while unsuccessful earlier tests remain visible. The local observatory can mount the same static site through its optional `publicSiteDir` configuration and automatically offer the matching inline arc process view for a completed run.

Multiple saved replays of one candidate have independent IDs and assets. Selecting a replay event loads that exact artifact; the first replay is retained only as a compatibility alias. An early nonpassing report without independent input fingerprints may remain in public history with an explicit command-boundary association and an unknown audit exception. It cannot support delivery: final acceptance still requires a passed test with both report fingerprints and captured command boundaries. Other audit gaps and integrity failures still block publication.

Process detail cards contain a static PNG of the selected version's initial state. They load no game iframe or input controls until Expand is selected. The modal embeds the pinned official MazeBench runtime, perspective camera, original theme, HUD and directional pads. It retains the official camera animation and fitting; the host does not override orientation or force an orthographic view. Closing pauses playback and preserves the same event's session; selecting another event disposes it. Map events allow play, while recorded-play events use their exact read-only replay.

Publication automatically captures every candidate screenshot through `scripts/capture-site.cjs`, including intermediate versions. Its sidecar receipt binds the PNG to the candidate cells, parsed level, renderer sources and image bytes. Image URLs include both the level and renderer fingerprints, including Three.js, models and textures, so an engine refresh cannot reuse an older browser-cached screenshot. These are derived publication images, not additional historical authoring events. Missing or stale screenshots are regenerated; the site validator rejects missing, altered or mismatched images. No hand-maintained screenshot registration is required.

Authored single-room trials start with their full gem objective. Reset and repeated saved-solution playback clear that trial's collected-gem state; the official multi-room world retains its persistent collection behavior. `scripts/test-planning-site.cjs --engine ENGINE` checks all six maps, including real input, undo, reset after completion, every solution control, touch input and deep-link reload. Add `--base-url URL` to check a deployed version.

`node scripts/test-authored-gates.cjs --repo ENGINE` checks directed gate walking, ordinary/search parity, floating-floor consumption, unsupported tokens and the complete enclosure regression. Gate analysis merges only mutually reachable walking states.

## Model categories and build comparison

Each skill's authored examples have a **Built with which model** selector. Publication and process refresh automatically project the public runtime evidence into each catalog entry's `build` summary. New runtime-reported model IDs become options without a frontend edit. The selected model is preserved in the page URL. Requested models, filenames and map titles are not attribution evidence: missing model names remain **Not provided**, and runs with multiple or partly unknown models have a separate **Mixed / partial attribution** category.

Recorded builds with identical map geometry retain separate case IDs and process records when their run identities differ. Repeating publication of the same recorded run remains idempotent. Only an opaque run fingerprint is published; private run names and paths stay local. Legacy cases are associated with a run only when their draft identity and recorded evidence match. Original maps without process evidence remain available, with an explicitly unavailable Build process action instead of an invented history.

The **Build ladder** panel plots individual recorded builds, with separate time/token tabs, a client filter and selectable total, input, output, cached-input or reasoning-output tokens. Each ladder is ordered by ascending measured resource use, with tied positions retained. Colored bars distinguish models/settings; model names and reasoning badges lead each row. Position describes resource use for that build, not model ability or puzzle quality. The expandable data table retains exact values and links to each build and process. Missing values are omitted from the ladders and counted, never replaced with zero. Cache and reasoning counts are subsets of their parent totals; they are not added twice. Different maps, clients and run conditions make these descriptive comparisons, not controlled model rankings. Observed tokens cover the captured interval and are not a complete billed task total; wall time includes tools and waiting.

Process pages use five consistent overview fields: model, reasoning setting, client, wall time and observed total tokens. Detailed token counts, runtime model/provider identities and collection scope are grouped in an expandable section. Both the overview and skill ladder offer CSV and JSON downloads. JSON retains explicit nulls, attribution sources, available start/end timestamps, original usage scope and raw public usage values. CSV uses empty fields for missing values and milliseconds for wall time. Start dates are displayed in UTC+8; exported timestamps retain UTC. Playable authored maps provide a Build process action in the player header. Existing timeline, replay and engine behavior is unchanged.

`site/data/build-attributions.json` contains explicit per-case supplemental evidence. The 16 historically unidentified authored cases were confirmed by the owner as ChatGPT 6 Astra at ultra; this confirmation supplies neither tokens nor elapsed time. Three existing measured cases retain their original usage, with reasoning settings and build timestamps read from their bound client sessions. Runtime evidence takes precedence over owner declarations. New cases have no blanket model default. Client-reported reasoning settings are collected automatically for future runs; absent settings stay unknown, and changes within a run remain mixed instead of being collapsed into one setting. These settings do not prove the provider applied a particular internal reasoning depth.

The measured wall interval and recorded command execution durations are different scopes. Existing local event logs contain timestamps and some command durations; they do not contain a complete, exclusive breakdown into reading, design, verification and play. Neither the ladder nor its downloads invent semantic phase durations from gaps between events.

`node scripts/test-build-models.cjs` checks attribution, mixed/missing values and run identity. `node scripts/test-site-sync.cjs` checks automatic discovery of a previously unseen model through publication. `node scripts/test-build-models-browser.cjs --engine PATH_TO_ENGINE` exercises every skill's filters, exact chart values, deep links, desktop/mobile layouts and player-to-process navigation. Add `--base-url URL` to check the deployed site.

To test duplicate publication using a completed, already-published Boundary Stagger trial, run `node scripts/test-build-model-publication.cjs --engine ENGINE --spec DESIGN.json --build BUILD/manifest.json --verification CHECKS/verification.json --authoring-run RUN_DIRECTORY`. It reimports the real evidence in a disposable site, then makes an explicitly synthetic copy with another run identity to test identical-map preservation and idempotence. It never edits the original run or publishes the fixture.

## Local preview

Run from the repository root:

```sh
node scripts/serve-site.cjs
```

Open `http://127.0.0.1:4173/Maze-Harness/`. Set `PORT` to choose a different port. The preview intentionally serves a project subpath so broken absolute URLs are caught locally. Opening HTML files through `file://` is not supported because the player fetches room JSON and ES modules.

## Validation

```sh
node scripts/check-site.cjs
node scripts/check-skills.cjs
```

The site check initializes every official room with the vendored engine, validates direct entries, replays every saved solution, checks discovered skill mappings and catalog drift, and validates assets, licenses, and source fingerprints. It runs on every website or skill push and pull request before deployment. `node scripts/test-site-sync.cjs` tests additional-skill discovery, shared reference rooms, preservation, route rejection and idempotence in disposable copies.

Browser integration checks require a separate engine checkout with `playwright-core` installed and Chrome available:

```sh
node scripts/test-site-browser.cjs --engine PATH_TO_ENGINE
node scripts/test-process-browser.cjs --engine PATH_TO_ENGINE
node scripts/test-process-diagram.cjs --engine PATH_TO_ENGINE
node scripts/test-process-event-browser.cjs --engine PATH_TO_ENGINE
```

This checks desktop and mobile layouts, all registered skill pages, atlas navigation, a real block push and undo/reset, natural AxA-to-AxB traversal, the 20 rooms without a predefined player, deep-link refresh, all registered authored-route inputs against the engine, and solution playback. It blocks external network requests to verify all gameplay resources are bundled. Screenshots and reports stay in ignored `outputs/site-browser/`.

The separate process browser check exercises screenshot-only cards, lazy player loading, each iteration's keyboard and touch input, undo and reset, every saved replay frame, playback controls, source-to-note navigation, and reopening without losing progress. It verifies separate play and read-only replay modes, rejected replay bindings, event-specific preview visibility, and the official perspective camera. Its screenshots and JSON report go to `outputs/process-browser/`, or a directory supplied with `--out`.

The lighter diagram check verifies deep links and related-record navigation with temporary browser fixtures. The arc follows recorded order; actual revision parents, citations and test associations remain separate evidence links in the detail card. The full process check also measures desktop column proportions, readable nonoverlapping cards, and monochrome detail UI.

The event browser check visits every process case, selects every recorded event with the progress control, verifies source-sequence coverage, and checks key/all filters, deep links and mobile access. Add `--base-url URL` to compare the deployed records with the locally audited exports.

The arc timeline is the primary view in the left column, directly alongside the selected operation. It has no expansion action or timeline modal. Its full-width progress slider provides direct position control with a current/total count. Colored key-event markers align with their positions in the active filter. Hovering or focusing a marker shows its event name; clicking or activating it selects that record and updates the arc, detail card and URL. Closely spaced markers use separate rows so each stays reachable without covering the slider. Points move along the arc while upright summary cards travel with them; their spacing accounts for card height and arc curvature, including in short windows. Key events and all records use the same classification and source order; the view stops at the first and last record instead of looping or inventing events. The right detail card and URL stay synchronized, including navigation back from the detail card. On phones, the detail card follows the arc and a Details action scrolls to it. Reduced-motion preferences disable animated interpolation. This view loads no maze player until the separate map preview is expanded. `node scripts/test-process-orbit.cjs --engine PATH_TO_ENGINE` exercises inline mounting, key-marker navigation, slider input, nonoverlapping arc geometry, linked selection and desktop/mobile interaction across all published process cases; `--base-url URL` checks a deployment.

## Refreshing the engine bundle

Routine skill and example additions use the publisher above. Refresh the complete engine bundle only when intentionally updating its pinned version:

```sh
node scripts/export-site.cjs --engine PATH_TO_ENGINE
node scripts/capture-site.cjs --engine PATH_TO_ENGINE
node scripts/check-site.cjs
node scripts/test-site-browser.cjs --engine PATH_TO_ENGINE
```

The exporter preserves registered skills and authored trials, copies original 3D assets and runtime, records precise source hashes, and makes guarded hosting adaptations: relative module and image URLs, JSON file URLs, query-based navigation, rectangular touch-button hit targets, and an opt-in opening flyover. It fails if upstream patch anchors change or official references differ. It never edits the engine checkout or source trials. The thumbnail script captures the actual 3D player. Keep `.gitattributes` so original map bytes and runtime hashes survive checkout on different platforms.

The white interface uses self-hosted Geist Sans, Mono, and Pixel fonts. Their license, the engine license, and the Three.js notices are included in `site/licenses/`. The original game palette is retained inside the 3D viewport. The design references are [agent-browser](https://agent-browser.dev/) and [skills.sh](https://skills.sh/).

## GitHub Pages

Repository Settings → Pages must use **GitHub Actions** as its source. `.github/workflows/pages.yml` validates the site, uploads `site/`, and deploys through `actions/deploy-pages`. A successful deployment is available at `https://dasbootu9607.github.io/Maze-Harness/`. No custom domain or server credentials are needed.
