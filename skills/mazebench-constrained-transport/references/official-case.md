# GxF official case and mechanism analysis

Read this complete-map analysis and the key states relevant to the proposed design before construction; a summary does not replace it. Mechanism interpretations come from the map, code, and ordinary replay, without an account from the original author or human difficulty experiments. Coordinates are zero-based, U decreases y, and every initial elevation is z=0.

Original source: `games/maze/levels/0lzre7ixaq.txt`, MazeBenchEngine commit `0ac96b8a2648db09f375989cd7bc33699222c1e6`. The engine is MIT-licensed; preserve the original map bytes and applicable source notices without adding unsupported authorship claims. The unmodified [official map](official-world-map.txt) has SHA256 `493020c70b983b3a93fa4df871eb118c5fb8a0621f8ab09111b6d3653433ef33`.

The objective is to collect the gem at (2,9,0), starting at (7,1,0). M0 is a two-cell tool at (6,5,0),(7,5,0), M1/M2 are three-cell L helpers, and M3 is a three-cell horizontal target. The table below lists all members. The tool's input and working ends occupy different columns. Helper ears, complete tool width, and player pushing faces compete for central clearance; a path for the tool center is insufficient.

The initial frozen-object walking region has 118 positions. M1 can be pushed up or down, but the tool cannot yet be delivered. Witness input 11 moves M1 down; inputs 37-39 move M2 left, with the last move also contacting M0; input 45 returns M1 upward to its original region. At input 106 the tool is at (8,7)/(9,7), M1 at (9,8)/(10,8)/(9,9), and an upward push from (9,10) can move M0/M1. At inputs 126 and 155 the tool rises out of earlier downward progress. At input 149 both helpers reoccupy the upper workspace, and the rightward contact chain at input 172 reconfigures the downward passage. The state JSON records stage access and all legal pushing faces; clearance alone does not establish access to a different pushing side.

Voids at (3,9),(3,10),(3,11) prevent direct player access above the working target end. Input 208 aligns the tool at (3,11),(4,11), but the player reaches (4,10) only at input 210. Usable delivery combines complete tool and target poses, player stance, and the next legal action. Inputs 211 and 212 push the tool's right end down; its left end makes offset contact across the void. Two lateral transfers open the gem route. P=(4,10,0), I=(4,11,0), C=(3,11,0), T=(3,12,0), d=D, with I=P+d and C+d=T. Other members provide the engine's required support despite the working end overhanging the void.

Freezing each of the four groups prevents completion. Forbidding actual lateral transfer also fails. Without independent tool preparation, neither the first usable contact opportunity nor the goal is reachable; the positive control reaches them. M0/M1 each require U,D,L,R; M2 requires L,R but can avoid U,D. Necessary directions establish opposite-direction motion, not a unique order or an exact return cell. A new contract may declare ordered or looser reuse only after its own search; witness order is not a proof.

The earlier user reconstruction is a separately sourced saved layout: it changes floor at (15,1) to a wall, and other textual differences include equivalent tokens. Its 43-push witness and the original map's 42-push witness are both legal; do not mix input indices. Both use 219 inputs, which is not a quota for new maps. Borrowed Bay is an authored fixture with separate role and recovery logic, not the official map.

New designs inherit complete tool/helper competition for space, helper reconfiguration, purposeful retreat, rising, restoration or helper reuse, access to changing pushing faces and usable delivery, and offset contact across a void. Declare opposite-direction motion and reuse, then restrict them before real progress opportunities or the goal. The first forward move or an ineffective retreat reversal is insufficient. The design need not retain two L shapes, four groups, all directions, 219 inputs, or the original coordinates. Preserve input-end, offset working-end, full-footprint clearance, and recoverable pushing-face functions when changing shapes and layout.

## Complete initial rigid-group members

| ID | Functional role | Complete members (x,y,z) |
| --- | --- | --- |
| M2 | helper-2 | (10,4,0) (11,4,0) (10,5,0) |
| M0 | tool | (6,5,0) (7,5,0) |
| M1 | helper-1 | (8,5,0) (9,5,0) (8,6,0) |
| M3 | target | (1,12,0) (2,12,0) (3,12,0) |

## Evidence and scope

[Key states](official-states.json) preserve the initial state, complete members, selected absolute poses, removal flags after support loss, frozen-object walking regions, and reachable-stance push probes. [Concise checks](official-checks.json) retain restriction results, successful bypasses, differences between original and reconstructed maps, and counterexamples. The [runnable original-map contract](official-design.json) works with the complex verifier. All references are local to this package.

The original checks completed within a 1,000,000-state cap each, and returned routes were replayed with ordinary moves. Those results apply only to their maps and specified goals. First-opportunity prefix checks include the real goal as a bypass endpoint, forbid the event itself, and have reachable positive controls. Direction restrictions establish neither a unique order nor an exact return. A selected-state result does not apply to every history. Rerun initial-state, first-event history, return, and post-contact freeze checks for new maps. Caps, exceptions, and unsupported inputs are unknown.

Default authoring requires at least three interdependent stages that change object, contact, support, or pushing conditions; this is an authoring requirement, not an official definition of difficulty. Record inherited and variable elements in the [contract and verification interfaces](complex-validation.md). Coordinates, verified dimensions, and external layout may vary. For each shape or boundary change, identify the new geometry carrying the old function and recheck complete footprints, support, stances, stage dependencies, and bypasses. A reading record does not prove necessity.
