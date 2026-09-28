# Recorded validation

Recorded on 2026-09-28 with Node 24.13.0 and the official MazeBench parser, engine, solver, and local UI. The source baseline is identified in [setup](../references/usage.md). The engine and official room files were not modified. These checks do not launch evaluated models or paid services.

| Check | Result | Evidence |
| --- | --- | --- |
| Full official HxH room | Solved and normally replayed: 56 inputs, 2,906 expansions | [Full trace](official-full.json) |
| Sealed official extraction | Passed; 16-input route; goal walking region opens at step 7 | [Verification](official-staircase/verification.json), [controls](official-staircase/controls.json) |
| Pocket Shutter | Passed; 17-input route; goal walking region opens at step 12 | [Verification](pocket-shutter/verification.json), [controls](pocket-shutter/controls.json) |
| Twin Tee Passage | Passed; 27-input route; goal walking region opens at step 21 | [Verification](twin-tee/verification.json), [controls](twin-tee/controls.json) |
| Play UI, every actor state | All 16, 17, and 27 actions matched official replay; each gem collected | [Official extraction](official-staircase/browser.json), [Pocket](pocket-shutter/browser.json), [Twin Tee](twin-tee/browser.json) |
| Editing and local navigation | All three loaded in editor; unchanged cells saved/exported; Build list and world map worked | Same browser records |
| Undo and Reset | First-push Undo and initial-state Reset passed for all three | Same browser records |
| Acceptance and input regressions | 15 checks passed, including unknown for ordinary blockers, unrelated wall evidence, and capped search | [Negative summary](negative.json) |
| Official engine regressions | `weightless-push.test.js`, `maze-solver.test.js`, and `maze-levels-author.test.js` passed | Run through `node tests/<name>` in the engine checkout |
| Skill package | Frontmatter validation passed; relative documentation links and English/privacy scan passed | Recheck when editing package files |

The [regression summary](regression.json) and full case reports are committed. The negative summary's individual evidence paths are relative to the output of `scripts/check-negative.cjs`; rerunning it produces the detailed negative fixtures locally. The summary intentionally does not bundle all malformed maps. See [commands](../references/usage.md).

All declared full-goal exclusions in the three delivered cases exhausted their restricted state spaces. Prefix preparation claims passed, with the intentionally recorded Twin Tee upper-east opportunity counterexample also reproduced. Capped searches in the negative regression are **unknown**, never evidence of impossibility. No optimality claim is made for the listed routes.

Two earlier verifier acceptance failures were found and fixed: independent blockers could satisfy offset and goal tests; then an unrelated wall probe could accompany an access dependency. Current checks require linked boundary evidence, and negative regressions preserve both failures as counterexamples. The resulting pass is scoped to declared contracts, not an automated theorem of interesting shape design.

No exhaustive deadlock classification, arbitrary three-dimensional generalization, multi-group construction, combined hook/stagger level, or independent end-user skill invocation was tested. Human insight and camera-comprehension effects remain design goals. Local shape and wall roles do not establish globally unique or minimal geometry.

## Selected states

The official example's [initial](official-staircase/step-00.jpg), [offset](official-staircase/step-01.jpg), and [open-route](official-staircase/step-07.jpg) screenshots reproduce the supplied images' local geometry in a sealed extraction.

Pocket Shutter: [enclosed start](pocket-shutter/step-00.jpg) and [southern route open](pocket-shutter/step-12.jpg).

Twin Tee: [start](twin-tee/step-00.jpg), [gem temporarily covered and stance exposed](twin-tee/step-14.jpg), and [gem uncovered](twin-tee/step-21.jpg). A hidden gem in the middle state is a normal occlusion by the moved object; its initial location is visible, and the eventual return uncovers it.

Screenshots use the official renderer. Ordinary replay inputs use map coordinates, without actor edits or teleports. Generated draft IDs and machine-specific paths are intentionally absent from published evidence; fresh IDs and local links are recorded by each build's manifest.
