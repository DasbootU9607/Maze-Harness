# Active transport and docking: rear-hook bridge

This is one C6 bridge case. C6, M0/M1, two-axis transport, z1, a rear event, and a lift are case choices, not permanent skill requirements. Coordinates are zero-based, x right, y down, z at bottoms/feet.

## Geometry

The 16x16 board defaults to `['.','#','#','#'].join('+')`. Open a z1 deck with `.+#` at x1..6/y4..10 and `(7,4),(8,4),(7,5)`, then place:

| Part | Initial cells / tokens |
|---|---|
| C6 M0 | `(2,6),(3,6),(2,7),(2,8),(2,9),(3,9)`, each `.+#+M0` |
| M1 | `(6,7)`, `.+#+M1` |
| Player | `(1,10)`, `.+#+p` |
| Gem | `(6,3)`, `['.','#','#','G'].join('+')`, z2 |
| Unwalkable rear-contact cell | `(6,8)`, `+` |
| Bottom stops | `(5,9),(6,9)`, three-layer walls |
| South slope | `(8,5)`, `.+#+Sd#` |
| High platform | `(8,6)`, `.+#+#`, top z2 |
| Raised Lift | `(7,6)`, `.+#+L`, base z1 |

The hole south of M1 prevents the player from directly pushing it north. The tool's rear tip can enter that cell while its spine remains supported. Bottom walls prevent insertion at the wrong longitudinal position and an ordinary push from the tool's bottom. The player reaches the high platform via the slope, lowers the lift to obtain the same-height input stance, transfers the load, returns to raise the lift, and crosses the resulting box-top bridge.

## Ordinary replay

`RULUUUURRRURRRRDLLURDLLUURU`: 27 inputs / 2205 expansions.

| Phase | Input | Player | Tool spine / top | Target |
|---|---|---|---|---|
| Separated | 0 | `(1,10,1)` | x2 / y6 | `(6,7,1)` |
| Independent preparation | 2 U | `(2,9,1)` | x2 / y5 | Unchanged |
| Docked | 8..10 RRR; docking established at 10 | `(4,5,1)` | x5 / y5; input `(6,5,1)`, rear `(6,8,1)` | Unchanged |
| First rear transfer | 19 U | `(6,5,1)` | x5 / y4 | `(6,6,1)` |
| Complete | 27 | `(6,3,2)` | Unchanged after use | Remains a z2 bridge top |

From the docked state, freezing the groups still allows `URRRRDLL` to `(6,6,1)`, followed by U to trigger the real event. This distinguishes visual alignment from usable docking. Initial geometry has no rear-contact candidate, not merely a player standing far from one.

## Necessity evidence

Use the first-event prefix method in [validation rules](rules-and-validation.md). A positive control reaches the first-event boundary after 18 inputs. No untracked history flags are added to official solver states.

| Deleted transition category | Exhausted expansions, no route |
|---|---:|
| Any rear transfer, full objective | 2463 |
| Any independent preparation before first rear | 74 |
| Independent tool preparation before first rear | 150 |
| Horizontal tool preparation before first rear | 600 |
| Vertical tool preparation before first rear | 450 |
| Entering docking geometry before first rear | 2388 |
| Any tool motion, full objective | 150 |

Disabling lowering, raising, or load-top walking also exhausts without a solution. Freezing box motion after transfer still permits completion. With M1 fixed, its south stance `(6,8,1)` remains unreachable after 1177 expansions. These conclusions concern this sealed map and the declared events.

Historical controls: `RUU` is recoverable and must not be called a deadlock. `RRRUUUUL` strands the spine at x1; the required return stance is the high wall at x0. Search exhausted 600 states; Undo allows completion. Removing the initial rear tip `(3,9,1)` produces another 35-input solution because changed clearance enables a different bridge. This is a preserved counterexample to shape-minimality claims, not a bypass on the original map.

This skill includes `examples/active-docking/world.json`, contract, observer, and case-specific validator. From the skill directory, import via `scripts/build-example.cjs`; verify with `examples/active-docking/verify.cjs --repo ENGINE --out OUTPUT`. The validator retains this case's z1 and M0/M1 assumptions. New geometry requires new preparation and bypass checks.
