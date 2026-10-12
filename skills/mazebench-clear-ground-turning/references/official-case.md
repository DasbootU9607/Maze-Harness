# ExB official case and mechanism analysis

Original room: **ExB**, indexed by `games/maze/world_map.json` as `games/maze/levels/z1ukmhp7er.txt`.
Engine commit: `0ac96b8a2648db09f375989cd7bc33699222c1e6`. Original map: [official-world-map.txt](official-world-map.txt).
Map-byte SHA256: `461d16d96f2a208caf5fdb9ef243a1e6e55ec594de0a532f2bfa273422ace55b`.

## Focus, objective and entry state

Use one blue movable block to cross a dense reactive-gate region, anticipate nearby ground without gates, and use those areas to change pushing sides several times.

The map contains its own player token. Use the full unchanged official room and its authored player, without spawn overrides or transferred actors. The complete analysis goal is passage access at (0,7,0); this is a genuine boundary doorway reached after the gate mechanism. It is not a world-transition or a gem goal. No gem is present. Axes: x increases right and y down; one cell is one unit; coordinates below include elevation. The default isSolved predicate cannot establish this goal.

## Complete initial state

The room is 16 by 16. Every actor and complete rigid member is listed below. All removal flags start false. Full parsed terrain/layers, authored metadata and the complete initial snapshot are preserved in the [design](official-design.json) and [states](official-states.json); the raw map preserves exact source bytes. Terrain top-type counts: {"wall":74,"player_gate":78,"floor":103,"empty":1}. No omitted peripheral region or group is removed to simplify the case.

| Actor | Type | Rigid group | Initial cell/elevation |
| --- | --- | --- | --- |
| 0 | floating_floor | - | (1,10,0) |
| 1 | weightless_box | M0 | (3,13,0) |
| 2 | player | - | (7,14,0) |

## Reference lineage and mechanism fit

This is an unmodified official case, not a derivative of another room. Adopted relations: `shielded-lane-advance`, `clear-ground-stance-transfer`, `connected-tool-reuse`. It witnesses a single-block realization with repeated clear-ground stance transfers.

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

Route origin: automatic-solver. The workflow pinned the source, bounded the automatic search at 300,000 states and 30,000 ms, and replayed the resulting route with ordinary move calls. [Solution](official-solution.json) retains the source/entry/runtime fingerprints. Route (52 inputs):

`LLLLULURRRRRDRUUUUUULURRRRRURDDDDRDLLLLLLLLLLUUULLLL`

Final player reaches (0,7,0) at elevation 0; ordinaryReplayPassed is true. All frame states and actual gate sets are retained, including the members not used by the route. Run the package reference verifier with a fresh output directory; it checks the pinned Git blob, runtime hash, current case receipt, entry-state fingerprint and full endpoint. This is actual ordinary replay, not an unvalidated solver path.

## Key causal events and structural functions

| After input | Direction | Changed function and downstream work | Complete evidence |
| --- | --- | --- | --- |
| 14 | R | Stage the single block at (8,12) and reach its southern input stance. | Step 14 before/after arrays in states; every actor and gate set retained |
| 20 | U | Arrive beside the first clear-ground island; direct R remains blocked. | Step 20 before/after arrays in states; every actor and gate set retained |
| 22 | U | Use L,U to obtain the western pushing stance. | Step 22 before/after arrays in states; every actor and gate set retained |
| 23 | R | Push R from the newly reachable stance. | Step 23 before/after arrays in states; every actor and gate set retained |
| 27 | R | Arrive beside the upper-right clear area. | Step 27 before/after arrays in states; every actor and gate set retained |
| 29 | R | Use U,R to obtain the northern pushing stance. | Step 29 before/after arrays in states; every actor and gate set retained |
| 33 | D | Arrive beside the lower-right clear area. | Step 33 before/after arrays in states; every actor and gate set retained |
| 35 | D | Use R,D to obtain the eastern pushing stance. | Step 35 before/after arrays in states; every actor and gate set retained |
| 45 | L | Deliver the player to the clear area near the left passage. | Step 45 before/after arrays in states; every actor and gate set retained |
| 52 | L | Leave the tool and reach the complete left doorway. | Step 52 before/after arrays in states; every actor and gate set retained |

