# Skating Cross user case and mechanism analysis

The user constructed this case on a supplied blank map. The confirmed objective is to collect the gem and return to the starting doorway in the upper-right corner; entering a neighboring room is not required. Mechanism and necessity claims come from ordinary moves in the official engine, solver results and restricted searches. Stage names are authoring analysis, not a claim that the user described a unique solution.

## Provenance and initial state

The bundled [original map bytes](user-world-map.txt) preserve the user reference case, including the gem. Map SHA256: `d95611963f45420573cf662f7eba9b494f8622203505627cebf1f425f3e3b296`. Engine baseline: `0ac96b8a2648db09f375989cd7bc33699222c1e6`. This is not an upstream official level. When redistributing generated drafts, retain the applicable engine and asset licenses and notices from the separate engine installation.

Coordinates are zero-based; U decreases y, and every position has z=0. P=(15,1,0), gem=(12,8,0), and completion cell=(15,1,0). The starting cell is the only open boundary cell. In the single-room profile, continuing outward from the doorway causes a fall, so verification ends when the player reaches that cell after collecting the gem.

M0 is a five-cell cross: center (8,6), upper arm (8,5), left arm (7,6), right arm (9,6), and lower arm (8,7). The [runnable contract](user-design.json) records every member, wall and ice cell. The user reference map is unchanged.

## Sliding, braking and reuse

The player cannot walk arbitrarily one cell at a time or turn during a slide on ice. When sliding toward the cross without an initially adjacent pushing opportunity, the player stops before a member; a subsequent input may push from that stop. A wall ahead of any arm can limit the whole group's sliding distance. Both player and cross may travel multiple cells per input.

Freezing M0 in its initial pose yields 29 reachable stopping states/positions and permits neither gem collection nor the complete return objective. The complete BFS route uses 138 directional inputs and 23 M0 translations; input 134 collects the gem, and input 138 returns to the doorway. The independent official solver also solves the complete objective, and its route is replayed with ordinary moves. These counts do not establish human difficulty or a unique solution.

The early route includes temporary parking and reuse in the opposite direction. After inputs 13, 22, 30 and 31, the cross centers are (8,10), (2,10), (8,10) and (8,3), respectively. For histories that have reached the western parking event, restoring the center to (8,10) is necessary to reach a genuine pushing opportunity toward (8,3) or the complete objective. The checks include history and positive controls. This does not imply a required D, L, R, U sequence: searches for direction-level opportunities found prefix counterexamples with other orders, which are preserved and replayed.

## Connected final functional chain

| Input | Cross center and complete members (z=0) | Actual input and stopping cause | Subsequent function |
| --- | --- | --- | --- |
| 111 R | (12,4); (12,3),(11,4),(12,4),(13,4),(12,5) | P=(1,5) pushes the lower arm; the next cell (14,4) beyond the right arm (13,4) is a wall | Makes the D stance (11,3) reachable as a stop, preparing vertical alignment |
| 117 D | (12,7); (12,6),(11,7),(12,7),(13,7),(12,8) | P=(11,3) pushes the left arm; the next cell (13,8) beyond the right arm (13,7) is a wall | Aligns the lower arm with the gem row and permits access to the L stance (13,6) |
| 124 L | (2,7); (2,6),(1,7),(2,7),(3,7),(2,8) | P=(13,6) pushes the upper arm; the next cell (0,7) beyond the left arm (1,7) is a wall | Clears the gem row while the right arm (3,7) retains the upward-slide stop at (3,8) |

Input 133, U, stops the player at (3,8), braked by the member at (3,7). Input 134, R, follows y=8 to (12,8), where the wall at (13,8) stops the player as the gem is collected. Subsequent U, R, U, R inputs visit (12,3), (14,3) and (14,1), then return to (15,1). Freezing M0 after gem collection still allows the return; this case does not claim that further pushing is necessary after collection.

These three stages change the function of the same cross: the rightward pose unlocks downward movement, the lowered pose unlocks the leftward reset, and the reset both clears the gem row and supplies a turning stop. Forbidding entry into center (12,4) prevents the first executable event toward (12,7) and the complete objective. Forbidding (12,7) prevents the first executable event toward (2,7) and the complete objective. Positive controls reach both opportunities, which are checked through actual ordinary inputs. Input counts do not substitute for functional evidence.

## Evidence scope

[Concise checks](user-checks.json) and [key states](user-states.json) preserve routes, restriction results, complete members, stops, inputs, wall-contact members and counterexamples. Ordinary replay checks complete rigid translation, height and player survival at every step. Ice stopping graphs preserve directionality and gem state rather than collapsing into undirected walking regions.

- Freezing the cross, forbidding a long slide braked by a stationary cross, or forbidding translation in each tested direction produces exhausted searches with no complete solution. These conclusions belong to the reference map and are not automatic requirements for new maps.
- Allowing at most one, two or three rigid-group moves, or freezing the group after its first move, does not permit completion. Restricting all group motion to one direction also fails. Counts check for degenerate solutions; they do not independently prove functional stages.
- Preparation relationships have positive controls and prefix searches that restrict preparation, ending at the complete objective or a genuine next-event opportunity. An opportunity is not completion; counterexamples are replayed.
- Forbidding entry into recorded poses blocks the complete objective, but does not prove a unique order or global shape minimality. Repeated poses can have earlier reachable paths; retain counterexamples to directional ordering claims.
- A freeze result at a selected state applies only to that state. New maps must rerun dependency, braking, restoration, doorway and shape-function checks. Search caps and unsupported physics are unknown.

## Inherited functions and variable elements

Inherit genuine ice stopping points, sliding limits imposed by the complete footprint, distinct input/braking surfaces supplied by members, changes of pushing side and restoration after temporary parking, a connected pose-preparation chain, clearance of the objective route with a turning stop retained, and the complete return objective.

Coordinates, directions, surrounding layout, verified arm lengths, corresponding walls/stops, stage count and route may vary. Neither the same 138-input route nor 23 group moves is required. For each change, identify the new member, boundary, stop and stance that carry the inherited function, then run the checks.
