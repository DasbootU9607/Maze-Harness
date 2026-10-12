# BxC official case and mechanism analysis

Original room: **BxC**, indexed by `games/maze/world_map.json` as `games/maze/levels/l03iufzqh7.txt`.
Engine commit: `0ac96b8a2648db09f375989cd7bc33699222c1e6`. Original map: [official-bxc-world-map.txt](official-bxc-world-map.txt).
Map-byte SHA256: `fb514dd9d4265fabe14a15f8a081d07577915d0633f7c38e7baaa1b3100d1a06`.

## Human-directed focus and entry context

The supplied focus asks how two or more movable blocks cooperate to reach an exit, when to move them separately or together, and whether to retain a block for later use. The witnessed interpretation is common transport followed by separation, placement of a future shield, a return through clear ground, and an approach built with the other block before the final handoff. Private work retains the original human brief separately from this interpretation.

Use the complete unchanged official room and its authored player token. No spawn override, transferred actor, omitted group or cropped region is used. This is an independent official reference, not a child map of BxB. Its stable family is official-bxc and its adopted relations are `prepare-next-shield`, `independent-or-chain-motion`, `retain-or-release-tools`.

## Full initial state and objective

The room is 16 by 16; x increases right, y down, and one cell is one unit. All actors start at elevation 0 and are not removed.

| Actor | Type | Rigid group | Initial cell |
| --- | --- | --- | --- |
| 0 | player | - | (8,1,0) |
| 1 | weightless_box | M0 | (3,3,0) |
| 2 | weightless_box | M1 | (5,3,0) |

Both blue groups contain exactly one member. The complete terrain has 53 top-type wall cells, 88 floor cells and 115 player gates. Full layers, decorations, metadata and state flags remain in the [design](official-bxc-design.json) and [states](official-bxc-states.json). There are no gems, clones, ice, slopes or orange devices. The upper clear area permits staging; lower clear ground permits approach changes and separate preparation; the dense gate field blocks unshielded entry.

The complete endpoint is the right doorway at (15,7,0). The original room has floor on boundary x=15 at y=6..9, and the official world index resolves its eastern neighbor to CxC, whose (0,7) is also floor. This is room-local doorway access; no actual world crossing is claimed. An earlier recorder selected only (15,8,0), which was narrower than the demonstrated doorway. The user's route reaches (15,7) and (15,6), so the corrected goal accepts a real door slot without changing the room or appending agent inputs. A gem-free default solved predicate is not used.

## Motion rules and source evidence

| Condition | Official transition | Prohibited inference | Pinned source |
| --- | --- | --- | --- |
| A player is adjacent to a gate and no blocking non-player actor occupies it at the same elevation | The gate enters the raised set | Red gates are not permanent walls and do not require a global switch | public/maze-engine.js, computeRaisedPlayerGateSet |
| A blocking blue member occupies that gate at the player's elevation | The gate is suppressed; the player can push into the member's former cell if the whole move is legal | A nearby block in another cell does not shield it | computeRaisedPlayerGateSet and move |
| One member of an M group receives a push | Complete same-ID membership and contacted groups are considered for translation | Contact co-motion does not merge IDs; no pulling or free rotation | collectWeightlessPushCluster, moveWeightlessCluster |
| A member would enter blocked terrain, lose compatible support or hit a prohibited boundary | Official full-body tests govern the move | A free anchor path is not a clearance proof | canWeightlessMemberEnter, syncWeightlessGroupElevations and move |
| No gems exist in these rooms | Default gem completion does not establish passage access | Do not report success from isSolved alone | explicit reach observer in scripts/verify-reference.cjs |

All cited functions belong to public/maze-engine.js at the recorded commit. Tokens are defined by games/maze/level_parsing.json: g is player_gate, M0..M4 are rigid-group weightless boxes, p is the player, f is floating floor, # is wall, + alone is a hole, and . is floor. These cases contain no ice, slopes, clones or orange-wall mechanism. Unsupported combinations require a new observer and fresh evidence.

## Full ordinary replay and recovered demonstration

The accepted [solution](official-bxc-solution.json) has origin `recovered-human-recording-prefix`. The immutable private original contains 226 events, including resets, undo and blocked moves. Every event's before/after state was reconstructed with the pinned ordinary engine. The prefix through event 214 reaches the right door; later resets remain in the original audit record and do not erase the earlier demonstrated completion. That prefix reduces to 194 directional inputs after reset/undo processing. Removing 139 blocked inputs gives the same-state 55-input witness below. No agent move was appended.

`LLLLLDDLDRRUURDDDDDDDDDRDDDDULUULURDRUUDLUURRRRRRRRRUUR`

All 55 actions replay successfully to player (15,7,0), with M0 (15,9,0) and M1 (5,8,0). Complete group identities, coordinates, elevations and gate sets are retained in the states artifact. The raw recording and its SHA256 stay in private work; the distributed solution contains the concise route and source/entry/runtime fingerprints. Earlier bounded solver timeouts remain historical unknown results, superseded for completion by this verified demonstration; they were never evidence of impossibility or human difficulty.

## Key causal events and structural functions

