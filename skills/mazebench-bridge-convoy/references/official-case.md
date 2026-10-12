# BxE case analysis

## Mechanism focus and interpretation

The requested relations are delayed allocation of consumable bridge floors, blue-block passage through rising red boundaries, and preserving both transported modules through a change of travel direction. This analysis interprets the small chambers as internal regions of BxE. Genuine world transitions transfer the player only; the package does not claim to export these tools to another world room.

## Source and complete initial state

Official world index games/maze/world_map.json resolves BxE to games/maze/levels/qha68yvol5.txt at commit 0ac96b8a2648db09f375989cd7bc33699222c1e6. Raw map SHA256 ade16fc76beffcd49c57ab4751cd660f60512f989c9c4e20d74afdd48258d132. Coordinates start at the upper left; x increases right, y down, elevation in cells. The authored player is (6,1,0). Actor 1 is the complete one-member M0 rigid group at (2,2,0). Actors 2 through 9 are independent floating floors at (6,2), (10,2), (13,2), (2,6), (6,6), (2,10), (2,13), (10,13), all elevation 0. There are no gems, clones, ice, slopes or initially removed actors. The complete 16 by 16 token matrix is [the original map](official-world-map.txt); the complete parsed initial state is levelData in [the regression design](official-design.json). The red g cells are player gates, not gems. Standalone + cells have empty/hole terrain. The complete source contains boundary walls, decorative shrubs, disconnected floor regions and gate strips. Nothing is cropped or removed.

## Complete objective

Reach the east doorway at (15,10,0) with a live player. CxE has matching floor on its west edge at y 9 through 11. No-gem isSolved is vacuous here and is not used. The reference demonstrates delivery and reuse inside BxE before this doorway endpoint. It does not certify world-room transfer or a next-room goal.

## Reference lineage and mechanism fit

BxE is an unmodified official map, not a user reconstruction. Its contribution is the base reference for the five relations recorded above. Coordinates, exact module count and its particular bridge choices are witness-specific. No other mechanism skill was used to choose these relations.

## Motion rules and source evidence

| Condition | Official transition | Prohibited inference | Pinned source and evidence |
| --- | --- | --- | --- |
| A floating floor enters a hole | It is removed and the hole becomes floor | It is not a reusable sliding bridge after placement | public/maze-engine.js applyHoleFalls, applyMoveFinalState; steps 2, 8, 14, 100, 104, 113 |
| A player is next to a gate | The gate rises unless a blocking nonplayer occupies it at gate elevation | Mere proximity of a blue block does not lower the gate | computeRaisedPlayerGateSet; steps 34-36 and 55-63 |
| Several pushable actors touch along input direction | attemptPushActor propagates a legal push through the actual actors; complete group clearance applies | Co-motion does not merge distinct actors or enable free rigid rotation | attemptPushActor, moveWeightlessCluster, weightlessClusterStep; steps 82-89 and 100 |
| Travel direction changes | Player stances and separate actor pushes must be rebuilt on supported cells | A turned camera is not rotation of a convoy | steps 90-100 |
| A weightless actor loses support during a push | Group movement and settling rules still apply | The word weightless is not a general hole-safety guarantee | weightlessClusterStep / moveWeightlessCluster; selected-state swapped-order control |
| A true world edge is crossed | The world transition creates a transferred player; it does not copy local tool actors | Internal delivery is not delivery into another world room | public/play-world-transitions.js resolveAdjacentLevelTransfer |

## Full ordinary replay

The default bounded search timed out at 30000 milliseconds with a 300000-state cap; this is not evidence of unsolvability. A browser-recorded effective route was accepted after ordinary engine replay. The private detailed recording is not distributed. [The solution](official-solution.json) preserves the exact route and source fingerprints; [the checks](official-checks.json) and [states](official-states.json) record a fresh independent replay and selected controls. The exact route, including blocked attempts, is:

    DDDDRDLLLLDLUUUULUURDDDDLDRRRRURDDDDRDLLLLULLLDDRULURRRLLDRRURRDRLLLLDLLLURRRRRDRUUUUUUUULUURURDLLDRRRRRDRURRURDDUUDLLLLLUURRDLDRRRURDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDRRRRRR

Result: live player at (15,10,0), complete room-local endpoint passed. The reference helper independently replays this accepted route and selected controls. The full final state and selected complete snapshots are packaged, not reconstructed from screenshots.

## Key causal events

All positions below are elevation 0; full arrays and all unchanged actors/terrain remain in the immutable solution and packaged states.

