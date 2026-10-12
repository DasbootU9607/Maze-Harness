# MazeBench Block Coordination: mechanism logic

A traverse with one movable shield delivers the player to a reachable input beside another shield. The next block continues the route in a new direction. Some tools can remain parked after their role is complete, while a later tool may need further transport and a change of pushing side before the exit is usable. The verified BxB route hands off among three independent blocks; it never moves two groups simultaneously.

Read this before choosing new geometry. A reading receipt establishes version consistency, not understanding or mechanism necessity.

### prepare-next-shield

Player P, current shield A, next shield B and its input stance are the roles. Before committing a gate traverse, locate a reachable action that continues after it. In BxB, moving M0 west delivers P to the north of M1 (step 12), and moving M1 south delivers P to the west of M2 (step 19). The next input changes direction by contacting that already available shield. Preserve actual same-elevation contact, complete legal translation and continuation to the goal; vary the positions, direction changes and number of handoffs. Full replay and selected-state probes witness these opportunities. Freezing M0, M1 or M2 independently exhausts the original full-goal search, but does not prove this precise move order is unique.

### independent-or-chain-motion

Keep rigid group identity, actual contact propagation and temporal handoff separate. BxB moves M0, M1 and M2 individually; every blue-moving input in the accepted witness moves exactly one group. Source functions collectWeightlessPushCluster and moveWeightlessCluster can propagate a push through actual member contact into another group. That is a source-supported optional authoring branch, not a BxB witnessed requirement or a verified new-map realization. Choose a chain only when actual contact and a useful later role justify it. A new chain realization must identify contacted members, verify full-group clearance and replay its own downstream use; adjacency, matching colors or declarations do not prove co-motion.

### retain-or-release-tools

A tool is retained when later work still needs its shielding/contact role, and released when another reachable shield or clear-ground path takes over. BxB leaves M0 and M1 parked after handoffs, but keeps M2 through eastbound delivery, safe-ground reapproach and a westbound push before the final doorway (steps 20-40). Preserve operative arrival, a reachable new input side and actual exit after release; vary safe-ground layout and which tool receives another role. The witness also leaves M3 and M4 unmoved, so the mere presence of more blocks creates no obligation to use all of them. Whole-case freeze checks establish M0/M1/M2 movement necessity only for this source, authored entry and full bottom-door objective.

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

Only BxB is a verified reference. M0/M1/M2 each must move under the scoped full-goal freeze checks (15/344/367 states exhausted). M3/M4 remain unchanged in the complete witness. No simultaneous movement occurs in that witness, and no exact-order necessity is claimed. BxC was excluded after bounded searches produced no verified route; none of its case-specific behavior is integrated. The prior private search and skip records remain available for later resumption. No new authored realization was created or tested. New designs need their own whole-goal replay and mechanism/bypass checks; reference proofs do not transfer automatically.
