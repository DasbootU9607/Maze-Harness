# Reference cases and verified distinctions

Coordinates are zero-based `(x,y)` room cells; all listed actors are at `z=0`. Actions are world directions: `U` decreases `y`, `D` increases `y`, `L` decreases `x`, `R` increases `x`. Routes below are verified solutions, not claims of shortest solutions. Exact cells and contracts live in [examples](../examples/).

The user's later [saved HxH reconstruction](reconstruction.md) is packaged separately with its own objective, 26-input/two-push witness, and exclusions. Its changed approach and terrain distinguish it from both the full room and sealed extraction below. [Planning depth](planning-depth.md) explains what to reuse when a more involved room is requested.

## Official HxH and its sealed extraction

The screenshot mechanism is the upper-left region of official room `level_HxH`, file `games/maze/levels/mygl8anih8.txt` in MazeBenchEngine. The upper staircase is `M4`: `(5,1),(4,2),(5,2),(3,3),(4,3),(3,4)`. The lower staircase is `M3`: `(5,3),(6,3),(4,4),(5,4),(3,5),(4,5)`. The gem is `(1,3)`.

The upper staircase initially transmits an attempted northward lower-group push into the roof at `(5,0)`. Moving `M4` west disengages that contact. The resulting visible gaps still do not provide a complete gem route. The player goes around the east side, raises `M3`, and then follows the newly cleared southern strip into the gem pocket. The notch at `(2,2)` prevents a further westward upper-group translation.

The full official room also contains other groups and approach work. The official engine solved and replayed this 56-action route, expanding 2,906 states:

```text
ULLLLUUUURRRRRRRRDDRRUULUUUURUULLLLLLLULLRRDDLUDLDLLLLUU
```

At step 40 the player reaches `(6,2)`; step 41 moves `M4` west, step 47 moves `M3` north, and step 56 collects the gem. See [full-room replay](../evidence/official-full.json).

The full room spawns the player at `(8,14)`. The supplied images match successive local arrangements at steps 40, 41, and 47 by geometry, rather than a pixel-difference test. Their player cells are `(6,2)`, `(5,2)`, and `(6,3)`. Before the west shift, lower cells `(5,3)` and `(4,4)` hit upper cells `(5,2)` and `(4,3)` during an upward attempt; upper cell `(5,1)` then meets roof `(5,0)`.

The `official-staircase` fixture retains original cells in rectangle `(1,1)` through `(7,5)`, seals the surrounding region, removes unrelated objects, and starts the player at the replay's step-40 position. It is a **reference extraction**, not a new design and not the unchanged full room. Its route is `LRRDDLUDLDLLLLUU`: upper-west at step 1, lower-north at step 7, gem at step 16 (50 expanded states).

For the extraction, freezing either group, preserving the pair's relative offset, or forbidding either key direction exhausts without a solution. A first-event prefix check also requires upper-west preparation before lower-north. These necessity claims are scoped to the sealed extraction. [Verification](../evidence/official-staircase/verification.json) and [wall controls](../evidence/official-staircase/controls.json) separate those results from full-room replay evidence.

Deleting roof cell `(5,0)` admits the otherwise blocked group push from identical actor positions. The altered extraction also solves with upper-west forbidden: `RDDDLLUDLLLUUL` (14 actions, 37 expansions). This links the roof to the preparation requirement; it does not establish global wall minimality. Fresh official-renderer screenshots of the extraction show the three arrangements: [initial](../evidence/official-staircase/step-00.jpg), [upper shifted](../evidence/official-staircase/step-01.jpg), [route opened](../evidence/official-staircase/step-07.jpg).

## Pocket Shutter

The working chamber lies inside `(3,3)` through `(9,9)`. `M0` is an inverted U pentomino: `(5,4),(6,4),(7,4),(5,5),(7,5)`. `M1` is an east-facing pocket pentomino: `(7,6),(8,6),(7,7),(7,8),(8,8)`. Player `(8,7)`, gem `(4,8)`.

