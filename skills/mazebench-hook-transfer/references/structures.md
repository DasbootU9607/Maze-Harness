# Two predocked compositions

These examples start already docked. They establish module interaction and post-transfer function, not active transport or docking. The active revision is in [active docking](active-docking.md). Geometry and causal checks here are case-specific. Baseline engine: `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe`.

The legacy three-case chain is `release -> retreat tool -> shift load -> open passage`. These examples change the load into a persistent button weight or a bridge member. Both remain solvable with all box motion prohibited after transfer, unlike the legacy post-transfer states. Area and input count are not difficulty evidence.

## Shared contact geometry

M0 C6: `(5,5),(6,5),(5,6),(5,7),(5,8),(6,8)`; M1: `(6,7)`; stance: `(6,6)`. U pushes the input `(6,5)`, while the rear member `(6,8)` contacts the load behind the player. Both move y-1; M1 reaches `(6,6)`. This is northward planar translation, not vertical lifting. Repair-plate uses z0; elevated-bridge uses z1. Afterward the player exits the cavity through `(7,5)`.

## Repair and Hold: `repair-plate`

Dependency: `floating floor fills hole -> stance becomes reachable -> rear transfer leaves load on button -> persistent gate opening -> gem`.

- Default one-layer walls; slot x5..6/y4..8, courtyard x8..10/y5..8, side exit `(7,5)`.
- Shared boxes at z0. Button `(6,6)` is `.+o`; hole `(7,6)` is `+`; Floating Floor `(8,6)` is `.+f`; player `(9,6)`.
- Orange Wall `(9,9)` is `.+O`; gem `(9,10)`. The exit requires the gate. The player can temporarily press the button but needs the load to hold it after leaving.
- The floating floor is consumed while filling the gap. This is intended terrain change, not an invalid initial actor. No tool-retreat step is required.

Verified route: `LLLURDRDDRDD`, 12 inputs / 85 expansions. Input 1 fills the gap, 3 reaches the button stance, 4 transfers M1 onto it; the remaining steps only walk.

| Prohibited transition | Result |
|---|---|
| Rear transfer | Exhausted unsolved, 79 |
| Hole filling | Exhausted unsolved, 64 |
| Load reaches button | Exhausted unsolved, 79 |
| Any box movement after transfer | Solved and replayed, 12 inputs / 85 |

Without hole filling, stance `(6,6,0)` is also unreachable (64 exhausted). This establishes the ordering, not just separate event necessity. Keep that causal condition and persistent load pressure when changing the entry, exit, or tool. Adding a button changes the whole room's gate requirement.

Historical deadlock: `DLU` strands the floating floor north of its useful route; 25 states exhausted. Undo allows `RULLLURDRDDRDD`. Browser recovery was checked; not every bad state was enumerated.

## Lower, Transfer, Bridge: `elevated-bridge`

Dependency: `slopes reach high platform -> lift lowers -> low stance becomes available -> rear transfer supplies bridge -> lift raises -> walk box tops`.

- Place shared M0/M1 on `.+#` decks with `.+#+M0` and `.+#+M1`: bottoms z1, tops z2.
- Raised Lift `(7,6)` is `.+#+L`, base z1; east platform x8..11/y6 is `.+#+#`, top z2.
- Player `(11,9,0)`; north Black Ice Slopes `(11,8)`=`.+Su#`, `(11,7)`=`.+#+Su#` provide the legal approach.
- Gem `(4,6,2)` uses `['.','#','#','G'].join('+')`. Critical slot walls are three layers; `(7,5)` returns at z1. Other interior cells are air with sealed boundaries.
- Initially `(6,6)` has a z1 deck but lacks a z2 bridge top. The transferred load provides it; the tool's top at `(5,6)` connects to the gem platform.

Verified route: `ULLLLLURDLLL`, 12 inputs / 20 expansions. Input 1 traverses the slopes to `(11,6,2)`; 5 lowers the lift; 6 reaches `(6,6,1)`; 7 transfers both groups at z1; 8 R and 9 D return to raise the lift; 10..12 cross load top, tool top, and gem at z2. There is no jumping, cross-layer push, or group self-lifting.

| Prohibited transition | Result |
|---|---|
| Rear transfer | Exhausted unsolved, 12 |
| Player height change | Exhausted unsolved, 4 |
| Lift lowering | Exhausted unsolved, 8 |
| Lift raising | Exhausted unsolved, 13 |
| Walking onto load top | Exhausted unsolved, 24 |
| Box movement after transfer | Solved and replayed, 12 inputs / 20 |

Without lowering, the stance is unreachable (8 exhausted). The validator checks rigid relative xyz, actual contact height, player elevation, lift events, and load-top transitions. It does not remove the old z0 assertions and pretend arbitrary 3D compatibility. Changing lift initial state or substituting a static bridge changes the structure and requires new checks.

## Unverified direction

“Borrow a bridge, then remove it” could first use the load as support to reach a far pushing stance, then transfer it into a button role while preserving a return route. This would add a real order and support dependency. No complete authored/solved case is supplied; do not count it as verified diversity.

Use `build-structures.cjs`, `draft-io.cjs`, and `verify-structures.cjs`. Both named builders reproduce known layouts. The source engine and old cases are preserved. Capped search remains unknown; restrictions delete analysis transitions, not delivered game rules.