| Steps | Complete relevant precondition | Action and changed condition | Next work |
| --- | --- | --- | --- |
| 1-14 | Player in upper central region; three reachable floating floors; M0 isolated at upper left | Floor 2 fills (6,4), floor 6 fills (4,6), floor 5 fills (2,4) | A connected preparation route reaches M0 and allows it to leave |
| 21-36 | M0 can move down the newly opened left bridge and right over the second bridge | M0 is brought to (6,8), then pushed through the gate | Player reaches the central region; M0 remains usable |
| 39-42 | Blue lies ahead of player on row 10; floor 7 at (2,10) | Blue crosses x4 gate and pushes floor 7 to (1,10) | Both tools occupy the west region, with a later recovery obligation |
| 50-79 | Floor 7 and M0 are independent; the west gate has several cells | Floor 7 is staged on gate (4,9), M0 on (4,10); the floor is moved to (6,9), blue is temporarily withdrawn and recovered to (6,10) | Player can stand at (6,11); the two tools form a northbound push chain |
| 82-89 | P (6,11), M0 (6,10), floor 7 (6,9) | Eight U inputs move the three actors together through the red gate and earlier bridge; finish P (6,3), M0 (6,2), floor (6,1) | Retained floor can be allocated to the eastern gap |
| 90-99 | Vertical convoy in a region with clearance above and left | Walk to (5,1), push floor right to (7,1); use (7,0) to push it down to (7,2); return to (5,2) | P, M0 and floor now form an eastbound chain; no actor rotates |
| 100-104 | P (5,2), M0 (6,2), floor 7 (7,2), hole (8,2) | R sends the leading floor into the hole; M0 follows only after support exists. The same blue then pushes floor 3 into (12,2) | Right regions become connected without sacrificing M0 |
| 109-142 | Floor 4 remains available on the upper right; blue is parked temporarily | Floor 4 fills (14,4); M0 is recovered and moved down through gate (14,8) | Player reaches the eastern exit region |
| 143-177 | M0 at (14,11); some repeated D inputs are blocked | The player turns right and reaches (15,10) | Complete endpoint; blocked inputs are preserved, not counted as extra mechanism stages |

## Structural functions

Bridge floors are consumable access resources, while the blue member is a reusable gate occupant and intermediary pusher. Gate strips impose stance constraints and can be held by either an appropriate floating floor or M0. The west region gives separate staging lanes for both modules. Upper-region cells (5,1), (6,0), (7,0), and (5,2) realize the demonstrated turning workspace; their particular coordinates are not the rule. All three newly connected preparation gaps support future access, not merely walking length. Unused floors 8 and 9 show that the demonstrated endpoint does not require consuming every supplied module.

## Counterfactual checks and limits

The complete ordinary replay is the positive control. Selected-state gate controls compare the legal next input after step 34 or step 55 with a separate state where the gate occupant is removed; the ordinary next move must block when the now-empty gate rises. A selected-state order swap before step 100 compares P-blue-floor with P-floor-blue at the same cells and applies RR, exposing the unsupported leading blue. These controls change actor state in explicitly derived probe states and never modify the official map. They establish local gate occupancy and ordering consequences only. There is no exhaustive full-room exclusion search, no unique-route proof, no proof that these precise bridge choices are necessary, and no human difficulty calibration. Alternative manual partial routes are exploration, not accepted complete solutions.

## Transferable relations

- allocate-bridge-after-access-plan: map the disconnected regions and reserve bridge consumption until it enables the next usable tool/stance path; source rules plus witness 1-14 and 100-113. Vary geometry and allocation, but verify a full supported route.
- occupy-gate-before-entry: create a blocking actor on the gate at the right elevation before approaching, and preserve the next stance; witness 34-36/55-63 and local removal controls. Either blue or a suitable floor can realize the blocking role.
- stage-and-recover-both-tools: maintain accessible, independently movable modules while changing which lane or side the player occupies; witness 50-79. Require recovery to a useful joint operation, not decorative backtracking.
- reform-convoy-for-turn: leave space to reposition a front module and reach a new pushing side, finishing a direction-aligned chain; witness 90-100. It is a sequence of translations, not rigid rotation.
- bridge-first-delivery: put the consumable bridge in front when approaching the selected gap, preserve the reusable blue behind it, then continue passage work; witness 100-104 and local swapped-order control. Test support of every actor during the transfer.

## Open issues and integration decision

Adopt the supported relations as design rules and include the complete accepted reference. The user supplied screenshots suggest other local turning histories; only the accepted route above is assigned exact step coordinates. No independent new map is generated or verified in this task. Global mechanism necessity and transfer reliability remain unconfirmed. Genuine inter-world-room tool export is outside the engine behavior inspected here; internal-region transport is the supported scope.

## Structural difficulty observations

The reference links preparation access, gate crossing, dual staging and recovery, convoy turning, delayed irreversible floor placement and final tool reuse. These dependent constraints support a provisional planning-tier estimate. It is the sole reference, so no empirical neighboring-case ranking exists; move count and the solver timeout do not determine the tier.