The input member supplies same-elevation player contact; every other member remains part of full-body clearance/support. Gate cells provide the reactive obstacle. Ordinary clear-ground cells supply reachable preparation or release stances. The doorway is a full endpoint rather than a decorative opening. The floating floor at (1,10,0) remains unused in this witness; it is not a required helper. Upper gate regions are preserved in the full source but are not traversed by the accepted route. Their presence does not authorize inventing stages. A freeze-M0 restriction establishes tool movement necessity for this room-local endpoint; the exact island order and individual empty-cell necessity were not exhaustively tested.

## Counterfactual checks and limits

The positive control is the full ordinary replay above. The [checks](official-checks.json) include every selected-state direction probe and these exhaustive restrictions:

- Freeze M0: exhausted, 46 expanded ordinary states, cap 20000, time cap 10000 ms. Same real initial state and full endpoint; transition exclusion rejects any movement/removal of the named group.

Freeze results are scoped necessity claims about group movement for this map, authored entry, explicit endpoint, pinned engine and exact transition exclusion. They do not establish the precise route, every member's necessity or unique order. Selected-state probes quantify only over four next inputs at the recorded state. A timed-out or capped search remains unknown; no such outcome is promoted to necessity. Safe-ground departures in the positive route are controls against overgeneralizing shielding requirements outside the reactive field.

## Transferable relations and integration decision

### shielded-lane-advance

Player P, single block B and gate lane G are the roles. P must stand behind B at the same elevation with B=P+d, and B must have a legal destination. Pushing moves the block and player along the lane; B suppresses the current adjacent gate and reaches the next gate before the player approaches it. ExB steps 15-20, 23-27, 30-33 and 36-45 witness this operation. Freezing M0 exhausts 46 reachable states without reaching the left doorway, while the positive control completes. Preserve actual member occupancy, support and legal next push; vary lane length and direction. This proves movement necessity for this case and endpoint, not every future map.

### clear-ground-stance-transfer

The same block B, a future arrival pose A, clear-ground walking cells S and next input direction d2 are the roles. Advance B only as far as a pose whose surrounding S lets the player leave the old input stance and reach B-d2. At ExB after step 20 a direct R input is blocked; L,U walks on the nearby clear area and step 23 pushes R. The next transfers use U,R before D (steps 28-30), then R,D before L (steps 34-36). The consequence is a legal new pushing direction; the block does not rotate or pull the player. Preserve reachable stance transfer and the full subsequent action. Vary side, spacing and shape of safe ground. Selected-state probes verify these opportunities; no exclusion proves that each exact safe cell or turning order is globally necessary.

### connected-tool-reuse

One persistent block and multiple arrival/transfer opportunities form a route graph whose edges are executable pushes or safe walks. Choose a future stance before committing the preceding traverse, preserve the block for the next segment and terminate at an actual exit. ExB uses M0 through its entire U,R,D,L gate traversal and reaches the left doorway after a final safe departure (steps 46-52). Preserve tool identity, operable arrival and full endpoint; vary segment count according to requested scope. New maps must replay the connected sequence and check each proposed turning point, rather than counting unrelated bends or scattered empty cells. Evidence: one complete witness, not a unique-order theorem.

Integrate source-backed motion, witnessed stage connections and the stated selected-state/whole-case controls. Keep coordinates and route choices in regression evidence; new layouts must realize functions independently. No new authored maze was generated or transfer-tested in this work, as requested. Mechanism extraction is complete within the stated profile; independent new-map reliability remains untested.

## Structural difficulty observations

ExB is provisionally l2 Combination because one tool is reused through several dependent stance transfers; the available clear-ground islands determine which later pushes become executable. It is the only reference in this family, so no within-family harder/easier empirical comparison is available. Do not infer difficulty from its 52 input count. Mutable tier labels and grading basis live in the catalog and difficulty guide, rather than in the replay contract.
