# Combining a boundary-stagger mechanism

Publish a small mechanism contract alongside each map. Use actual object IDs and coordinates chosen for that task; do not make the example IDs or directions global requirements.

| Interface field | What to record |
| --- | --- |
| Preconditions | Entry cell and elevation; independent groups and initial footprints; required fixed walls, floor support, and reachable first pushing face |
| Occupied region | Initial footprints, every intended destination footprint, player circulation space, and boundary cells that enforce the dependency |
| Objects | Rigid-group IDs and roles; which objects may be shared with the next mechanism |
| Postconditions | A reproducible reachable end state: opened route or stance, final group footprints, player access, and goal state |
| Preserve | Floor support, final passage, future pushing faces, and any object mobility needed later |
| Side effects | Temporarily covered goals, blocked return paths, movement into adjacent regions, newly available bypasses, and ID collisions |
| Evidence | Official solve/replay plus event, restricted-search, boundary, and recovery records appropriate to the claims |

The example contracts in [examples](../examples/) expose these fields. Their postconditions describe recorded successful states; they do not promise that every solution ends in the same arrangement or that every displaced object remains reusable.

## With the existing hook-transfer skill

The companion [mazebench-hook-transfer](../../mazebench-hook-transfer/SKILL.md) builds shape-dependent contact transfer. A boundary-stagger mechanism may open a pushing stance or transport lane needed by a hook mechanism; a hook mechanism may reposition an obstruction before boundary staggering becomes possible. This is a composition opportunity, not an already validated combined level.

Keep the two event definitions distinct. Boundary staggering can succeed by moving groups independently to change clearance; it does not require a hook. Shared movement does not by itself establish the hook skill's shape-dependent function. If the same pair performs both roles, record the separate events and the transition between their required states.

MazeBench group IDs are not descriptive labels: cells with the same rigid-group ID move as one object. Allocate from the official supported IDs and check existing uses before combining rooms or copying objects. Renaming an ID must update contracts and verification roles as well as map cells. Adding a same-ID object in another part of the active room may invalidate all prior movement checks.

## Revalidate the combined map

Replay the full route from the actual combined entry state. Check mutual blocking, support, every required pushing stance, goal access, intended return travel, and preservation of objects needed later. Search for routes introduced by extra entrances or wider boundaries that bypass either mechanism. Run necessity restrictions against the combined goal; passing two isolated rooms does not establish combined necessity or even solvability.

Use this skill's planar verifier only where its contract applies. A composite introducing height changes, unsupported spans, extra interactive modules, or new group relationships needs checks that observe those mechanics correctly. Report any capped or unsupported check as unknown. This skill supplies a mechanism and its interface; room organization, a whole-world campaign, and model evaluation remain separate work.
