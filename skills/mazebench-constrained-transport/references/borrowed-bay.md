# Borrowed Bay: The Returning Keeper

This new authored room came from one independent authoring trial using all three revised MazeBench skills on 2026-09-30. The author chose a five-cell elbow tool, a seven-cell helper with a side ear, and a vertical four-cell target. Four earlier candidates exposed a walking bypass, a helper that replaced the tool, an inaccessible pushing face, and unnecessary recovery. The fifth candidate passed. This is evidence of practical use and iterative correction, not a controlled estimate of the skills' improvement or calibrated human difficulty.

![Initial room](../assets/borrowed-bay/initial.jpg)

## Build and inspect

Use [spec.json](../assets/borrowed-bay/spec.json) with the existing builder, or import [world.json](../assets/borrowed-bay/world.json) through official Build. The external engine supplies runtime and assets.

```text
node scripts/build.cjs --repo ENGINE --spec assets/borrowed-bay/spec.json --out NEW_DRAFT_OUTPUT
node scripts/verify.cjs --repo ENGINE --out NEW_DRAFT_OUTPUT --cap 300000
node scripts/check-borrowed-bay.cjs --repo ENGINE --out NEW_AUDIT_OUTPUT --cap 300000
```

The first verifier checks the normal transport contract on the generated draft. The second audits this fingerprinted example directly, without creating or changing a draft. It replays the recorded route, runs 33 explicit exclusions or controls, and records walking regions, contact-part and wall interventions. It illustrates scoped composition checks; it is not a general validator for any three-group puzzle. A cap produces unknown, not a pass.

The [witness](../assets/borrowed-bay/witness.json), [verification baseline](../assets/borrowed-bay/verification-baseline.json), and [browser baseline](../assets/borrowed-bay/browser-baseline.json) retain the evidence. Expected search outcomes are explicit in [expected.json](../assets/borrowed-bay/expected.json), including successful bypasses. Recheck claims after editing the layout or changing the engine.

## Connected stages

Coordinates are zero-based `(x,y)` at z=0. M0 is the elbow, M1 the helper, and M3 the target. The gem is at `(11,9)`. The official verifier witness has 81 inputs, 23 pushes, 58 walks, and seven compressed push runs. These describe one solution, not its optimality or minimum decisions.

| Input | Functional change in this witness |
| --- | --- |
| 6 | Elbow retreats left, releasing the helper ear's swept area |
| 17-22 | Helper parks south in the shared bay |
| 29-34 | Elbow advances east; player reaches the usable delivery stance |
| 35 | A right input transmits lateral contact across the void to the target |
| 43-47 | Helper rises, restoring access to the lower withdrawal route |
| 57-60 | Player reaches `(9,9)` and raises the elbow, clearing its obstruction |
| 81 | After another approach change, player collects the gem |

At contact, P=`(7,8)`, I=`(8,8)`, C=`(10,6)`, T=`(11,6)`, and d=R. The useful contact is two rows above the player's input line. Target movement does not finish the room: the tool occupies the route and the parked helper restricts the stance needed to withdraw it. This changes the stage relationships as well as the shapes compared with GxF.

## What is necessary, and what is a choice

- Freezing any of M0, M1, or M3 prevents the gem. Forbidding the defined tool-use contact also exhausts without a solution.
- Tool L, R, and U, and helper D and U, are separately necessary under full-goal exclusions. This proves opposing motion, not an exact return pose or a unique order.
- A legal first-use opportunity requires initial tool-left and helper-down preparation. Helper-up can wait until later; a 34-input first-use opportunity exists without it.
- A progress endpoint requires the elbow's minimum x to exceed its initial value 3, or the gem. Without helper D that search exhausts. A right push that merely reverses the initial left retreat is not that progress.
- The two fixed notches `(7,5)` and `(8,5)` block the initial rightward cluster push. Removing them admits that push and a complete 77-input route with helper D forbidden, which fails on the original map. The wall change also changes possible walking access; global wall minimality is not established.
- Removing only the working tip `(10,6)` from a clone of the delivered state leaves the input operable but stops target movement. This is a local part-function control, not a legal player action or a proof of globally minimal shape.
- From the recorded step-35 state, walking alone cannot finish, and both helper and tool must still move. These continuation results cover that state, not every possible first-contact state.

Helper L is optional: a 93-input complete counterexample is retained. The witness raises the helper five cells after lowering it six; exact restoration is not required. Keep these qualifications when generalizing the design.

The browser run matched all 81 ordinary Play-handler states and checked first-push Undo/Reset, editor rendering, Build export, and the Build list. It did not enumerate every deadlock or assess human difficulty. A human review should examine whether temporary parking, later stance access, and the tool's post-use obstruction produce understandable planning decisions.
