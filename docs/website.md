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

The public process page gives most of the desktop width to a vertical timeline diagram, with a phone-width detail card on the right. The [editable Figma layout](https://www.figma.com/design/Vay83UrZFSUG02c8SxfHFB?node-id=2-2) defines the circular numbered nodes, short action cards, generous spacing, and neutral page palette. Color is limited to the diagram; the surrounding interface and detail card remain black, white, and gray. Full labels, explanations, tests, and source references appear after selecting an event.

Resource reads remain visible alongside versions, diagnostics, revisions and checks. Selecting a source shows the recorded access and any explicit design-note citations. A skill dependency snapshot is labelled as a snapshot, separately from a recorded read. Source rooms associated with a skill are indirect provenance unless an original-case read was actually recorded. Revision branches require recorded parent relationships; citation and test associations are not version branches. Rooflock has a single v001-to-v004 revision chain.

Every intermediate candidate can carry a playable 3D preview generated by the official MazeBench level parser. These are iteration artifacts, including unsuccessful or unverified versions; they are not additional verified case cards. The small player uses the same physics, models and controls as the main playground, and expansion preserves the current game instance. Preview data has its own bytes hash and source-cell binding, checked before publication and in static CI.

A recorded replay is offered only for the exact candidate with a saved, bound replay artifact. The exporter verifies its route and every saved actor frame through the ordinary engine before publication. A solver path alone does not become a historical play session. Versions without saved playback expose a playable 3D room instead. The Rooflock record has a 22-frame replay for v004; its first three versions have playable previews. Its skill and extracted-mechanism reads are recorded, while a direct read of the original HxH case is not.

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

Authored single-room trials start with their full gem objective. Reset and repeated saved-solution playback clear that trial's collected-gem state; the official multi-room world retains its persistent collection behavior. `scripts/test-planning-site.cjs --engine ENGINE` checks all six maps, including real input, undo, reset after completion, every solution control, touch input and deep-link reload. Add `--base-url URL` to check a deployed version.

`node scripts/test-authored-gates.cjs --repo ENGINE` checks directed gate walking, ordinary/search parity, floating-floor consumption, unsupported tokens and the complete enclosure regression. Gate analysis merges only mutually reachable walking states.

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
```

This checks desktop and mobile layouts, all registered skill pages, atlas navigation, a real block push and undo/reset, natural AxA-to-AxB traversal, the 20 rooms without a predefined player, deep-link refresh, all registered authored-route inputs against the engine, and solution playback. It blocks external network requests to verify all gameplay resources are bundled. Screenshots and reports stay in ignored `outputs/site-browser/`.

The separate process browser check exercises each iteration's keyboard and touch input, undo and reset, every saved replay frame, playback controls, source-to-note navigation, and expansion without losing progress. It also checks that unbound resource reads do not display a later map. Its screenshots and JSON report go to `outputs/process-browser/`, or a directory supplied with `--out`.

The lighter diagram check verifies direct-link selection and scrolling, plus revision fork routing with temporary browser fixtures. The published Rooflock data stays linear; only explicit revision parents can produce branch lines, while citation and test edges cannot. The full process check also measures the desktop column proportions, short labels, nonoverlapping nodes, and monochrome detail UI.

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
