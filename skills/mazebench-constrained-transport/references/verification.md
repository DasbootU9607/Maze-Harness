# Specification, scripts, and evidence limits

## Requirements

Use Node.js and a current MazeBenchEngine checkout, passed through `--repo`. Scripts use its official server parsing/save services, `maze-engine.js`, and `maze-solver.js`; the physics engine is not bundled. Author-side access to maps and solvers does not produce model-evaluation scores.

## Inputs for a new design

Supply the following JSON structure with actual authored data in place of the abbreviated cells. See `assets/gxf/spec.json` for runnable input. The agent chooses coordinates rather than requiring them from the user.

```json
{
  "title": "Your authored transport puzzle",
  "cells": [["Replace with actual 16-by-16 official tokens"]],
  "contract": {
    "profile": "planar-rigid-transport-v1",
    "roles": {"tool": "M0", "helpers": ["M1", "M2"], "target": "M3"},
    "delivery": {"toolCells": [[3,11],[4,11]], "playerCell": [4,10]},
    "use": {"direction": "D"},
    "intent": "Explain tool use, transport restrictions, and helper functions",
    "composition": {"preserve": "Describe required passages and pushing stances"}
  }
}
```

Documentation and reports use **zero-based `[x,y]` coordinates**, with `[0,0]` at the top left. The working pose above belongs only to the GxF example.

- `tool`, `target`, and `helpers` need distinct IDs from M0-M4, with 1-3 helpers. Declare every actual group. Helpers are groups **claimed to require movement before delivery**; do not declare optional decoration as necessary.
- `delivery.toolCells` is the complete expected tool footprint, preserving its initial shape by translation. `playerCell` is the final pushing stance, adjacent to the tool in `use.direction`.
- `use.direction` is U/D/L/R. It defines the claimed tool-use event, not the allowed directions in other stages.
- `intent` describes the mechanism. `composition` records input, occupancy, output, and preservation conditions. Natural-language conditions are not automatically proved by the checker.
- Accepted cells are `+`, `.`, `#`, `p`, `G`, M0-M4, and `.+#`, `.+p`, `.+G`, `.+M0`-`.+M4`. Scripts do not add floors beneath bare actors; official parsing/loading determines validity. Require an outer wall boundary, connected rigid shapes, one player and gem, and initial actors present at z=0.
- Multiple layers, movable slopes, gates, ice, hole filling, clones, and room transitions are unsupported. Rejection of unsupported inputs must not be interpreted as broader coverage.

## Build and reproduce

Run from the skill root, or use absolute script paths:

```text
node scripts/build.cjs --repo REPO --spec SPEC.json --out FRESH_OUTPUT
node scripts/verify.cjs --repo REPO --out FRESH_OUTPUT --cap 1000000
```

For explicit reproduction:

```text
node scripts/build.cjs --repo REPO --example gxf --out FRESH_EXAMPLE_OUTPUT
node scripts/verify.cjs --repo REPO --out FRESH_EXAMPLE_OUTPUT --cap 1000000
node scripts/check-runtime.cjs --repo REPO
```

`build` refuses an existing output directory, creates a unique `draft-transport-*` draft, and writes `manifest.json`, `world.json`, `contract.json`, and `level_AxA.txt`. Manifest play/edit paths are relative to the local server address. It does not start or publish a remote service. Draft assets use ordinary copies, including on Windows without symlink privileges.

`verify` checks that the actual draft's parsing rules, single-room configuration, and cells agree, then runs official A*, ordinary replay, and restricted searches. It writes `verification.json` and refuses to overwrite an existing report; use `--report verification-2.json` for another run. Deliver draft links and an explanation afterward.

## What the checker establishes

**Basic witness:** Collect the gem from the initial state. Compare all actors and terrain after every input using both search and ordinary moves. Groups remain intact and on the same level in the main witness; at least one helper independently repositions relative to the tool before delivery. Check whether initial poses permit tool use or gem collection after walking alone. Report push inputs, walking inputs, delivery, first target movement, and use events.

**Use event:** The input matches the declared direction; the player directly contacts the tool; both tool and target translate; before the input a tool member `C` and target member `T` satisfy `C+d=T` at the same elevation. No specific shape or coordinates are required. This validates the observed contact relationship, not uniqueness of the silhouette.

**Delivery witness:** The entire tool footprint matches `delivery.toolCells` and the player occupies `playerCell`. Delivery must precede the target's first movement, which must match the use event. If the found solution skips the declared delivery pose, that witness does not satisfy the contract. Revise the contract or search for another qualifying witness; this alone does not establish an unsolvable map.

**Full-goal necessity:** Separately freeze the tool, each declared helper, and the target, then search for the gem. Also forbid the defined use event and search for the gem. Any found counterexample is ordinarily replayed and recorded.

**Preparation necessity:** Search for the declared delivery state **or the gem**, separately freezing each helper. This asks whether delivery or a goal bypass is possible without moving that helper. Including the gem prevents overlooking another solution route. Freezing applies throughout this prefix search and does not establish a particular direction, placement, or unique order. Reports state the exact scope.

Restrictions reject only matching legal transitions and restore state with official undo. Counterexamples use ordinary engine replay. The checker does not enumerate every possible working pose or infer unmodeled historical events. For requirements such as A before B or repeated delivery, include phase state in the search state/key, or define an appropriate prefix endpoint explicitly.

## Additional checks for a planning claim

The default verifier does not measure planning depth. If claiming that an object must move away and return, separately exclude its translations in each opposing direction; classify exhaustion, a complete counterexample, or a cap. To claim a particular preparation before use, check the legal first-use boundary with that preparation excluded and include gem access as a bypass. Use a positive control. See [planning depth](planning-depth.md) for interpreting these tests.

`scripts/check-reconstruction.cjs --repo REPO --out FRESH_OUTPUT` implements those direction exclusions and first-contact controls for the fingerprinted GxF reference. Its `case.json` and report expose the exact restrictions. It is not an automatic validator for arbitrary new maps or historical ordering claims.

The normal use contract requires the player to push the tool directly. A helper-to-tool-to-target relay may be a different valid design; this checker cannot certify that mechanism by calling it direct input. Define the actual relay contact chain and an appropriate goal/event check if the design needs it. Do not distort a valid intended mechanism merely to satisfy an inapplicable profile.

## Interpret results

| Result | Meaning |
| --- | --- |
| `solved` | A solution exists; this is a counterexample when an exclusion was expected to prevent it |
| `unsolved` | The finite state graph was exhausted under this exact restriction |
| `capped` | State budget reached; unknown |
| `passed` | Witness and all declared checks pass within this profile |
| `failed` | A counterexample, a witness-contract mismatch, or an exhausted unsolvable base map; see the reported reason |
| `unknown` | No established counterexample, but at least one capped check or missing verified witness |

A pass covers only the defined acceptance scope. Freezing does not prove unique ordering; excluding use does not prove a minimal tool shape; solutions and input counts do not prove human insight or difficulty. Revalidate after composition or changes to walls and entry points.
