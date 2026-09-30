# Compose contact transfer with other mechanisms

Define the interface before combining layouts:

| Field | Record |
| --- | --- |
| Input | Player entry/elevation, full tool and target poses, support, satisfied mechanism states |
| Space | Swept footprints, docking bay, player circulation, withdrawal and return routes |
| Roles | Actual rigid-group IDs and any objects shared between stages |
| Output | Reachable post-contact arrangement and executable next action |
| Preserve | Goal access, future pushing faces, support, and mobility needed later |
| Side effects | Temporarily blocked lanes, newly exposed entrances, changed module state, ID collisions |
| Evidence | Full solve/replay, useful contact, declared exclusions, and remaining uncertainty |

Constrained transport can supply the tool and its reachable input stance. Boundary staggering can release a transport lane or expose a pushing face. These are optional companion concepts, not dependencies required to install this skill.

Cells sharing an M ID belong to one rigid group. Allocate IDs deliberately, including when one group serves several roles. Adding a same-ID cell changes the whole footprint and may invalidate old clearance checks.

Replay the combined room from its actual start. Recheck mutual blocking, support, all required stances, post-contact withdrawal, and any return route. Added space can create a direct-push or walking bypass. Run necessity restrictions against the combined objective; two isolated successes do not establish combined solvability or necessity.

Use a checker whose profile matches the composition. The supplied contact observer covers direct same-height unit translation, while the plate verifier imposes additional task conditions. Extend and validate the event/state model for extra groups, relays, layers, or new outcomes.
