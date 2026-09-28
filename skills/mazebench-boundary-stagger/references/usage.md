# Construction and verification

Use a separate [MazeBenchEngine](https://github.com/mazebench/MazeBenchEngine) checkout with dependencies installed and local write access to `games/`. Tested with Node 24.13.0, engine baseline `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe`. No engine runtime or game assets need to be installed inside this skill.

Run commands from this skill's directory. Replace ENGINE with the checkout path, quote paths with spaces, and use fresh output directories.

```text
node scripts/build.cjs --repo ENGINE --out outputs/pocket --example pocket-shutter
node scripts/verify.cjs --repo ENGINE --out outputs/pocket --cap 300000
```

This reproduces a fixture. Available fixtures: `official-staircase`, `pocket-shutter`, `twin-tee`. The builder creates a fresh local draft through official serialization and exports `manifest.json`, `world.json`, `contract.json`, and `level_AxA.txt`. The manifest's play/edit/map routes work on the local server origin. Import `world.json` through official Build. Existing draft manifests refuse overwrite. Official assets are copied locally from the separate checkout; no remote requests or publication occur.

## Build a new design

Follow the skill's functional design process. Write a small layout function or a cells specification suited to the intended relationship; do not assume a fixture importer synthesizes new puzzles. The specification is a JSON object containing `title`, `cells` (a complete 16-by-16 token array), `contract`, and optional `scenario`.

```text
node scripts/build.cjs --repo ENGINE --out outputs/my-design --spec my-design.json
node scripts/verify.cjs --repo ENGINE --out outputs/my-design --cap 300000
```

Use ordinary floor `.`, wall `#` or `.+#`, one `p`, one `G`, and two distinct groups chosen from `M0` through `M4`. The prefixed actor forms `.+p`, `.+G`, and `.+M0` through `.+M4` are also supported. Repeat one ID across that rigid object's member cells; use another ID for the independent object. The checker intentionally excludes void, layered cells, other Toolbox mechanisms, additional groups, and multiple rooms. Review `docs/maze-level-format.md`, `games/maze/level_parsing.json`, and `games/maze/toolbox.json` in the engine for token placement rather than guessing from names.

Each contract has `profile: "planar-boundary-stagger"` and `pair: ["M0", "M1"]` with the actual IDs. Derive the following optional declarations from the design; fixture directions and shape names are not universal rules.

| Field | Definition |
| --- | --- |
| `directionChecks` | `{name, group, direction}` forbids any move translating that group in that map direction. Unique names must not replace base checks. |
| `preparationChecks` | `{name, before: {group,direction}, prepare: {group,direction}}` asks whether the gem or a legal first `before` motion can be reached without the named preparation. `expected: "solved"` records a known counterexample rather than a required dependency. |
| `wallProbes` | `{name, walls: [[x,y],...], prefix, action, primary, expectedGroups}` replays a prefix, then compares the same actor state with only named walls changed to floor. The original push must fail; the altered one must move the declared groups. Walking alone cannot pass. |
| `wallBypasses` | `{name, walls, forbid}` repeats a named direction exclusion on the original and altered maps. Requires original exhausted-unsolved and altered solved with replay. |
| `phases` | `{step,label}` marks important states along the found replay for explanation and optional screenshots. Recheck step labels if a changed engine finds another route. |
| `composition` | Preconditions, occupied region, object roles, postconditions, preserved access, side effects, and evidence. See [composition](composition.md). |
| `recoveryPaths` | Optional specific error routes. The control requires the resulting state to be exhausted-unsolved and one official Undo to restore a solvable state. Omit when this has not been established. |

The current acceptance profile needs a cross-group preparation dependency and a linked boundary control: the **same wall intervention** must both admit a blocked group push and permit a full-goal bypass when a required preparation for that dependent event is forbidden. The removed walls may also affect player access; review and disclose those effects. An unrelated wall probe is insufficient. If the design needs another evidence model, add an appropriate scoped checker instead of inventing a false contract to obtain a pass.

## What verification establishes

`verify.cjs` uses the official parser and solver, then replays every found route with ordinary `engine.move`. It checks rigid footprints, player/group elevation, directly pushed group, translations, directional face contacts, relative offset, and collected gem state. Listed face contacts are observations, not proof that every contact transmitted force during a particular action.

With boxes frozen, official reachability searches record the accessible cells before and after pushes. This separates visually empty holes from a usable connected route. The report identifies the first push in this replay that makes a walking-only gem approach available; it does not assert all solutions share that order.

Restricted searches delete specific official transitions; they never add new legal moves. Base checks forbid all pushes, each group's motion, or any relative-offset change. Prefix checks stop at a legal first declared directional opportunity or the gem, excluding the event's transitions; this avoids forgetting preparation history in the solver's state key. They include a positive control. Other directions of that group remain legal.

`controls.cjs` runs the declared wall and recovery comparisons. `verify.cjs` invokes it when linked boundary evidence is present. It can also be run separately for diagnosis:

```text
node scripts/controls.cjs --repo ENGINE --out outputs/my-design --cap 300000
```

`passed` means the declared checks succeeded, not a universal classification of interesting shapes. `failed` identifies a violated claim or failed complete solve. `unknown` includes missing mechanism evidence, capped searches, or incomplete reachability. Unsupported inputs throw instead of being certified. Successful bypass routes are replayed. An exhausted exclusion does not prove a unique shape, unique solution, or human reasoning ability. Do not call routes shortest without a separate optimality argument.

## Regression and UI

```text
node scripts/check-examples.cjs --repo ENGINE --out outputs/regression
node scripts/check-negative.cjs --repo ENGINE --out outputs/negative
```

The first creates three fresh drafts, verifies them, and solves/replays the unchanged full official HxH room. The second includes independent-blocker and unrelated-wall negative controls, malformed/unsupported input rejection, budget handling, and an official-extraction positive control. These are local game-quality tests, not benchmark model runs. Recorded results are in [evidence](../evidence/validation.md).

For an optional browser check, start the official server locally, install its development dependencies, and make Chrome available to Playwright. The script uses `playwright-core` from ENGINE; `--channel` can select another installed Chromium channel.

```text
node scripts/browser-check.cjs --repo ENGINE --out outputs/my-design --origin http://127.0.0.1:3001
```

It compares each normal Play-handler move with the recorded engine state, captures phase screenshots, exercises first-push Undo and Reset, renders the editor, saves identical cells, compares Build export, and checks the Build list/world map. It changes only the generated local draft's save metadata. It does not prove all errors are recoverable or that camera rotation is necessary. `U/D/L/R` in reports are map directions; after rotating the camera, distinguish those coordinates from screen directions and consult the official input mapping.
