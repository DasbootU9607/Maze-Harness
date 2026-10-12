# MazeBench Clear Ground Turning: mechanism logic

One block shields only the gate it occupies. A player can follow it along a gate lane, but an unshielded sideways gate blocks a turn. Clear ground beside a future block position supplies a route around the block to a different input side. A successful design connects several such arrival poses and stance changes through the same reusable block, then gives the player a complete route out.

Read this before choosing new geometry. A reading receipt establishes version consistency, not understanding or mechanism necessity.

### shielded-lane-advance

Player P, single block B and gate lane G are the roles. P must stand behind B at the same elevation with B=P+d, and B must have a legal destination. Pushing moves the block and player along the lane; B suppresses the current adjacent gate and reaches the next gate before the player approaches it. ExB steps 15-20, 23-27, 30-33 and 36-45 witness this operation. Freezing M0 exhausts 46 reachable states without reaching the left doorway, while the positive control completes. Preserve actual member occupancy, support and legal next push; vary lane length and direction. This proves movement necessity for this case and endpoint, not every future map.

### clear-ground-stance-transfer

The same block B, a future arrival pose A, clear-ground walking cells S and next input direction d2 are the roles. Advance B only as far as a pose whose surrounding S lets the player leave the old input stance and reach B-d2. At ExB after step 20 a direct R input is blocked; L,U walks on the nearby clear area and step 23 pushes R. The next transfers use U,R before D (steps 28-30), then R,D before L (steps 34-36). The consequence is a legal new pushing direction; the block does not rotate or pull the player. Preserve reachable stance transfer and the full subsequent action. Vary side, spacing and shape of safe ground. Selected-state probes verify these opportunities; no exclusion proves that each exact safe cell or turning order is globally necessary.

### connected-tool-reuse

One persistent block and multiple arrival/transfer opportunities form a route graph whose edges are executable pushes or safe walks. Choose a future stance before committing the preceding traverse, preserve the block for the next segment and terminate at an actual exit. ExB uses M0 through its entire U,R,D,L gate traversal and reaches the left doorway after a final safe departure (steps 46-52). Preserve tool identity, operable arrival and full endpoint; vary segment count according to requested scope. New maps must replay the connected sequence and check each proposed turning point, rather than counting unrelated bends or scattered empty cells. Evidence: one complete witness, not a unique-order theorem.

## Source-backed motion

| Condition | Official transition | Prohibited inference | Pinned source |
| --- | --- | --- | --- |
| A player is adjacent to a gate and no blocking non-player actor occupies it at the same elevation | The gate enters the raised set | Red gates are not permanent walls and do not require a global switch | public/maze-engine.js, computeRaisedPlayerGateSet |
| A blocking blue member occupies that gate at the player's elevation | The gate is suppressed; the player can push into the member's former cell if the whole move is legal | A nearby block in another cell does not shield it | computeRaisedPlayerGateSet and move |
| One member of an M group receives a push | Complete same-ID membership and contacted groups are considered for translation | Contact co-motion does not merge IDs; no pulling or free rotation | collectWeightlessPushCluster, moveWeightlessCluster |
| A member would enter blocked terrain, lose compatible support or hit a prohibited boundary | Official full-body tests govern the move | A free anchor path is not a clearance proof | canWeightlessMemberEnter, syncWeightlessGroupElevations and move |
| No gems exist in these rooms | Default gem completion does not establish passage access | Do not report success from isSolved alone | explicit reach observer in scripts/verify-reference.cjs |

All cited functions belong to public/maze-engine.js at the recorded commit. Tokens are defined by games/maze/level_parsing.json: g is player_gate, M0..M4 are rigid-group weightless boxes, p is the player, f is floating floor, # is wall, + alone is a hole, and . is floor. These cases contain no ice, slopes, clones or orange-wall mechanism. Unsupported combinations require a new observer and fresh evidence.

## Scope

The floating floor at (1,10,0) remains unused in this witness; it is not a required helper. Upper gate regions are preserved in the full source but are not traversed by the accepted route. Their presence does not authorize inventing stages. A freeze-M0 restriction establishes tool movement necessity for this room-local endpoint; the exact island order and individual empty-cell necessity were not exhaustively tested. No new authored realization was created or tested. New designs need their own whole-goal replay and mechanism/bypass checks; reference proofs do not transfer automatically.
