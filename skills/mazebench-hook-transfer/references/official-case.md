# GxE official case and mechanism analysis

This complete analysis is required when maintaining the skill or reproducing the case. New authoring first reads [Mechanism logic](mechanism-logic.md), then consults this case and its states/checks for detailed evidence or physics questions. Mechanism interpretations come from the map, code, and ordinary replay, without an account from the original author or human difficulty experiments. Coordinates are zero-based, U decreases y, and every initial elevation is z=0.

Original source: `games/maze/levels/9hgghfgcsu.txt`, MazeBenchEngine commit `0ac96b8a2648db09f375989cd7bc33699222c1e6`. The engine is MIT-licensed; preserve the original map bytes and applicable source notices without adding unsupported authorship claims. The unmodified [official map](official-world-map.txt) has SHA256 `4c2a18742e7949e815a620aa6c1cff8f79ed2ff8aa93801b0d63261238caa1df`.

The official map has no gem. The analyzed objective is to reach (2,13,0), starting at (13,7,0); a gem-free `isSolved` result does not establish that reach objective. M0 is a six-cell C-shaped tool and M1 a five-cell target with a bent tail. Target member (8,14) is between walls at (7,14) and (9,14), and the bottom edge prevents downward movement. Voids at x=4..6,y=11 restrict stances for direct upward pushes. The tool's upper input arm, left connector, rear working arm, and inner opening create the input and rear target contact.

The initial frozen-object walking region has 76 positions, and the tool can move independently. Witness inputs 4-20 transport the complete C upward, left, down, and right. At input 20 its members are (6,9),(7,9),(6,10),(6,11),(6,12),(7,12); 79 walking positions include access to the interior at (7,10). The player reaches that input stance at input 27. Pushing the tool right would send the target tail into (9,14), and pushing the target down would hit (8,15). The JSON records frozen walking and ordinary-action probes rather than inferring stances from alignment.

Input 28 is U, with P=(7,10,0), I=(7,9,0), C=(7,12,0), T=(7,11,0), and d=U. I=P+d and C+d=T; T is behind the player relative to the pushing direction. Actual member contact translates both complete groups. The target tail moves from (8,14) to (8,13), releasing the restriction. The walking region now has 76 positions, and walking alone still cannot reach the objective. The witness chooses a tool retreat left at input 29 and a target move right at input 31; its resulting 112-position region reaches the goal.

The tool, target, actual rear transfer, and independent tool preparation before first contact are necessary. Tool-L, tool-R, and target-U are individually necessary. Forbidding target-R still yields a complete 43-input solution, so do not require a unique tool-left-then-target-right order. At the selected input-28 state, walking alone, freezing the tool, or freezing the target prevents completion. The original checks did not enumerate every first-contact history. The complex verifier separately searches for any complete route needing no further object operation after first contact. An exhausted search excludes that class; returned routes must be replayed and used to revise the design. Global post-contact necessity of each group requires its own enabled check.

The earlier user reconstruction swapped M0/M1 and closed the northern boundary. Its core initial footprints match, but its text differs by 28 tokens and is not the original map. Minimal pre-docked hooks are authored fixtures for basic mechanisms and degenerate-solution regression. Active-docking and side-reach profiles have their own observers and do not automatically cover this case.

New designs inherit terrain and tail boundaries that restrict direct operation, independent transport of the complete tool, access to a usable input, rear-arm contact releasing the target tail, and further configuration of the objective route after contact. Extract P/I/C/T from the ordinary pre-action state; joint motion alone does not establish hook transfer. Coordinates, external layout, and verified local shapes may vary while preserving input-arm, working-arm, connector, opening, support, and retreat-stance functions. Neither the compass order nor a rightward target move is required.

## Complete initial rigid-group members

| ID | Functional role | Complete members (x,y,z) |
| --- | --- | --- |
| M0 | tool | (11,8,0) (12,8,0) (11,9,0) (11,10,0) (11,11,0) (12,11,0) |
| M1 | target | (7,11,0) (8,11,0) (8,12,0) (8,13,0) (8,14,0) |

## Evidence and scope

[Key states](official-states.json) preserve the initial state, complete members, selected absolute poses, removal flags after support loss, frozen-object walking regions, and reachable-stance push probes. [Concise checks](official-checks.json) retain restriction results, successful bypasses, differences between original and reconstructed maps, and counterexamples. The [runnable original-map contract](official-design.json) works with the complex verifier. All references are local to this package.

The original checks completed within a 1,000,000-state cap each, and returned routes were replayed with ordinary moves. Those results apply only to their maps and specified goals. First-opportunity prefix checks include the real goal as a bypass endpoint, forbid the event itself, and have reachable positive controls. Direction restrictions establish neither a unique order nor an exact return. A selected-state result does not apply to every history. Rerun initial-state, first-event history, return, and post-contact freeze checks for new maps. Caps, exceptions, and unsupported inputs are unknown.

Default authoring requires at least three interdependent stages that change object, contact, support, or pushing conditions; this is an authoring requirement, not an official definition of difficulty. Record inherited and variable elements in the [contract and verification interfaces](complex-validation.md). Coordinates, verified dimensions, and external layout may vary. For each shape or boundary change, identify the new geometry carrying the old function and recheck complete footprints, support, stances, stage dependencies, and bypasses. A reading record does not prove necessity.
