# Optional patterns and composition

Derive requirements with [function to geometry](function-to-geometry.md), then select applicable evidence here. This is not a default template menu. Keep general rules, optional patterns, task constraints, and example coordinates separate.

## Capability boundaries

| Pattern | Verified evidence | Boundary |
|---|---|---|
| Predocked rear-hook demonstration | Minimal, repair-plate, elevated-bridge | Mechanism demonstrations; not active-docking deliveries |
| Transport then rear-transfer a constrained load | North-store, wide-hook, official GxE | Baseline and parameter reuse; the three legacy authored cases share the same final dependency chain |
| Active docking then bridge construction | Active-docking: tool/load at z1, player uses z1/z2 stances and passage | This geometry only; not arbitrary 3D contact |
| Active lateral transfer | Side-reach: a two-cell bar spans air and moves a target onto a button | Separate builder and task validator; rear-transfer is not required in this case |
| Bent lateral geometry | Cantilever Key: five-cell bent tool with a trailing input/support member | New geometry using the known lateral principle and plate outcome; not new physics or a new claimed dependency structure |
| Multiple groups and successive transfer | Official GxF: four groups; two successive M0-to-M3 lateral pushes replayed | One official example, not a general N-object relay generator |
| Retrieve and redock for a different target | Rigid IDs and temporary contact provide a mechanism basis | No authored complete reuse layout established here |
| Constraint-only recesses or arbitrary mixed-height shapes | May be considered under the functional definition | Current observers do not cover them; concrete construction remains uncertain |

Straight chain pushing is a physics control, not an additional hook pattern. There is no pulling, attraction, permanent connection, or player-controlled group rotation.

Shape/contact, object count, height, repeated use, and outcome are independently selectable dimensions with compatibility checks. Proven outcomes include releasing a blocked passage, holding a button, and supplying a box-top bridge. Repeated pushes on the same target do not establish reuse for a second mechanism. Planar evidence does not establish cross-layer pushing. Add height only for a real contact, stance, observation, or dependency role; distinguish feet, bottoms, tops, air, and overhead clearance.

## Construction and validation entry points

Paths below are relative to the skill directory. ENGINE is an existing official checkout; OUTPUT must be fresh.

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out OUTPUT
node scripts/verify.cjs --repo ENGINE --out OUTPUT --cap 300000
node scripts/build-structures.cjs --repo ENGINE --scenario repair-plate --out OUTPUT
node scripts/verify-structures.cjs --repo ENGINE --out OUTPUT --cap 300000
node scripts/build-side-reach.cjs --repo ENGINE --out OUTPUT
node scripts/verify-contact.cjs --repo ENGINE --out OUTPUT --cap 300000
```

The distribution repository also has `scripts/build-example.cjs` and `scripts/check-examples.cjs`, plus eight portable `examples/` fixtures. Those reproduce regression cases, not new-design completion by themselves. The installed skill does not depend on a developer's personal design directory.

`build-side-reach` implements a north-facing lateral socket. Length, start, socket, workspace, exit row, and role IDs are its parameters, not universal rules. Length 2..4 is an accepted input range, not a solvability guarantee. A different shape family can use a new cells function instead of extending that constructor.

`verify-contact` accepts only the active-side-reach plate contract: the target stays fixed before the first side event, which immediately presses the button. Optional `--contrast-no-rear` reproduces this case's historical no-rear comparison; do not apply it as a requirement to rear or mixed tasks. Other outcomes need corresponding goal and prerequisite checks using the observer where appropriate. Legacy z0 verification remains unchanged.

## Minimal composition interface

Attach a short table or `contract.json.composition`, not a new framework:

1. **Preconditions:** Entry region and feet elevation, accessible stances, independent IDs, button/gate state, object pose, and support.
2. **Resources:** Object roles and complete shapes, swept region, maneuvering clearance, and observation lines if relevant. A bounding rectangle is not a substitute for state-by-state collision checks.
3. **Postconditions:** Target, gate, terrain, and tool state. Distinguish the replayed route's outcome from an invariant across all solutions. Reusability must be verified separately.
4. **Preserve:** Passages, stances, loads, bridge members, and support that later mechanisms must retain. In the lateral examples, the target must keep pressing the button.
5. **Side effects:** Reusing an ID joins rigid groups; buttons affect all orange walls in the room; hole filling consumes a floating floor; moved objects can block neighboring stances or change support. Cross-room entry and progress need separate checks.
6. **Evidence:** Map identity, replay/events, necessity/preparation checks, and limitations or unknowns.

The integrator must reconcile IDs, space, buttons, gates, and objectives, then verify the complete combined start-to-goal route, mutual obstruction, entry/return, and bypasses. Do not merely concatenate action strings. Opening a new passage can invalidate a previously exhaustive no-event result.

This package contains no second verified MazeBench mechanism or world-organization skill. Do not invent one. A user-supplied room fragment or future skill can consume the interface, subject to whole-puzzle validation. A skill-writing helper is not another verified puzzle mechanism.
