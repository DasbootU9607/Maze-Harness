# DxB official case and mechanism analysis

Original room: **DxB**, indexed by `games/maze/world_map.json` as `games/maze/levels/gtiuoosv7v.txt`.
Engine commit: `0ac96b8a2648db09f375989cd7bc33699222c1e6`. Original map: [official-dxb-world-map.txt](official-dxb-world-map.txt).
Map-byte SHA256: `abb7f2a1247d5796d2c496d3cc3cc4caca72cbc0a98cd646391ce628b4e44ee4`.

## Focus, objective and entry state

Enclose the player on selected sides so pushing preserves a usable position inside the moving shape; use the contact-side set to reason about available travel directions in a reactive-gate field.

The map contains its own player token. Use the full unchanged official room and its authored player, without spawn overrides or transferred actors. The complete analysis goal is passage access at (0,7,0); this is a genuine boundary doorway reached after the gate mechanism. It is not a world-transition or a gem goal. No gem is present. Axes: x increases right and y down; one cell is one unit; coordinates below include elevation. The default isSolved predicate cannot establish this goal.

## Complete initial state

The room is 16 by 16. Every actor and complete rigid member is listed below. All removal flags start false. Full parsed terrain/layers, authored metadata and the complete initial snapshot are preserved in the [design](official-dxb-design.json) and [states](official-dxb-states.json); the raw map preserves exact source bytes. Terrain top-type counts: {"wall":82,"floor":125,"player_gate":44,"empty":5}. No omitted peripheral region or group is removed to simplify the case.

| Actor | Type | Rigid group | Initial cell/elevation |
| --- | --- | --- | --- |
| 0 | weightless_box | M0 | (12,3,0) |
| 1 | weightless_box | M0 | (13,3,0) |
| 2 | weightless_box | M0 | (12,4,0) |
| 3 | player | - | (13,7,0) |
| 4 | floating_floor | - | (9,12,0) |

## Reference lineage and mechanism fit

This is an unmodified official case, not a derivative of another room. Adopted relations: `usable-cavity-entry`, `protected-direction-set`, `goal-connected-release`. It corroborates the cavity mechanism through a two-direction L-shaped realization, with additional staging before entry.

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

Route origin: automatic-solver. The workflow pinned the source, bounded the automatic search at 300,000 states and 30,000 ms, and replayed the resulting route with ordinary move calls. [Solution](official-dxb-solution.json) retains the source/entry/runtime fingerprints. Route (35 inputs):

`UUULRUULDDDDRDDLLLLUULLLLUULLLDDDLL`

Final player reaches (0,7,0) at elevation 0; ordinaryReplayPassed is true. All frame states and actual gate sets are retained, including the members not used by the route. Run the package reference verifier with a fresh output directory; it checks the pinned Git blob, runtime hash, current case receipt, entry-state fingerprint and full endpoint. This is actual ordinary replay, not an unvalidated solver path.

## Key causal events and structural functions

| After input | Direction | Changed function and downstream work | Complete evidence |
| --- | --- | --- | --- |
| 4 | L | Begin outside staging by shifting the L-shaped body. | Step 4 before/after arrays in states; every actor and gate set retained |
| 12 | D | Reposition the entire body downward while the player is outside its cavity. | Step 12 before/after arrays in states; every actor and gate set retained |
| 16 | L | Enter the prepared cavity corner. | Step 16 before/after arrays in states; every actor and gate set retained |
| 21 | U | U/L are protected; D/R are unshielded gates. | Step 21 before/after arrays in states; every actor and gate set retained |
| 23 | L | An extra body/terrain collision blocks U despite its shielding member. | Step 23 before/after arrays in states; every actor and gate set retained |
| 30 | L | Reach ground where leaving the cavity is legal. | Step 30 before/after arrays in states; every actor and gate set retained |
| 35 | L | Reach the complete left-doorway objective. | Step 35 before/after arrays in states; every actor and gate set retained |

