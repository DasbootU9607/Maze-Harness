# GxG official constrained-transport reference

Source: `games/maze/levels/fa74bg7jkj.txt`, resolved through `games/maze/world_map.json`, engine commit `0ac96b8a2648db09f375989cd7bc33699222c1e6`. The unchanged Git map bytes have SHA256 `d88f529e34a54459508c119552dd0384b84f24d02b28fe046014be1497b5a914`. The Windows checkout may use CRLF; normalized tokens and geometry are identical. The source map is [preserved here](official-gxg-world-map.txt).

## Human-directed mechanism focus

Select the two-cell bar for the narrow final approach; temporarily move it to release L-helper parking, exchange relative positions through shared space, and reserve circulation before the next exchange. The private work record preserves the supplied brief separately from this interpretation. This is an additional official realization, not a map derived from GxF.

## Complete initial state and objective

The map authors its player at (2,1,0). The gem is at (4,13,0). There are no entry-state overrides, ice, slopes, gates, or movable-floor devices. All terrain cells, complete actors, elevations and removal flags are in [the states](official-gxg-states.json); no cropped region or omitted helper is used.

| Group | Function in this witness | All initial members (x,y,z) |
| --- | --- | --- |
| M0 | transported tool | (9,5,0) (10,5,0) |
| M1 | helper or temporary obstruction | (10,6,0) (10,7,0) (11,7,0) |
| M2 | helper or temporary obstruction | (9,7,0) (9,8,0) (10,8,0) |
| M3 | target obstruction | (2,10,0) (2,11,0) (2,12,0) |

The complete room-local objective is to collect the gem and reach the only outer doorway at (0,1,0). The route proves readiness to leave this room; actual neighbor loading is a separate world-transition/UI operation. A gem-only solved flag is insufficient.

## Source-backed motion rules

| Condition | Official transition | Prohibited inference | Pinned source |
| --- | --- | --- | --- |
| Same M ID | Every live member belongs to one rigid group | No free rotation or partwise transport | `public/maze-engine.js`: `weightlessGroupMembers`, `collectWeightlessPushCluster` |
| A pushed group contacts another at the destination side | The directional cluster propagates, subject to every member destination | Simultaneous movement does not create a permanent bond or pulling | `collectWeightlessPushCluster`, `attemptPushActor` |
| A member projects above void | Whole-group support and destination legality determine survival | A supported overhang does not license arbitrary spans | `canWeightlessMemberEnter`, `moveWeightlessCluster`, support reconciliation in `move` |
| Player contacts the gem | Ordinary movement collects it | Collection alone does not certify a return | `collectGemsAt`, `move`, `isSolved` plus explicit doorway predicate |

## Full ordinary replay

The workflow accepted 284 ordinary inputs from the complete authored initial state (`reused-route`). A default 300,000-state search capped; a previously recorded candidate route was subsequently revalidated against this pinned map and the stronger full endpoint. The cap was not an impossibility result. [The route](official-gxg-solution.json) and [runnable reference](official-gxg-design.json) bind the map, goal and engine. Reproduce with the package reference verifier described in [verification](verification.md).

## Key causal events and structural functions

Inputs 14-15 move all three central groups together. M0 separates at 18 and 48; M1 is moved into the upper-left workspace by 85. Moving M1 left and down at 114-120 releases space used by M2 at 128-139. M1 moves right at 154 while M0 is raised at 156, lowered at 161 and returned right at 164-166. M2 moves left again at 186, and M0 continues through the lower corridor at 207-227. These are one witnessed exchange/recovery schedule, not a unique two-swap algorithm.

The final contact is axial reach, not lateral hook transfer. At input 228 the player pushes M0 left, with input member (4,11,0), working member (3,11,0), and target member (2,11,0). The working end crosses the void at (3,11), while the other end retains support. M3 shifts left. The player must then circle around, push M3 down at inputs 262-263, and withdraw M0 right at 264 before entering the gem pocket. Opening the first contact lane is not completion.

The horizontal bar spans the last unsupported cell on an axial push. The vertical three-cell target cannot initially be pushed down into the wall under its bottom member; its lateral shift first exposes a usable downward lane. Upper bays must accommodate the complete L footprints without closing the player routes around their protrusions. A temporarily unimportant bay is defined relative to the remaining task and extraction faces, not by distance from the gem. Every selected state stores complete poses, the frozen-object walking region and legal next push opportunities. A visually aligned tool is not called delivered until its actual input stance and next target contact are executable.

## Scoped counterfactuals and limits

[Checks](official-gxg-checks.json) distinguish complete ordinary replay from independent group freezes and exclusion of the defined real tool-to-target contact. Each restriction starts from the same full initial state and uses the same gem-and-return endpoint. A solved restriction is a replayed bypass; an exhausted restriction supports only that case-specific claim; capped or unsupported checks remain unknown. No exclusion proves a unique exchange count, precise parking cell, minimum silhouette, or human difficulty.

## Transferable contribution

Retain `ct-usable-delivery`, `ct-shared-clearance`, `ct-input-work-support`, and `ct-recovery-and-reuse`. The added `ct-role-selection` relation makes tool choice depend on the terminal contact and reachable stance; `ct-reserved-circulation` keeps parking compatible with later pushing faces and the full return. The original coordinates, two L shapes, and a fixed swap sequence are optional realizations. Axial reach is a conditional branch; lateral offset is not a family-wide invariant.

## Difficulty and untested transfer

A provisional planning reference: two overlapping helper exchanges use shared upper space and temporary reversal, followed by target repositioning and tool withdrawal after delivery. The axial endpoint and post-contact work differ from GxF, so no strict ordering between them is claimed. The mutable tier and rationale are in [the difficulty guide](difficulty.md). This task analyzed official references only, as requested; no new maze was generated and no independent new-map transfer claim is made.

## Executed restriction results

The full-goal freezes of M0, M1 and M2 exhausted (one push-component node each). Freezing M3 and forbidding the axial transfer each hit the 6,000-node cap. Thus the complete witness is verified and the three central groups must move in this case, but final-tool uniqueness and mandatory axial use remain unconfirmed. The human brief motivates the short-bar choice; the witness realizes it without converting a cap into a proof.
