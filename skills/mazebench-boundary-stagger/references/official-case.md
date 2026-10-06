# HxH official case and mechanism analysis

This complete analysis is required when maintaining the skill or reproducing the case. New authoring first reads [Mechanism logic](mechanism-logic.md), then consults this case and its states/checks for detailed evidence or physics questions. Mechanism interpretations come from the map, code, and ordinary replay, without an account from the original author or human difficulty experiments. Coordinates are zero-based, U decreases y, and every initial elevation is z=0.

Original source: `games/maze/levels/mygl8anih8.txt`, MazeBenchEngine commit `0ac96b8a2648db09f375989cd7bc33699222c1e6`. The engine is MIT-licensed; preserve the original map bytes and applicable source notices without adding unsupported authorship claims. The unmodified [official map](official-world-map.txt) has SHA256 `b02c9a4bfd089d9c4b1df350ad8b254d06b3ce42e91f11af8c587f0e420b5df7`.

The objective is to collect the gem at (1,3,0), starting at (8,14,0). The original map has five groups. M0 is an eight-cell approach blocker, M2 a five-cell central repositioning object, M4 the upper staircase, and M3 the lower staircase. M1 is a two-cell side branch that may remain frozen for this objective. The table below lists every initial member; a center trajectory is insufficient.

Initially only 30 frozen-object walking positions are reachable. M0 can be pushed upward from positions such as (4,11,0). Inputs 8-9 cause loss of support and legal whole-group removal by the engine. Inputs 14-17 move M2 right, then left from reachable pushing faces on its right, including (14,9,0). Forbidding M0 removal, M2-R, or M2-L prevents the first usable M4-L opportunity and the gem; positive controls can reach them. These are preparation dependencies for the upper operation, so starting from an already operable two-group configuration omits necessary work.

At input 40 the player is at (6,2,0), with 109 frozen-object walking positions. An M3-U push from another reachable stance, (6,4,0), fails: M3 members (5,3) and (4,4) contact M4, whose member at (5,1) would move into the roof wall at (5,0). Input 41 independently moves M4 left, breaking the roof-constrained contact cluster. The recess at (2,2) limits further leftward motion. There are now 111 walking positions, but walking alone still cannot collect the gem. Input 47 moves the complete M3 upward and opens the southern approach. Voids and the bottom opening jointly constrain approach, support, and return pushing faces. The original map preserves all terrain; the engine decides support.

Necessary changes include M0-U, M0 removal, M2-R, M2-L, M4-L, and M3-U. M0, M2, M4, and M3 are necessary roles. Freezing M1 still permits a complete solution. Forbidding M2-U or M2 removal each permits a 58-input solution. Preserve these ordinary replay counterexamples. Individually necessary directions do not imply a unique order or require the witness's M2-U removal.

The earlier user reconstruction retained only the two upper groups, renamed M4/M3 to M0/M1, started at (14,4,0), and changed the approach terrain; its 26 inputs contain only two pushes. The historical fixture named `official-staircase` is another enclosed local excerpt. Both establish a basic mechanism and provide negative controls for complex mode; neither is the complete official HxH map. Local reconstructions and authored fixtures do not replace the complete case.

New designs inherit preparation that makes upper pushing faces reachable, reuse of the same central role in different configurations, a fixed boundary blocking the complete contact cluster, and a second group operation after independent offset. Preparation geometry may vary, but identify the function replacing support loss/removal and rerun first-opportunity and wall-intervention checks. The `planar-boundary-preparation-v2` profile supports two to five groups, floor, walls, voids, and legal whole-group removal. The legacy paired profile has two groups, no voids, and no removal.

## Complete initial rigid-group members

| ID | Functional role | Complete members (x,y,z) |
| --- | --- | --- |
| M4 | upper | (5,1,0) (4,2,0) (5,2,0) (3,3,0) (4,3,0) (3,4,0) |
| M3 | lower | (5,3,0) (6,3,0) (4,4,0) (5,4,0) (3,5,0) (4,5,0) |
| M2 | approach-M2 | (8,8,0) (9,8,0) (10,8,0) (9,9,0) (9,10,0) |
| M0 | approach-M0 | (1,9,0) (2,9,0) (3,9,0) (4,9,0) (1,10,0) (2,10,0) (3,10,0) (4,10,0) |
| M1 | approach-M1 | (10,13,0) (10,14,0) |

## Evidence and scope

[Key states](official-states.json) preserve the initial state, complete members, selected absolute poses, removal flags after support loss, frozen-object walking regions, and reachable-stance push probes. [Concise checks](official-checks.json) retain restriction results, successful bypasses, differences between original and reconstructed maps, and counterexamples. The [runnable original-map contract](official-design.json) works with the complex verifier. All references are local to this package.

The original checks completed within a 1,000,000-state cap each, and returned routes were replayed with ordinary moves. Those results apply only to their maps and specified goals. First-opportunity prefix checks include the real goal as a bypass endpoint, forbid the event itself, and have reachable positive controls. Direction restrictions establish neither a unique order nor an exact return. A selected-state result does not apply to every history. Rerun initial-state, first-event history, return, and post-contact freeze checks for new maps. Caps, exceptions, and unsupported inputs are unknown.

Default authoring requires at least three interdependent stages that change object, contact, support, or pushing conditions; this is an authoring requirement, not an official definition of difficulty. Record inherited and variable elements in the [contract and verification interfaces](complex-validation.md). Coordinates, verified dimensions, and external layout may vary. For each shape or boundary change, identify the new geometry carrying the old function and recheck complete footprints, support, stances, stage dependencies, and bypasses. A reading record does not prove necessity.
