# FxG official case and mechanism analysis

Original room: **FxG**, indexed by `games/maze/world_map.json` as `games/maze/levels/ahxsncllqs.txt`. Engine commit: `0ac96b8a2648db09f375989cd7bc33699222c1e6`. The unchanged [official map](official-fxg-world-map.txt) has SHA256 `844daf7e412b3a0660403906342f4e0bd74d6f64ee4264f917763249574e5650`. The original MIT license is retained. Coordinates are zero-based, x increases right, y increases down, and all initial actors are at z=0.

The supplied focus is coordinated use of several movable shapes: use the long tool to position the bent tool, clear competing space, open the southern passage, change tools, and continue to the eastern passage. This contributes a further realization of [the shared mechanism](mechanism-logic.md), with explicit shared-space and passage-handoff branches. It does not redefine every hook-transfer room as a four-object or two-exit puzzle. The supplied higher-difficulty judgment is recorded separately in [the difficulty guide](difficulty.md).

## Complete initial state and objective

The official map authors the player at (8,1,0). No spawn override, cropped geometry, reset, or world-map jump is used. The north boundary at x=6..9,y=0 is initially reachable and provides a return to the preceding room; immediately returning north is not the supplied mechanism objective. There is no gem, so the engine's gem predicate cannot establish completion.

The complete analyzed objective is to reach the southern doorway at (7,15,0), continue in the same room state, and reach the eastern doorway at (15,1,0). The final configuration must still permit frozen-object walking to the south doorway. These are room-local doorway endpoints, not a claim that a neighboring room's world transition was tested. Source boundary openings, rather than arbitrary convenient cells, determine both endpoints.

| Group | Initial complete members (x,y,z), all z=0 | Functions in this witness |
| --- | --- | --- |
| M0 | (2,2), (3,2), (5,2), (6,2), (2,3), (6,3), (2,4), (3,4), (4,4), (5,4), (6,4), (4,5), (4,6), (4,7), (4,8), (4,9) | Long input frame and stem; remotely shifts M1, docks M2, and is later repositioned to restore input access. |
| M1 | (7,11), (8,11), (4,12), (5,12), (6,12), (7,12), (8,12), (9,12), (10,12), (11,12) | Initially obstructs the southern passage; becomes the wide tool for M3. |
| M2 | (11,2), (12,2), (12,3), (12,4), (12,5), (12,6), (13,6) | Bent tool with offset ends; is transported through the available gap and lifts M1 by rear contact. |
| M3 | (14,3) | Eastern passage blocker, eventually pushed down by M1's remote end. |

The entire 16-by-16 terrain is retained in the map and [design](official-fxg-design.json). Rows 11 and 12 contain void bands with a narrow supported connection at x=7..8; the lower chamber is bounded by walls at (4,13..14) and (11,13..14). Voids at (13,1..2), the east wall x=15,y=2..15, and the top boundary restrict access around M3. Implicit floor under a movable token is interpreted by the official parser, not inferred from the rendered blue shape. The design lists every void and fixed wall; [states](official-fxg-states.json) retain all 35 actors, complete rigid footprints, removal flags, frozen walking regions and ordinary legal push probes.

## Official motion rules

| Condition | Official transition | Prohibited inference | Pinned source |
| --- | --- | --- | --- |
| Members have the same M ID | The complete group translates together and participates in collision. | A stem or working end cannot move separately; shapes do not rotate. | `games/maze/level_parsing.json`, `server/maze-levels.js`, and `public/maze-engine.js:createEngine`, `weightlessGroupMembers`. |
| Player reaches an input member and a moving member meets another group | Ordinary directional pushing can propagate through real contacts when complete footprints can move. | Visual adjacency, similar displacement, or a bent silhouette alone is not a remote-contact event. | `public/maze-engine.js:move`; observed P/I/C/T and translated groups in the states. |
| A group partly overhangs void | The engine checks group support; unsupported removal is not successful docking. | Every member need not have its own floor, and a floating group is not automatically a walkable bridge. | `public/maze-engine.js:weightlessGroupSupportedElevation` and support settlement. No group is removed in this route. |
| A contact ends after relative repositioning | Groups move independently again, subject to subsequent collisions. | There is no attachment, attraction or pulling. | Ordinary separation after inputs 101, 126 and 208. |
| Player reaches a boundary stance | The room-local reach predicate passes. | Reaching an internal cell does not prove an actual cross-room transition. | `public/play-movement.js` and world-transition handling are separate from this scoped replay. |

The supplied description's upward “pull” is realized here by an ordinary upward push on M2's upper end; its lower end contacts M1 from behind. No pulling mechanic is introduced.

## Full ordinary replay and causal events

The [runnable design](official-fxg-design.json) retains a 241-input witness from the unchanged official start. It was assembled from bounded selected-milestone search, explicit ordinary moves, and frozen-object walking paths, then replayed as a single uninterrupted route by the case-workflow solution stage and the [scoped regression](../scripts/verify-official-fxg.cjs). Intermediate failed/capped selected-milestone attempts establish no impossibility claim. The route is neither shortest nor the exact supplied screenshot sequence.

