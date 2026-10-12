# BxB official case and mechanism analysis

Original room: **BxB**, indexed by `games/maze/world_map.json` as `games/maze/levels/w3yrkloyft.txt`.
Engine commit: `0ac96b8a2648db09f375989cd7bc33699222c1e6`. Original map: [official-world-map.txt](official-world-map.txt).
Map-byte SHA256: `bd49d992a8d319fe9d8bdc704ec9bad10845e7e022c3d250965884f55c71fa90`.

## Focus, objective and entry state

Determine how several blue movable blocks cooperate to reach a doorway: which block must move next, whether actual contact propagates motion, and which tool must stay usable for later work.

The map contains its own player token. Use the full unchanged official room and its authored player, without spawn overrides or transferred actors. The complete analysis goal is passage access at (7,15,0); this is a genuine boundary doorway reached after the gate mechanism. It is not a world-transition or a gem goal. No gem is present. Axes: x increases right and y down; one cell is one unit; coordinates below include elevation. The default isSolved predicate cannot establish this goal.

## Complete initial state

The room is 16 by 16. Every actor and complete rigid member is listed below. All removal flags start false. Full parsed terrain/layers, authored metadata and the complete initial snapshot are preserved in the [design](official-design.json) and [states](official-states.json); the raw map preserves exact source bytes. Terrain top-type counts: {"wall":59,"player_gate":156,"floor":40,"empty":1}. No omitted peripheral region or group is removed to simplify the case.

| Actor | Type | Rigid group | Initial cell/elevation |
| --- | --- | --- | --- |
| 0 | weightless_box | M3 | (12,2,0) |
| 1 | weightless_box | M4 | (3,3,0) |
| 2 | weightless_box | M0 | (13,6,0) |
| 3 | weightless_box | M1 | (4,7,0) |
| 4 | player | - | (14,8,0) |
| 5 | weightless_box | M2 | (5,13,0) |

## Reference lineage and mechanism fit

This is an unmodified official case, not a derivative of another room. Adopted relations: `prepare-next-shield`, `independent-or-chain-motion`, `retain-or-release-tools`. It witnesses sequential independent shielding roles and later reuse of one retained tool. No simultaneous multi-group movement occurs in the accepted route.

## Motion rules and source evidence

| Condition | Official transition | Prohibited inference | Pinned source |
| --- | --- | --- | --- |
| A player is adjacent to a gate and no blocking non-player actor occupies it at the same elevation | The gate enters the raised set | Red gates are not permanent walls and do not require a global switch | public/maze-engine.js, computeRaisedPlayerGateSet |
| A blocking blue member occupies that gate at the player's elevation | The gate is suppressed; the player can push into the member's former cell if the whole move is legal | A nearby block in another cell does not shield it | computeRaisedPlayerGateSet and move |
| One member of an M group receives a push | Complete same-ID membership and contacted groups are considered for translation | Contact co-motion does not merge IDs; no pulling or free rotation | collectWeightlessPushCluster, moveWeightlessCluster |
| A member would enter blocked terrain, lose compatible support or hit a prohibited boundary | Official full-body tests govern the move | A free anchor path is not a clearance proof | canWeightlessMemberEnter, syncWeightlessGroupElevations and move |
| No gems exist in these rooms | Default gem completion does not establish passage access | Do not report success from isSolved alone | explicit reach observer in scripts/verify-reference.cjs |

All cited functions belong to public/maze-engine.js at the recorded commit. Tokens are defined by games/maze/level_parsing.json: g is player_gate, M0..M4 are rigid-group weightless boxes, p is the player, f is floating floor, # is wall, + alone is a hole, and . is floor. These cases contain no ice, slopes, clones or orange-wall mechanism. Unsupported combinations require a new observer and fresh evidence.

## Full ordinary replay

Route origin: reused-route. The workflow pinned the source and replayed the route with ordinary move calls. Automatic discovery used a 300,000-state/30,000-ms budget; a reused route is newly replayed against matching source, entry and goal rather than treated as a new search. [Solution](official-solution.json) retains the source/entry/runtime fingerprints. Route (40 inputs):

`UULLLLLLLLLLDDDDDDDRRRRRRRRURDRDLLLLLDLL`

Final player reaches (7,15,0) at elevation 0; ordinaryReplayPassed is true. All frame states and actual gate sets are retained, including the members not used by the route. Run the package reference verifier with a fresh output directory; it checks the pinned Git blob, runtime hash, current case receipt, entry-state fingerprint and full endpoint. This is actual ordinary replay, not an unvalidated solver path.

## Key causal events and structural functions

