# MazeBench Block Coordination: mechanism logic

Coordinate several movable gate shields so every traverse leads to a usable next input. BxB hands off among independent blocks and reuses its final shield. BxC transports two groups together, separates them to pre-position a future shield, returns through clear ground, and uses the other block to reach the prepared contact. Keep joint movement, independent movement and safe release as conditional choices justified by downstream work.

Read this before new geometry. A read receipt checks version consistency, not understanding or necessity.

### prepare-next-shield

Roles: player, current or approach shield, next working shield, and the stances connecting them. Before committing a traverse, establish an executable next action. BxB inputs 12/19 reach already placed M1/M2 contacts; BxC inputs 35-44 place M0 at a future contact row and use M1 to reach its western side. The paired BxC branches from input 35 show the final R blocked without that placement and legal after ordinary placement/retreat/approach. Preserve actual same-elevation contact, usable arrival and subsequent work; vary coordinates, direction order and which tool is prepared. Evidence: full witnesses and a selected-state preparation control. No unique order or universal preparation count is established.

### independent-or-chain-motion

Roles: primary input group, any contacted secondary group, player and complete body footprints. Independent handoff is witnessed by every blue-moving BxB input. BxC inputs 15-23 and 31-32 instead move two distinct groups together: the player contacts the rear member and that member contacts the forward member in the input direction. Inputs 35 onward separate their work. Full ordinary event assertions verify both contact propagation and later single-group motion. Preserve actual directional member contacts and full-group clearance/support; do not infer a bond from color or adjacency. Joint transport is now a witnessed optional branch, not a family-wide invariant. The BxC exclusion against joint motion was capped and establishes no global necessity.

### retain-or-release-tools

Roles are assigned by the next useful operation. Retain a tool while its later shielding or approach role remains needed; release it when another reachable shield or clear-ground path takes over. BxB parks M0/M1 after handoffs, reuses M2 and leaves M3/M4 unused. BxC preserves both tools through common delivery, parks the prepared M0 during a useful return to M1, then releases M1 after it enables the M0 contact. Both routes leave their last shield and finish at a free doorway slot. Preserve operable placement and an actual full exit; vary which group changes role. BxB group-movement necessity remains scoped to its own exhausted checks. All corresponding BxC full-goal restrictions are unknown. More blocks, extra straight pushes or purposeless returns do not create a deeper mechanism.

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

BxB and BxC provide distinct complete official realizations of the same three relations. Case-specific necessity does not transfer between them. BxB never moves two groups together; BxC witnesses common transport followed by separate roles, with global exclusion results unknown. Read each complete case for coordinates and current evidence. No new authored realization was created or transfer-tested.