The player begins inside the pocket. Its crosspiece and prongs initially prevent a walking escape; shifting it west exposes the opening to the central chamber. Its attempted upward motion still meets the upper shutter, whose roof-facing edge cannot rise. The shutter's recess admits the player to a useful eastward pushing face. After the shutter moves, the pocket can rise and expose the southern gem route.

Route: `LLLRUURDDLLURDDLL` (17 actions, 79 expanded states).

| Step | Functional change |
| --- | --- |
| 0 | Player enclosed in `M1`; no walking-only solution |
| 3 | Pocket shifted three cells west |
| 7 | Shutter shifted east; pocket's northward footprint cleared |
| 12 | Pocket raised; southern route becomes walkable |
| 17 | Gem collected |

Both groups, a relative offset, and all three named translations are required under the exhaustive checks. Prefix checks require pocket-west and shutter-east before the first pocket-north opportunity. Removing only roof cells `(5,3),(6,3),(7,3)` admits a previously blocked upward push from the same actor arrangement; both groups then rise together. The altered map admits `LLLURDDLL` with shutter-east forbidden. [Verification](../evidence/pocket-shutter/verification.json); [controls](../evidence/pocket-shutter/controls.json).

## Twin Tee Passage

The working chamber again lies inside `(3,3)` through `(9,9)`. Upper `M0` is a T tetromino: `(6,4),(7,4),(8,4),(7,5)`. Lower `M1` is another T: `(4,6),(5,6),(6,6),(5,7)`. Player `(8,8)`, gem `(6,5)`, interior wall peg `(5,5)`.

The lower tee's stem supplies a side pushing face; shifting it east aligns its right arm with a future downward pushing stance. Moving the upper tee west temporarily occupies the gem cell and exposes that stance at `(7,5)`. The player pushes the lower tee south, then eventually restores the upper tee east to uncover the gem. Crossbars couple the occupied lane and available pushing faces into each rigid object.

Route: `LLLLURDRRURUULDLLLUURLDDRRU` (27 actions, 137 expanded states).

| Step | Functional change |
| --- | --- |
| 6 | Lower tee moves east into the required alignment |
| 14 | Upper tee moves west, covering the gem and exposing `(7,5)` |
| 15 | Lower tee moves south, clearing the approach |
| 21 | Upper tee returns east, uncovering the gem |
| 27 | Gem collected |

All four named directional motions are necessary somewhere on a successful route under the exhaustive restrictions. Both lower-east and upper-west are needed before the first lower-south opportunity; their mutual order is not fixed.

**Ordering counterexample:** `UUULDDDLLLURLUUU` reaches an upper-east pushing opportunity without a lower-south push. Therefore, do not claim that every upper-east event follows lower-south. The full map still has no solution with lower-south forbidden. Removing only peg `(5,5)` permits a second upper-west push from the same actor state; the altered map admits `UUULL`, bypassing lower-east altogether. [Verification](../evidence/twin-tee/verification.json); [controls](../evidence/twin-tee/controls.json).

## What these cases generalize

| Case | Necessary spatial problem | Boundary role | Useful difference |
| --- | --- | --- | --- |
| Official staircase | Disengage a blocked contact cluster before clearing a corridor | Roof arrests the cluster; notch bounds its offset | Reference movement logic |
| Pocket Shutter | Release an enclosure by first granting its full movement footprint clearance | Roof forces a separate shutter adjustment; outer walls constrain the enclosure | Changes enclosure and clearance roles, not merely silhouette size |
| Twin Tee Passage | Create an aligned pushing stance while temporarily covering the goal | Peg limits translation and access | Adds a preparation dependency and eventual restoration |

The two authored routes use independent pushes; they do not require a shared contact-transfer event. These cases demonstrate useful variation in shape roles and dependencies, not universal support for every polyomino. Named part and wall functions have local evidence; no global shape-minimality claim is made. A successful route also does not exclude other deadlocks. Recovery evidence, where present, applies only to recorded error states; an empty recovery list is not a proof of universal recoverability.
