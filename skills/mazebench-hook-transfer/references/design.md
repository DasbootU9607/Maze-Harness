# From function to contact geometry

Read [Mechanism logic](mechanism-logic.md) first for new layouts. Derive user goal -> roles and relations -> player stance/contact -> shape, connection, support, and clearance -> layout -> full-goal verification. Explain this map's realization of each chosen inherited relation; source shapes and coordinates are regression evidence, not starting geometry.


Begin with the change needed at the target, then derive the tool that makes it possible. Shapes and coordinates are design variables unless supplied by the user.

## Specify the working relationship

Record player stance P, player-facing tool member I, working member C, target member T, and input direction d at the critical state. `I=P+d` identifies direct input; `C+d=T` identifies destination contact at the same elevation. A lateral offset or rear contact is useful only if it solves a real access or motion constraint.

Check other target members and approach directions before claiming that the player needs a tool. A wall that blocks one pushing face may leave another face available. A remote working part should let a reachable input affect a genuinely constrained target.

Connect I and C with rigid geometry whose entire destination footprint is clear. Add a recess only when it admits a stance, a stem when it provides input access, or an offset when it reaches the constrained contact. Use official support checks throughout transport; partial overhang does not imply arbitrary suspension.

## Plan active transport and docking

Choose an initial tool pose separated from usable contact. Derive a sequence of relative configurations, checking the player's route to each next pushing face. Independent preparation changes the tool-target relationship; pushing both together or merely walking to the tool may leave the actual docking problem untouched.

Docking includes a reachable P, legal input, valid support, and clearance for every affected group. A geometrically aligned tool with an inaccessible pushing face is not delivered. After use, inspect whether the tool blocks the goal approach or the target's next operation. Reserve an exit or withdrawal route where needed.

## Use official interfaces

Write `title`, a full 16-by-16 official token array `cells`, and a mechanism `contract`; then run `scripts/build.cjs` as described in [verification](verification.md). The builder installs authored geometry and exports through official services. It does not generate a fixed silhouette.

Consult the engine's `games/maze/level_parsing.json`, `games/maze/toolbox.json`, and `docs/maze-level-format.md` for tokens. Load the saved draft with `server/app`'s `getGame/getLevelState`, create the official engine, and use its solver and ordinary moves. `contact-events.cjs` supplies observations within its declared scope; it does not replace the physics engine.

## Diagnose failures

| Failure | Inspect |
| --- | --- |
| Input moves but the working part misses | Actual contact coordinates, direction, and elevations |
| The whole push is blocked | Every destination, propagated group, overhead obstacle, and support condition |
| Docking is unusable | The player's path to P, cavity entry, and the route out |
| Contact works but preparation fails | The complete transported footprint and alternate pushing faces |
| A helper substitutes for the intended tool | Full-goal tool-freeze and contact-exclusion counterexamples |
| The checker rejects a legal design | Its goal and profile assumptions; select or adapt a matching checker |

Do not copy a button activation, fixed target direction, or stationary-before-use condition into a task with a different outcome. Define the task's observable event before choosing its checks.
