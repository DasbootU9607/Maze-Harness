# Scoped verification

Use a separate MazeBenchEngine checkout with Node.js and installed dependencies. Scripts perform trusted author-side analysis, without evaluated agents.

Every analyzer edge is ordinary `engine.move`. Search keys include engine state and separate analyzer history. The official solver supplies a positive route with the complete gem-and-return goal and zero heuristic; replay both routes with survival, full rigid translation and z=0 checks.

The one-room profile marks unsupported boundary crossings as falls, matching local Play. Reaching the doorway completes the contract, leaving the board does not. Engine `isSolved` only checks gems and cannot establish returning to the doorway.

Frozen stopping search rejects group movement and retains directionality and gem state. Only end-of-input positions are stops. `crossBrake` requires a multi-cell player slide, no group motion and a member immediately beyond the final player cell in the input direction. Inspect travel records for transit.

| Claim | Evidence |
| --- | --- |
| Full completion | Ordinary replay collects gem and ends at doorway |
| Cross movement necessary | Reject group-motion transitions and exhaust full-goal search |
| Static braking necessary | Reject qualifying brake transitions and exhaust |
| Preparation necessary | Positive first-opportunity prefix succeeds; identical prefix without preparation exhausts |
| Parking restoration necessary | Same prefix carries parking history; exclude subsequent restoration and exhaust |
| Specific arm function | Matched-state geometric intervention with scoped collision/access effects |
| Exit usable | Ordinary post-gem replay reaches declared doorway |

The checker implements completion, motion/brake necessity and declared dependencies. It records member poses, collision members, frozen stops, next-stance routes and replayed counterexamples. Shape interventions, Undo/Reset, visual clarity, actual Play and save/export need separate inspection when claimed.

Direction restrictions forbid group motion in that direction, not all player inputs. A necessary direction does not imply a unique order. `centerAfter` is a case-specific functional pose, not a universal coordinate requirement.

Only exhausted `unsolved` supports absence; capped, unsupported, interrupted or exceptional checks are unknown. A found event opportunity is not automatically a complete bypass. Preserve every returned route and replay it.

After building, compare `/api/build/worlds/ID/export` cells with the spec. Open Edit and Play, inspect ice/all arms, run the complete route including post-gem inputs and check the final doorway position. Preserve the source map and do not publish remotely as part of authoring.
