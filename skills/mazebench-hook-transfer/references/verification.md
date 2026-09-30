# Construction and scoped verification

Use a separate MazeBenchEngine checkout with dependencies installed and writable local drafts. Run from this skill directory and pass the checkout explicitly as `--repo`.

## Authoring input

Supply JSON with `title`, complete 16-by-16 `cells`, and a `contract` describing roles, usable contact, intended task effect, and preserved access. `scenario` is an optional descriptive label. Use official tokens and parser semantics; the builder accepts authored geometry, not a template parameter list.

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_OUTPUT
```

The builder refuses an existing output directory, creates a new draft through official save services, and writes `manifest.json`, `world.json`, `contract.json`, `spec.json`, and `level_AxA.txt`. Append manifest routes to the local server origin. Assets are copied from the engine without requiring symlink privileges. Building alone does not certify a mechanism or solve.

## Contact observation

`scripts/contact-events.cjs` exports `inspector(engine, {toolGroup, targetGroup, eventKind})`. Roles must be distinct. It observes one player, direct same-elevation one-cell translations, and actual member contact:

| Event | Predicate |
| --- | --- |
| `rearTransfer` | Player directly pushes the tool, tool and target translate in the input direction, and a contacted target member lies behind the player along that direction |
| `sideTransfer` | The same direct propagation occurs with contact laterally offset from the player's input line |
| `coupled` | Direct contact propagation without a shape-purpose conclusion |

Rear and side predicates may overlap. Joint motion is not itself a useful hook function. `candidates` lists geometry, not reachable stances, support, or legal clearance. Confirm usable docking with frozen-object walking followed by an ordinary triggering move.

Mixed heights, sliding, clone input, falling actors, and indirect multi-object relays need a compatible observer. The official engine decides what is legal; observer coverage is a separate question.

## Built-in plate profile

`verify-contact.cjs` supports only `pattern: "active-side-reach"` and `eventKind: "sideTransfer"`. The room must have exactly two rigid groups, one player, and one gem. Declare:

| Contract field | Meaning |
| --- | --- |
| `toolGroup`, `targetGroup` | Actual distinct role IDs |
| `boxElevation` | Common group elevation maintained during replay |
| `direction` | Map direction U/D/L/R of the declared input |
| `destination` | Target plate cell `[x,y,z]` occupied after use |
| `actuationStand` | Reachable player cell `[x,y,z]` at usable docking |
| `directStand` | Direct target-pushing cell `[x,y,z]` whose inaccessibility is claimed |

Coordinates are zero-based. This profile requires no initial qualifying alignment, independent tool preparation, a stationary target before first contact, button activation by first use, and walking-only completion after that use. These are this checker's acceptance conditions, not universal design requirements.

```text
node scripts/verify-contact.cjs --repo ENGINE --out NEW_OUTPUT --cap 300000
```

For another outcome, use the official engine and the observer to implement a matching scoped checker. Do not change a valid design's explanation to fit unrelated plate conditions. `--contrast-no-rear` is an optional comparison, not a rule prohibiting rear or mixed contact. A `--report NAME.json` option selects the report filename; use a new name to retain earlier reports.

## Five distinct conclusions

1. **Legal completion:** Replay the official solver's route through ordinary moves with survival, objective, shape, and elevation checks.
2. **Useful contact:** Record direction, input member, contact pair, full before/after poses, target effect, and resulting task access.
3. **Necessary contact:** Exclude the defined event transitions and search the unchanged full objective. Separately freezing tool or target provides additional evidence.
4. **Necessary preparation:** Test whether usable first contact or the goal is reachable without the declared independent preparation.
5. **Local part function:** Compare the same pre-contact state with a named part removed, disclosing changed input access, support, and clearance. This does not prove global shape uniqueness.

Replay successful counterexamples and revise the corresponding claim. Official support and contact checks must cover every affected group. Partial overhang can be legal, but arbitrary suspension cannot be assumed. Multiple orange buttons must all be pressed to open orange walls; terrain-changing operations require recording their effects.

## First-event prefix search

Do not add history flags unless cloning, snapshots, and search-state hashing preserve them. Instead, explore the subgraph before any first event: reject event transitions and the preparation transitions under test. The endpoint is the actual goal or a legal next event, tested by cloning state and trying ordinary moves with a zero heuristic.

Include a positive control with preparation allowed. Exhaustion without either endpoint supports absence under the restriction. Reaching an event opportunity does not establish a complete bypass; report the endpoint and check continuation. Docking-geometry restrictions must match the actual usable relationship.

## Interpret and deliver

Only completed `unsolved` or exhausted reachability supports absence of a route. Capped, interrupted, exceptional, and incomplete results are unknown. Reports preserve found routes, restrictions, engine identity, and scopes. Do not infer optimality, exact order, universal shape quality, or human difficulty.

Check actual error states and official Undo/Reset when making recovery claims. A successful route does not exclude other deadlocks. Browser Play/Edit/save/export and visual clarity require their own inspection; logic replay alone does not establish them.