| After witness input | Direction | Changed function and remaining work |
| --- | --- | --- |
| 11 | R | Stage M0 at (5,4), immediately beyond M1 at (5,3); both remain independent rigid groups. |
| 14 | R | Reach (5,2), behind the two-block line. |
| 15 | D | Push M1 into M0 and translate both by D; actual contact forms the transport chain. |
| 23 | D | Deliver both blocks into lower working ground; the player reaches (5,11), M1 (5,12), M0 (5,13). |
| 31 | U | Approach from the opposite end and translate the pair U, with M0 now the primary input. |
| 32 | U | Leave M1 at (5,10), M0 at (5,11) and the player at (5,12), ready to separate their functions. |
| 35 | R | Move only M0 east to (6,11); M1 remains at (5,10). |
| 39 | U | Push M0 north twice to (6,9); player (6,10) still has a retreat to clear ground. |
| 41 | L | Return D,L through clear ground to (5,11), below M1; the placed M0 remains usable. |
| 43 | U | Push M1 north twice, delivering the player to (5,9), immediately west of M0 (6,9). |
| 44 | R | Hand off eastbound shielding to M0; M1 is released at (5,8). |
| 52 | R | Reach (14,9); M0 now occupies boundary cell (15,9), so direct R is blocked. |
| 55 | R | Walk U,U,R around the parked tool to the actual free doorway slot (15,7). |

The contact line transports both independent tools into the same future workspace. Reversing the input end during staging does not merge their IDs. Separating M0 prepares a horizontal working shield at a future row, while M1 preserves the means to bring the player to its western input stance. The retreat through lower clear ground is useful because it reconnects the player to M1 after M0 is placed. The final empty-door approach prevents the parked M0 at (15,9) from blocking completion.

## Scoped controls and evidence strength

The [checks](official-bxc-checks.json) distinguish complete replay, actual-contact event assertions, reachable branch probes and restricted search.

- Joint-motion assertions at inputs 15, 23 and 31 verify player contact with the primary member, the directional M1-to-M0 or M0-to-M1 contact, and the same unit displacement of both whole groups. Inputs 35, 39, 42 and 44 verify the subsequent single-group roles. These prove witnessed co-motion and later separation, not a permanent bond.
- Fork from input 35: taking U,U,R directly moves M1 to (5,8) and the player to (5,9), but the final R is blocked because M0 remains (6,11), not at the needed (6,9) contact. This is a reachable ordinary branch, not an edited state.
- Positive counterpart from the same input-35 state: D,R,U,U,D,L,U,U,R first places M0 at (6,9), returns to clear ground, approaches with M1 and then successfully pushes M0 right. Immediately before that final R, player and M1 coordinates match the negative branch; the pre-positioned M0 changes the actual contact opportunity. This establishes that local preparation relationship for this paired branch, not every possible first-contact history.
- Freeze-M0, freeze-M1 and forbid-joint-motion searches each reached their 10,000 ms limit within a 20,000-state cap (freeze-group M0: 2178 expanded; freeze-group M1: 1722 expanded; forbid-joint-motion: 1714 expanded). All three are unknown. Forbid-joint-motion rejects an ordinary input exactly when it moves more than one blue rigid group. No global necessity of moving both groups, co-transport, this order or these exact cells is claimed from these capped checks.

The actual whole-goal witness is the positive completion control. BxB's complete independent-motion route is a cross-reference counterexample to making joint motion a family-wide requirement. No authored bypass fixture was generated. Limits are map-, entry-, endpoint-, engine- and restriction-specific.

## Transferable relations and integration

### prepare-next-shield

Unlike BxB's already positioned handoff shields, BxC makes the future working shield first: carry M0 into the workspace, place it at a row reachable through M1, and retain an ordinary retreat to M1's input stance. Roles are future shield M0, approach shield M1, player and the clear-ground connector. Inputs 35-44 and the paired branch controls witness preparation, executable approach and changed contact. Vary geometry and directions while checking the next actual action, not merely alignment.

### independent-or-chain-motion

The same two groups first move together because one receives the player's input and contacts the other in the input direction. They then move separately to create different functions. Inputs 15-23 and 31-32 witness co-transport; 35-44 witness separation and handoff. Preserve actual member contact and full-body motion. BxB remains an independent-motion realization. Joint motion is an evidenced optional family branch, with global necessity unresolved for BxC.

### retain-or-release-tools

Retain both tools through arrival in the lower workspace because each still has a role. Preserve M0's usable placement during the return to M1; after M1 delivers the player to the working side of M0, M1 can stay parked. Finally leave M0 when clear ground supplies an exit path. Inputs 23-55 witness these role changes. A new layout must justify retention through downstream work rather than requiring every block to remain together or to reach the doorway.

## Structural difficulty and remaining limits

BxC adds coupled delivery followed by separate preparation and a second-tool approach to a pre-positioned target. This demands planning the later input before relinquishing the first working stance. Compared with BxB's initially available handoff blocks, these preparations are deeper and share one working area. A provisional l3 Planning placement is used in the catalog, against BxB's l2 Combination. This is a structural estimate, not a playtest judgment; the recording, route length and solver timeouts do not establish human difficulty. Different block counts and doorway goals are comparison confounds.

The reference joins the existing three relations as an additional witnessed realization. No new maze was generated or transfer-tested, and the exact layout, route and stage count are not authoring invariants.