| After input | Direction | Changed function and downstream work | Complete evidence |
| --- | --- | --- | --- |
| 2 | U | Reach the eastern pushing stance of M0. | Step 2 before/after arrays in states; every actor and gate set retained |
| 12 | L | M0 delivers the player beside M1; D contacts M1 while U/R are blocked. | Step 12 before/after arrays in states; every actor and gate set retained |
| 19 | D | M1 delivers the player beside M2; R is the only legal next input in this state. | Step 19 before/after arrays in states; every actor and gate set retained |
| 27 | R | M2 arrives in a clear area that permits changing pushing sides. | Step 27 before/after arrays in states; every actor and gate set retained |
| 30 | D | Move M2 downward to prepare its westbound reuse. | Step 30 before/after arrays in states; every actor and gate set retained |
| 37 | L | The westbound push reaches a stance with access to the bottom corridor. | Step 37 before/after arrays in states; every actor and gate set retained |
| 40 | L | Leave M2 parked and reach the complete bottom doorway. | Step 40 before/after arrays in states; every actor and gate set retained |

The input member supplies same-elevation player contact; every other member remains part of full-body clearance/support. Gate cells provide the reactive obstacle. Ordinary clear-ground cells supply reachable preparation or release stances. The doorway is a full endpoint rather than a decorative opening. M0/M1/M2 each must move under the scoped full-goal freeze checks (15/344/367 states exhausted). M3/M4 remain unchanged in the complete witness. No simultaneous movement occurs in that witness, and no exact-order necessity is claimed. BxC supplies a separately verified co-transport realization; its behavior and limits are recorded in its own case.

## Counterfactual checks and limits

The positive control is the full ordinary replay above. The [checks](official-checks.json) include every selected-state direction probe and these exhaustive restrictions:

- Freeze M0: exhausted, 15 expanded ordinary states, cap 20000, time cap 10000 ms. Same real initial state and full endpoint; transition exclusion rejects any movement/removal of the named group.
- Freeze M1: exhausted, 344 expanded ordinary states, cap 20000, time cap 10000 ms. Same real initial state and full endpoint; transition exclusion rejects any movement/removal of the named group.
- Freeze M2: exhausted, 367 expanded ordinary states, cap 20000, time cap 10000 ms. Same real initial state and full endpoint; transition exclusion rejects any movement/removal of the named group.

Freeze results are scoped necessity claims about group movement for this map, authored entry, explicit endpoint, pinned engine and exact transition exclusion. They do not establish the precise route, every member's necessity or unique order. Selected-state probes quantify only over four next inputs at the recorded state. A timed-out or capped search remains unknown; no such outcome is promoted to necessity. Safe-ground departures in the positive route are controls against overgeneralizing shielding requirements outside the reactive field.

## Transferable relations and integration decision

### prepare-next-shield

Player P, current shield A, next shield B and its input stance are the roles. Before committing a gate traverse, locate a reachable action that continues after it. In BxB, moving M0 west delivers P to the north of M1 (step 12), and moving M1 south delivers P to the west of M2 (step 19). The next input changes direction by contacting that already available shield. Preserve actual same-elevation contact, complete legal translation and continuation to the goal; vary the positions, direction changes and number of handoffs. Full replay and selected-state probes witness these opportunities. Freezing M0, M1 or M2 independently exhausts the original full-goal search, but does not prove this precise move order is unique.

### independent-or-chain-motion

Keep rigid group identity, actual contact propagation and temporal handoff separate. BxB moves M0, M1 and M2 individually; every blue-moving input in the accepted witness moves exactly one group. Source functions collectWeightlessPushCluster and moveWeightlessCluster can propagate a push through actual member contact into another group. That is a source-supported optional authoring branch, not a BxB witnessed requirement or a verified new-map realization. Choose a chain only when actual contact and a useful later role justify it. A new chain realization must identify contacted members, verify full-group clearance and replay its own downstream use; adjacency, matching colors or declarations do not prove co-motion.

### retain-or-release-tools

A tool is retained when later work still needs its shielding/contact role, and released when another reachable shield or clear-ground path takes over. BxB leaves M0 and M1 parked after handoffs, but keeps M2 through eastbound delivery, safe-ground reapproach and a westbound push before the final doorway (steps 20-40). Preserve operative arrival, a reachable new input side and actual exit after release; vary safe-ground layout and which tool receives another role. The witness also leaves M3 and M4 unmoved, so the mere presence of more blocks creates no obligation to use all of them. Whole-case freeze checks establish M0/M1/M2 movement necessity only for this source, authored entry and full bottom-door objective.

Integrate source-backed motion, witnessed stage connections and the stated selected-state/whole-case controls. Keep coordinates and route choices in regression evidence; new layouts must realize functions independently. No new authored maze was generated or transfer-tested in this work, as requested. Mechanism extraction is complete within the stated profile; independent new-map reliability remains untested.

## Structural difficulty observations

BxB is provisionally l2 Combination because several shield handoffs connect to a later safe-ground change of pushing side for the retained final block. The catalog and difficulty guide compare the added BxC realization separately. Its 40 input count is not a human-difficulty measure. Mutable tier labels and grading basis live in the catalog and difficulty guide, rather than in the replay contract.
