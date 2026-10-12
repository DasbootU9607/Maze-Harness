# MazeBench Enclosure Navigation: mechanism logic

A rigid body places shielding members beside a player-sized cavity. The player pushes a contacted member, translating the entire group and the player together. The shielding member occupies a player gate before the player enters its former cell. Geometry determines which directions have such a contact; terrain still decides which of those directions are legal. Safe ground supports preparation, repositioning and final departure.

Read this before choosing new geometry. A reading receipt establishes version consistency, not understanding or mechanism necessity.

### usable-cavity-entry

Player P, rigid group T and a reachable cavity form the entry roles. Before gate traversal, reach a cavity stance and any staging pose using ordinary actions. In CxB steps 1-5 the player enters the open side; DxB steps 1-16 first translates and lowers the L-shaped tool from outside, then enters its corner. The consequence is executable contact in the intended travel direction, not merely a geometrically aligned shape. Preserve reachable entry and full-body clearance; vary the entry side, shape and amount of staging. New maps must replay preparation to an actual first protected push. Evidence: source rule and complete witnesses; the exact staging order is not necessary in every realization.

### protected-direction-set

The cavity player P and an adjacent same-elevation member I are the input roles. A protected direction d requires I=P+d and a legal translation of every member in the whole rigid body. Push I to move P and T together, preserving all P-relative member offsets for that step. This renews the gate shield for the next input. CxB after step 11 admits U, D and L while R is blocked; DxB after step 21 admits U and L while D and R are blocked. These are selected-state controls, not a permanent list of globally legal directions: DxB after step 23 also blocks U through another member collision. Preserve the functional contact sides, gate occupancy, complete support and clearance. A rectangle is one realization, not a universal silhouette requirement.

### goal-connected-release

The moving enclosure, an arrival area free of player gates, and the complete exit are the release roles. Reach clear ground with an open side and a walkable path around the parked body. CxB steps 32-37 park the group across some doorway cells, exit its open side and reach doorway cell (0,6,0); DxB steps 30-35 leave the L-shaped body and reach (0,7,0). Separation is safe here. Preserve an actually usable release path and goal; vary doorway width and parking pose. New maps must verify the entire endpoint after separation and cannot stop at a successful crossing of the red field. Evidence: full legal replay. Unprotected departure is blocked only when the intended next cell is an unshielded raised gate; it is not a universal trap on clear ground.

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

CxB also contains the independent M1 member, and DxB contains a floating floor. The complete verified routes do not move them; do not make them mandatory roles. Freezing M0 exhausts 35 states in CxB and 65 in DxB, establishing M0 movement necessity only for these entry states and doorway goals. The first CxB endpoint trial used (0,7,0), a slot occupied by the final parked body; its unsuccessful solver attempt is retained privately. The accepted endpoint is another genuine left-doorway cell, (0,6,0). No claim that every doorway cell is reachable is made. No new authored realization was created or tested. New designs need their own whole-goal replay and mechanism/bypass checks; reference proofs do not transfer automatically.
