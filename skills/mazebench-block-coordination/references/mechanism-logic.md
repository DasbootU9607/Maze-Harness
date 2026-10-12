# MazeBench Block Coordination: mechanism logic

Coordinate movable gate shields by preserving a sequence of executable inputs. The useful result of a push includes the player's access to the next working side, the tool positions and the remaining duties of every retained tool. Gate suppression follows current same-elevation occupancy: pushing across a gate does not leave a permanently open trail. A previously traversed cell may block a later approach.

Read this before new geometry. A read receipt checks version consistency, not understanding or necessity.

## Common causal model

A reachable input uses a shield; its legal movement gives the player another usable contact or access to clear ground; the remaining tools preserve the next operation; the sequence ends at the complete doorway goal. This model is an authoring inference from the two complete witnesses. It does not prescribe every solution's route or prove a unique order.

Treat these as separate decisions, not two mutually exclusive case templates:

| Decision | Supported choices | Evidence |
| --- | --- | --- |
| How does the next tool become usable? | Reach an initially placed shield, or prepare its position and then create the approach. | BxB 12/19; BxC 35-44. |
| How are tools delivered? | Move one group at a time, or temporarily propagate a push through actual contact. | All BxB blue-moving inputs are individual; BxC 15-23 and 31-32 move a pair before separate roles. |
| What continues after this operation? | Hand off to another shield, reuse the same shield from another side, or leave it and walk to the goal. | BxB 13/20, 27-33 and 38-40; BxC 44 and 53-55. |

These choices describe functions that can be considered separately. Their arbitrary recombination has not been verified. See the [reference comparison](reference-library.md) for observed combinations and evidence limits.

### prepare-next-shield

Roles: player, current or approach shield, next working shield and connecting input stances. The next shield may be the same physical group with a changed pushing side. Before a planned handoff, identify the actual member and direction, establish a reachable player stance and check the full legal translation. Arrival is useful when this input enables subsequent work.

BxB inputs 12/19 reach initially placed M1/M2; its final M2 is later reused. BxC 35-44 prepares M0 and uses M1 to approach it. Paired ordinary branches from BxC step 35 match the player/M1 approach positions but leave M0 at different positions: the final R is blocked without useful placement and legal after placement, retreat and reapproach. This verifies that local preparation opportunity. It does not exclude different histories.

Preserve executable contact and continuation; vary geometry, orientation and the identity of the prepared tool. A new realization must replay its approach, actual next action and complete suffix. A claim that preparation is unavoidable additionally needs a compatible full-goal exclusion.

### independent-or-chain-motion

Roles: player, primary input group, contacted secondary groups and their complete footprints. For same-elevation unit pushes, the input member must occupy P+d; each propagated contact must connect an actual member to another at displacement d. Full-group clearance and support still govern the move. Same-ID membership, contact-driven co-motion and later temporal handoff are different relationships.

Every blue-moving BxB input moves exactly one group; only its specific role transitions are handoffs. BxC 15-23 and 31-32 move two distinct groups through directional contact, then 35-44 separates their work. A shared delivery is useful when its destination supports the later individual roles and reachable separation inputs. Adjacency or a common destination alone is insufficient.

Joint transport is an evidenced optional branch. The BxC exclusion against joint motion remains unknown. For new geometry, verify the full contacted bodies during delivery and their subsequent use; the two references' single-member groups do not establish reliability for larger shapes.

### retain-or-release-tools

Assign retention to a future operation, not to permanent proximity. Distinguish active use, parked-but-retained use and release from the current plan. A retained tool can remain stationary while another tool supplies access to it. A released tool is no longer moved by the verified remaining route; this does not prove every alternative route can ignore it.

BxB parks M0/M1 after handoffs, reuses M2 from changed input sides and leaves M3/M4 unused. BxC retains the prepared M0 while returning to M1, then releases M1 after it supplies the M0 input stance. Both leave their last shield and finish at a free doorway slot. The final tool's boundary arrival alone is not completion.

For each retained tool, name its later action and preserve the ordinary route to its input side. For each release, replay the remaining plan with that tool staying parked. Clear ground must connect specific stances or the exit. It is not automatically a recovery path merely because it is empty. Extra tools, repeated straight pushes and returns that change no useful access do not create additional causal stages.

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

BxB and BxC provide distinct complete official realizations of the same three relations. All blue groups in both rooms have one member and remain at the same elevation along the witnesses. Larger rigid shapes require fresh footprint checks; ice, slopes and other unobserved combinations need compatible observers. No all-tools-use rule, fixed stage count, mandatory retreat or exact direction order is inferred. BxB's exhausted group restrictions remain case-specific; BxC's full-goal exclusions remain unknown. Read each complete case for coordinates and evidence. No new authored realization was created or transfer-tested.
