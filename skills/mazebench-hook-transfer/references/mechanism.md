# Official rear hook and baseline template

Coordinates are zero-based `(x,y,z)`, x right, y down, z at actor bottoms/feet. This page's authored baseline cases are at z0. They establish the basic mechanism and parameter reuse, **not sufficient structural diversity**. Engine baseline: `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe`; revalidate on another version.

## Official GxE evidence

The upstream file is `games/maze/levels/9hgghfgcsu.txt`, mapped to GxE in `world_map.json`. It is a passage mechanism with no gem. Initial player: `(13,7,0)`. M0 is the six-cell C shape `(11,8),(12,8),(11,9),(11,10),(11,11),(12,11)`. M1 is `(7,11),(8,11),(8,12),(8,13),(8,14)`.

Walls at `(7,14)` and `(9,14)` constrain M1's tail. Air at `(4..6,11)` prevents access to its southwest pushing region; the southern boundary prevents directly pushing the tail north.

Official `findReachablePositions` found a route to `(2,13,0)` after 17,907 expansions. All 41 inputs replayed through ordinary moves:

```text
DDLULLLLLLRUULDDLLDRURRRDDLULDRDDDLDLLLLU
```

- After input 20, M0 is docked at `(6,9),(7,9),(6,10),(6,11),(6,12),(7,12)`; M1 is unchanged. Supported members allow part of the tool to span air.
- After 27, the player is `(7,10)`, the input member `(7,9)` is north, and the target protrusion `(7,11)` is south.
- Input 28 U moves M0 north. Its rear member `(7,12)` contacts M1 at `(7,11)`, moving M1 north and releasing the tail from `(8,14)` to `(8,13)`. Both rigid groups remain at z0.
- Input 29 L moves only the tool aside. After 30 D, input 31 R shifts the load right, opening the x8 route.
- Input 41 reaches the passage objective.

This demonstrates docking, rear contact propagation, tool retreat, load side-shift, and passage. It is a verified route, not a universal construction recipe. `weightlessGroupMembers`, `collectWeightlessPushCluster`, and `moveWeightlessCluster` implement the actual group/contact behavior; no welding or persistent attraction is involved.

GxF (`0lzre7ixaq.txt`) supplies a different lateral-arm example; see [side reach](side-reach.md). The external engine supplies the official level files; this package does not redistribute that world or its assets.

## Conditions specific to `build.cjs`

The gap, tail stops, northward release, leftward retreat, and rightward load push are this template's choices, not engine requirements.

For docking origin `(hx,hy)`, handle height H, horizontal span S, and tail length T:

- M0 has a spine `(hx,hy..hy+H-1)` and top/bottom arms extending right 1..S cells: H+2S members. H>=4 leaves internal player/load positions; S>=1.
- Target protrusion N is `(hx+S,hy+H-2)`. M1 includes N and the tail at x=N.x+1, y=N.y..N.y+T-1: T+1 members.
- Air runs along y=N.y from the workspace's left boundary to N.x-1. The tail reaches the bottom boundary; no walkable bypass crosses it.
- Stops on both sides of the tail require northward transfer before lateral movement. Reserve transport and retreat clearance above and beside the tool.
- Put the goal below the gap, left of the tail; verify it is disconnected before use and reachable afterward.

The room is sealed and 16x16. Accepted ranges H=4..6, S=1..3, T=3..5 must fit coordinates 1..14; acceptance does not guarantee solvability. `northMargin/eastMargin` size the workspace; `upperStop` blocks excessive north travel; `pillars` add specific walls; `player/gem` set endpoints. `hookStart` changes the initial tool pose without changing the load/gap relationship. Revalidate every instance.

## Baseline results

| Case | Parameters or change | Verified inputs / expansions | No rear-transfer search |
|---|---|---|---|
| minimal | dock=(5,5), H4 S1 T3; predocked, upper stop | 10 / 78 | Exhausted, 383 |
| north-store | Same core; tool start=(8,3), player=(11,3), larger workspace | 30 / 2090 | Exhausted, 2121 |
| wide-hook | dock=(5,4), H5 S2 T4; tool start=(4,4), player=(3,5) | 25 / 1142 | Exhausted, 2989 |

All three main routes share `transfer releases tail -> tool retreats -> load shifts sideways -> passage opens`. Event indices are 1/2/4/10, 21/22/24/30, and 12/15/17/25 respectively. Ignoring walking and transport does not yield three causal structures. Freezing boxes just after transfer prevents completion from those particular states (17/58/76 exhausted expansions); this does not establish a unique order for every solution.

Historical recovery check: minimal's `LLL` puts the spine at x2 where x1 is a wall, preventing a return push. Search exhausted 134 states; undoing the last push allowed a 26-input solution. Browser Undo/Reset was checked during development, not exhaustively over all mistakes.

Portable map/spec fixtures live in this skill's `examples/`, with recorded results in `evidence/`. [Validation history](validation.md) distinguishes historical browser observations from publication-time engine replays. “Minimal” means a compact demonstration, not a proof of global minimality.