| Input | Actual action/contact | Changed opportunity and remaining work |
| --- | --- | --- |
| 8 | Independent transport places M0 at top-left anchor (1,5). | The stem can contact the left end of the southern bar from an accessible input frame. |
| 14 R | P=(4,6), I=(5,6) on M0; C=(3,12) on M0, T=(4,12) on M1. | Lateral contact shifts M1. Continued shifts make a usable gap for M2's full footprint; the south passage remains blocked. |
| 85 | M2 is independently transported to anchor (4,9). | Its lower end reaches the lower chamber, but the eventual lift requires a changed horizontal relationship. |
| 101 R | P=(4,3), I=(5,3) on M0; C=(3,9), T=(4,9) on M2. | M0 docks M2 one cell right. Actual far-member contact, not a direct straight push on M2, provides the change. |
| 104 L | M0 is withdrawn left; M2 stays docked. | This witness separates the tools before the next input. The exact withdrawal is a choice, not a proved global prerequisite. |
| 123 U | P=(5,10), I=(5,9) on M2; C=(7,13), T=(7,12) on M1. | Rear contact lifts M1. Inputs 123..126 raise the bar and allow the player to reach the southern doorway at 139. |
| 149 | M1 has subsequently been raised directly to a working position near the upper region. | From this selected configuration, frozen walking cannot reach the nub input at (12,4). Simply seeing an aligned bar does not supply its next stance. |
| 159 U | M0 is raised one cell from below its stem; M1/M2/M3 keep their input-149 positions. | Frozen walking now reaches (12,4). This is a controlled selected-state access release. |
| 176 L | M1's upper nub is pushed left; its body also moves M2 left. | A changed alignment permits M1 to rise beside M3 without prematurely pushing M3 up against the top boundary. This route choice is not a unique-order claim. |
| 208 R | Input to M0 moves M0, M1 and M2 together through distinct contacts. | M1 redocks above M3, but frozen walking still cannot reach (7,1). Treat each contact pair separately; one aggregate movement count loses the obstruction. |
| 224 L | Only M0 is withdrawn; M1/M2/M3 remain in their input-208 positions. | Frozen walking now reaches (7,1), which supplies the next executable downward bar input. |
| 228 D | P=(7,1), I=(7,2) on M1; C=(14,2), T=(14,3) on M3. | M1 has changed from released blocker to tool. Lateral contact lowers M3; input 229 repeats the motion and the player reaches the eastern doorway at 241. |

Each named contact satisfies I=P+d and C+d=T at z=0, with the primary input on the named tool and complete translations of both groups. The state file supplies every pre/post member rather than relying on the anchor shorthand above. The southern doorway remains walkable in the final state.

## Structural functions and counterfactual scope

M0's head provides several input faces and an internal stance, while its stem reaches contacts away from that input. Those same cells later restrict access around the work area. M2's offset lower end reaches below M1 while its upper end admits an upward push on accessible floor. M1's full-width body first obstructs the southern connection, then supplies remote working reach at the eastern wall. Its nub provides a lateral input face when the far end has no external pushing stance. M3's wall-adjacent position makes the direction and recovery of the last contact matter.

The [checks](official-fxg-checks.json) replay both endpoints, retain the final south route, reject a wrong contact-pair observation, and compare selected states before/after M0 clearance. Initially neither requested doorway is reachable by walking alone. Walking after the selected first rear lift also cannot finish the eastern endpoint. The 149/159 and 208/224 comparisons establish selected-state changes in usable input access, with other groups fixed; they do not quantify over every earlier history.

No exhaustive all-history role/contact/preparation exclusion was completed for FxG. Accordingly no exact parking pose, universal withdrawal direction, number of reversals, unique action order, necessary individual group, or global shape minimality is claimed. GxE/FxE exclusions remain specific to those cases. Use a compatible complete-goal observer and restrictions when making stronger claims for a new authored map. Passing this scoped case regression does not certify all default complex-authoring obligations.

## Transferable contribution

`ht-shared-clearance` records a tool's changing spatial role: the footprint that performs a contact may later prevent access to another input; move or withdraw it so that a real next operation becomes available. The two selected access controls substantiate this relation. `ht-passage-handoff` records continued work across distinct passage objectives: a released blocker becomes a tool, and the earlier route must remain usable or have a verified recovery. The uninterrupted two-door witness substantiates this realization.

Combine these with `ht-remote-contact`, `ht-operable-docking`, `ht-continued-work` and `ht-tool-role-transition`. Derive a new room's complete objective, interaction roles, future stances, competing footprints, support, docking and withdrawal before fixing geometry. Shapes, coordinates, exact number of objects and the two-door count are case-specific. No new map was generated in this update, so it makes no independently tested transfer claim.