The input member supplies same-elevation player contact; every other member remains part of full-body clearance/support. Gate cells provide the reactive obstacle. Ordinary clear-ground cells supply reachable preparation or release stances. The doorway is a full endpoint rather than a decorative opening. CxB also contains the independent M1 member, and DxB contains a floating floor. The complete verified routes do not move them; do not make them mandatory roles. Freezing M0 exhausts 35 states in CxB and 65 in DxB, establishing M0 movement necessity only for these entry states and doorway goals. The first CxB endpoint trial used (0,7,0), a slot occupied by the final parked body; its unsuccessful solver attempt is retained privately. The accepted endpoint is another genuine left-doorway cell, (0,6,0). No claim that every doorway cell is reachable is made.

## Counterfactual checks and limits

The positive control is the full ordinary replay above. The [checks](official-dxb-checks.json) include every selected-state direction probe and these exhaustive restrictions:

- Freeze M0: exhausted, 65 expanded ordinary states, cap 20000, time cap 10000 ms. Same real initial state and full endpoint; transition exclusion rejects any movement/removal of the named group.

Freeze results are scoped necessity claims about group movement for this map, authored entry, explicit endpoint, pinned engine and exact transition exclusion. They do not establish the precise route, every member's necessity or unique order. Selected-state probes quantify only over four next inputs at the recorded state. A timed-out or capped search remains unknown; no such outcome is promoted to necessity. Safe-ground departures in the positive route are controls against overgeneralizing shielding requirements outside the reactive field.

## Transferable relations and integration decision

### usable-cavity-entry

Player P, rigid group T and a reachable cavity form the entry roles. Before gate traversal, reach a cavity stance and any staging pose using ordinary actions. In CxB steps 1-5 the player enters the open side; DxB steps 1-16 first translates and lowers the L-shaped tool from outside, then enters its corner. The consequence is executable contact in the intended travel direction, not merely a geometrically aligned shape. Preserve reachable entry and full-body clearance; vary the entry side, shape and amount of staging. New maps must replay preparation to an actual first protected push. Evidence: source rule and complete witnesses; the exact staging order is not necessary in every realization.

### protected-direction-set

The cavity player P and an adjacent same-elevation member I are the input roles. A protected direction d requires I=P+d and a legal translation of every member in the whole rigid body. Push I to move P and T together, preserving all P-relative member offsets for that step. This renews the gate shield for the next input. CxB after step 11 admits U, D and L while R is blocked; DxB after step 21 admits U and L while D and R are blocked. These are selected-state controls, not a permanent list of globally legal directions: DxB after step 23 also blocks U through another member collision. Preserve the functional contact sides, gate occupancy, complete support and clearance. A rectangle is one realization, not a universal silhouette requirement.

### goal-connected-release

The moving enclosure, an arrival area free of player gates, and the complete exit are the release roles. Reach clear ground with an open side and a walkable path around the parked body. CxB steps 32-37 park the group across some doorway cells, exit its open side and reach doorway cell (0,6,0); DxB steps 30-35 leave the L-shaped body and reach (0,7,0). Separation is safe here. Preserve an actually usable release path and goal; vary doorway width and parking pose. New maps must verify the entire endpoint after separation and cannot stop at a successful crossing of the red field. Evidence: full legal replay. Unprotected departure is blocked only when the intended next cell is an unshielded raised gate; it is not a universal trap on clear ground.

Integrate source-backed motion, witnessed stage connections and the stated selected-state/whole-case controls. Keep coordinates and route choices in regression evidence; new layouts must realize functions independently. No new authored maze was generated or transfer-tested in this work, as requested. Mechanism extraction is complete within the stated profile; independent new-map reliability remains untested.

## Structural difficulty observations

Both references are provisionally l2 Combination. CxB offers a third protected direction but has a larger complete footprint and an indirect release around the doorway. DxB has fewer protected directions, a smaller body and more outside-cavity setup. These dimensions trade off, so no higher/lower ordering is established between them. No player study was run. Mutable tier labels and grading basis live in the catalog and difficulty guide, rather than in the replay contract.
