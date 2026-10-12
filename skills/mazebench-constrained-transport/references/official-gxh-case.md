# GxH official constrained-transport reference

Source: `games/maze/levels/dfizxjsozb.txt`, resolved through `games/maze/world_map.json`, engine commit `0ac96b8a2648db09f375989cd7bc33699222c1e6`. The unchanged Git map bytes have SHA256 `2e14d5e000b27fea40972f313df248333e1f696714339051ca24e07416df804f`. The Windows checkout may use CRLF; normalized tokens and geometry are identical. The source map is [preserved here](official-gxh-world-map.txt).

## Human-directed mechanism focus

Choose an L-shaped final tool; move the short bar out of the working corridor, restore the L configuration, reconfigure the other L helper, then deliver the tool while preserving the gem-and-exit route. The private work record preserves the supplied brief separately from this interpretation. This is an additional official realization, not a map derived from GxF.

## Complete initial state and objective

The map authors its player at (14,3,0). The gem is at (10,1,0). There are no entry-state overrides, ice, slopes, gates, or movable-floor devices. All terrain cells, complete actors, elevations and removal flags are in [the states](official-gxh-states.json); no cropped region or omitted helper is used.

| Group | Function in this witness | All initial members (x,y,z) |
| --- | --- | --- |
| M3 | target obstruction | (5,1,0) (6,1,0) (5,2,0) (6,2,0) (5,3,0) |
| M1 | transported tool | (8,8,0) (8,9,0) (9,9,0) |
| M2 | helper or temporary obstruction | (9,8,0) (10,8,0) (10,9,0) |
| M0 | helper or temporary obstruction | (6,9,0) (7,9,0) |

The complete room-local objective is to collect the gem and reach the only outer doorway at (15,1,0). The route proves readiness to leave this room; actual neighbor loading is a separate world-transition/UI operation. A gem-only solved flag is insufficient.

## Source-backed motion rules

| Condition | Official transition | Prohibited inference | Pinned source |
| --- | --- | --- | --- |
| Same M ID | Every live member belongs to one rigid group | No free rotation or partwise transport | `public/maze-engine.js`: `weightlessGroupMembers`, `collectWeightlessPushCluster` |
| A pushed group contacts another at the destination side | The directional cluster propagates, subject to every member destination | Simultaneous movement does not create a permanent bond or pulling | `collectWeightlessPushCluster`, `attemptPushActor` |
| A member projects above void | Whole-group support and destination legality determine survival | A supported overhang does not license arbitrary spans | `canWeightlessMemberEnter`, `moveWeightlessCluster`, support reconciliation in `move` |
| Player contacts the gem | Ordinary movement collects it | Collection alone does not certify a return | `collectGemsAt`, `move`, `isSolved` plus explicit doorway predicate |

## Full ordinary replay

The workflow accepted 203 ordinary inputs from the complete authored initial state (`automatic-solver`). The bounded official solver produced the route and ordinary moves independently replayed the full endpoint. [The route](official-gxh-solution.json) and [runnable reference](official-gxh-design.json) bind the map, goal and engine. Reproduce with the package reference verifier described in [verification](verification.md).

## Key causal events and structural functions

M0 initially acts as an input into a three-group contact chain at 24. M2 moves up at 33-35; M1 moves up at 56 so M0 can be parked left at 57-60. M1 returns down and left at 70-74, restoring its original complete footprint. M2 is repositioned down at 82-86, then later pushes M1 upward through real contact at 111-113. M1 is moved left and up into the northern target workspace at 130-150. This witness reuses the helper after parking; it does not imply that every parked group must remain permanently idle.

The final tool is M1, not the two-cell M0. At input 154 the player at (8,4,0) pushes left into M1 at (7,4,0). Its offset working member (6,3,0) contacts M3 at (5,3,0). M3 has five members, not a three-cell bar. At 155 the whole target loses support and is removed; the continued tool push at 156 opens player access. Gem collection at 164 is followed by an ordinary return to the east doorway at 203.

The final input and working members lie in different rows. The L connector preserves both the offset contact and support on the lower floor while the upper member works over the void. M0 at (4,9)/(5,9) leaves the relevant central circulation usable. Restoring M1 at 74 reopens a different transport configuration; the restoration is functional, not a requirement to undo all earlier progress. Support loss removes all five M3 members together. Every selected state stores complete poses, the frozen-object walking region and legal next push opportunities. A visually aligned tool is not called delivered until its actual input stance and next target contact are executable.

## Scoped counterfactuals and limits

[Checks](official-gxh-checks.json) distinguish complete ordinary replay from independent group freezes and exclusion of the defined real tool-to-target contact. Each restriction starts from the same full initial state and uses the same gem-and-return endpoint. A solved restriction is a replayed bypass; an exhausted restriction supports only that case-specific claim; capped or unsupported checks remain unknown. No exclusion proves a unique exchange count, precise parking cell, minimum silhouette, or human difficulty.

## Transferable contribution

Retain `ct-usable-delivery`, `ct-shared-clearance`, `ct-input-work-support`, and `ct-recovery-and-reuse`. The added `ct-role-selection` relation makes tool choice depend on the terminal contact and reachable stance; `ct-reserved-circulation` keeps parking compatible with later pushing faces and the full return. The original coordinates, two L shapes, and a fixed swap sequence are optional realizations. An L can be the tool while the short bar becomes a temporary obstruction; role is not determined by object size.

## Difficulty and untested transfer

A provisional planning reference: the short bar changes from initial pusher to parked obstruction, M1 is restored and becomes the final tool, and M2 is reused to make its northward transport possible. Compared with GxF/GxG this changes the tool-role assignment and final support-loss behavior; route length is not a difficulty score. The mutable tier and rationale are in [the difficulty guide](difficulty.md). This task analyzed official references only, as requested; no new maze was generated and no independent new-map transfer claim is made.

## Executed restriction results

All four group freezes exhausted: M3 at 3,694 push-component nodes and M0/M1/M2 at one each. Excluding the defined lateral transfer also exhausted at 3,694 nodes. The complete positive replay makes these necessity results specific to this initial state, endpoint and contact observer. They do not prove the exact restoration order or a minimal L silhouette.
