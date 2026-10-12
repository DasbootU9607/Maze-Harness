# Bridge Convoy mechanism logic

The human-directed scope combines limited bridge resources with reusable gate passage and two-module transport through a change in direction. [Official BxE](official-case.md) provides a complete doorway replay and selected local controls. Design invariants below are functional goals to test in each new map, not globally proven necessities of BxE.

## Roles and movement preconditions

### allocate-bridge-after-access-plan

Roles: disconnected supported regions, consumable floor, inaccessible tool or future destination. Before consumption, identify which connection gives access to a reachable next input stance or usable tool. Push the floor into the chosen hole, then actually use the new support. In BxE, steps 1-14 create three preparation links; the retained floor from the west is consumed only at step 100. Coordinates and the allocation order may change. Verify the complete route and surviving-resource budget; no exhaustive test establishes a unique allocation.

### occupy-gate-before-entry

Roles: proximity gate, live player, same-elevation blocking actor. A blocker must occupy the gate cell when the player approaches; a merely adjacent helper does not suppress the rise. Push through and retain a reachable next stance. BxE steps 34-36 use M0; steps 55-63 use a floor. Selected-state removal controls block the next input when occupancy is lost. That is a local dependency, not a proof that this actor must be used in every complete solution.

### stage-and-recover-both-tools

Roles: independently movable blue actor, retained floor, gate lanes and supported recovery space. Stage the actors so that moving the player to another side does not strand either module. BxE steps 50-79 move the floor across one gate lane while the blue occupies another, then withdraw and recover the blue to form a northbound chain. Recovery must create an executable next joint push, not simply return to a named coordinate. Number of lanes and exact withdrawal pose can vary after validation.

### reform-convoy-for-turn

Roles: two independent modules, destination heading, accessible side stances and sufficient supported workspace. Starting from a useful chain, move the front module into a new lane and restore the player behind the rear module. In BxE, step 89 ends P (6,3), blue (6,2), floor (6,1); steps 93 and 96 translate the floor to (7,1) then (7,2); step 99 ends P (5,2), blue (6,2), floor (7,2). The next R is legal and useful. This is not rotation of a bound object. Vary geometry only with full-member clearance and a witnessed executable continuation.

### bridge-first-delivery

Roles: a gap, the floor at the front, a reusable actor behind it and player pushing access. Fill the hole before moving the reusable actor onto that cell. Step 100 consumes floor 7 at (8,2) with M0 still supported at (7,2); steps 101-104 reuse M0 across the bridge and to deliver another floor. A selected-state order swap loses the leading blue before the trailing floor fills the gap. This scopes the ordering consequence to that state and physics; it does not prove a universal solution order.

## Structural functions and dependencies

Preparation links unlock transport; gate occupancy enables entry; separate staging enables recovery; supported turning space restores a useful chain; front-floor consumption opens a durable route while preserving the reusable actor. A new design should connect these functions to its actual endpoint. Repeated pushes and walking alone do not add functional stages. Separate roles need not be different shape classes: a floating floor also holds a gate down before it is consumed.

## Variation and verification

Choose layout, directions, shapes and dimensions from functions. Do not inherit BxE coordinates, bridge count or route length as requirements. Preserve full support and contact rules and check the complete goal, including any survivor/delivery condition. Multi-height, ice, slopes, enlarged rigid bodies and true world-room transport need independent compatible verification. The source world transition transfers a player, not its local tools. No newly authored realization is included, so practical transfer remains untested.
