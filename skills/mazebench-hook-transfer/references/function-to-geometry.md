# From function to geometry

The user supplies goals and necessary constraints. Unspecified shape, size, orientation, coordinates, object count, and solution are design responsibilities, not a questionnaire. Clarify missing external requirements only when they materially change the deliverable.

## Establish the relationship before placing cells

This is an authoring workflow, not a required player sequence.

1. **Choose an outcome.** Explain which passage, stance, or state becomes possible after the target moves: removal of a blocker, persistent support, or activation of a verified module. Start with what must change rather than selecting a named shape and inventing a purpose for it.
2. **Restrict direct force.** For every target member relevant to the move, identify the required player stance, destination, and elevation. Holes, static obstacles, connected regions, and clearance can create restrictions. A wall that also blocks the proposed tool tip is not a restriction that tip can solve. Check other target members, sideways repositioning, and alternate entrances.
3. **Place contact and input.** Choose direction d and player stance P. The input member is I=P+d; for target member T, the working member is C=T-d. Record actual feet/bottom elevations. P must be reachable; the player must legally push I; C's destination must contact T; every member of the resulting push cluster needs a legal destination.
4. **Connect I to C.** Treat them as required members of one rigid object. Route a connected cell path around the player, target, and obstacles. Leave an entrance or cavity for P, clearance for transport, and other supported members when C extends over air. Derive size and openings from these functions. Remove decoration that supplies no contact, connection, support, or bypass prevention, then recheck the result.
5. **Test the predocked core.** Use official `move` to record the directly pushed object, actual member contacts, each object's displacement, and the changed target function. Diagnose obstructions or elevations before adding transport distance. This prototype proves a local event, not completion of an active-docking task.
6. **Add preparation and stance changes.** Work backward from the useful pose to a plausible starting placement, then validate forward using ordinary pushes. Backward planning does not imply a pull action exists. Require separation, independent transport, changed relative position, and a recorded alignment action. With objects frozen after docking, the player must still reach P normally and trigger the event. If the initial arrangement only requires walking to P, redesign the start for an active task.
7. **Finish the room and search for bypasses.** Add entry, gem, boundaries, and an exit after use. Solve the complete objective. Delete declared event/preparation transitions for necessity checks, replay results, and use appropriate part controls. When a bypass appears, explain how it defeats the functional restriction and repair that cause. Do not add unrelated complexity to make a familiar mechanism look novel.

## Choose geometry from relationships

If contact lies behind the player along the input direction, connecting I and C may require an open rear hook around the player and target. If contact is offset sideways from the input line, begin with a transverse connection and bend it where clearance, stance, or support requires. Neither is the default answer. Meet P/I/C/T, support, and clearance needs first. A decorative hook outline provides no functional evidence.

Consider height when the task's contact, stance, observation, or dependency requirements justify it. Mixed-height groups, multiple targets, and retrieval for reuse require their own checks; a mechanism name or a planar success is not enough.

## Minimal design record

Use a short note, not a new schema or framework. Relative coordinates are useful during design; record actual cells for delivery.

| Decision | Required reasoning |
|---|---|
| Target change | Before/after target state and the passage or objective it changes |
| Direct-operation restriction | Members, stances, directions, heights, and checks for alternate direct pushes |
| Force relationship | P, I, C, T, d; actual contact pairs; directly pushed group and intended effect |
| Geometry | Contact, connection, support, cavity, and full swept-clearance roles |
| Preparation | Separation, feasible transport, docking action, and stance route with frozen objects |
| Reuse | Which physics, relationship, and code interfaces are reused; reproduction, parameter variant, or new layout/structure |
| Validation | The five separate conclusions, search limits, controls, and untested dimensions |

A new layout may use an existing mechanism. A default builder run is reproduction; coordinate or size edits remain parameter variants. Use an existing constructor if it expresses the required relationship; otherwise write a new layout function using official interfaces. Only a structural-diversity task additionally requires changed necessary dependencies, object roles, or tool usage.

## Implement with official interfaces

Output official 16x16 `cells` and call `scripts/draft-io.cjs`:

```js
const {saveDraft} = require('/path/to/skill/scripts/draft-io.cjs');
saveDraft(engineRepo, freshOutput, {title, cells, scenario, contract});
```

The helper installs a fresh local draft and exports editor-state JSON and the room file through official services. Check `games/maze/level_parsing.json`, `toolbox.json`, and `docs/maze-level-format.md`. Read `public/maze-engine.js` and parsing services for missing rules, not to redo broad research.

Load the saved draft with `server/app`'s `getGame/getLevelState`; use `MazeEngine.createEngine` and `MazeSolver.solveWithAStar/findReachablePositions`. Reuse `contact-events.cjs` within its scope or add an appropriate observer. A fixed action string is evidence, not a general design capability.

Define events before selecting checks. Do not copy the lateral plate case's “target stationary before use,” “first event presses the button,” or optional “no rear event needed” conditions into rear, mixed, or other-outcome tasks.

## Diagnose actual failures

| Failure | Inspect and adjust |
|---|---|
| Input pushes but tip misses target | Direction, actual member coordinates and elevations; joint motion alone is insufficient |
| Whole push is blocked | Every destination, overhead clearance, and collisions in the target group; change the connecting path if needed |
| Tool loses support | Which members remain supported during motion; do not assume magical floating |
| Docking looks right but is unusable | Route from actual player location to P, cavity entry, and exit; no debug placement as proof |
| Core works but preparation fails | Entire transported footprint and alternate pushing stances; add functional workspace or change the start |
| Tool/preparation can be bypassed | Replay the counterexample, then repair the direct-operation restriction or objective route |
| Validator rejects a legal design | Check case-specific assumptions; adapt checks while retaining real-contact and functional-purpose evidence |

One successful construction establishes that instance, not all shapes or combinations. Report passed, failed, or unknown separately for the five conclusions and the composition interface.
