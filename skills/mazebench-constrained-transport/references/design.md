# Deriving transport from tool use

Read [Mechanism logic](mechanism-logic.md) first for new layouts. Derive user goal -> roles and relations -> player stance/contact -> shape, connection, support, and clearance -> layout -> full-goal verification. Explain this map's realization of each chosen inherited relation; source shapes and coordinates are regression evidence, not starting geometry.


## Minimal design record

Record the following relationships before assigning cells; a fixed silhouette is unnecessary:

- **Task change:** Which obstruction, stance, or object placement changes so the player can collect the gem?
- **Tool function:** Which contact point, offset, support, or footprint does the tool provide? Why cannot the player's body perform the same action?
- **Delivery condition:** Complete tool footprint and elevation, reachable pushing stance, input direction, and required target/helper states.
- **Transport restriction:** The exact step blocked by a wall, void, other group, or absent player stance. Different stages may have different restrictions.
- **Enabling change:** Which group moves first, what clearance or stance it releases, and how the player and helpers can continue afterward.

A working position is a joint condition on tool and player. Common failures include a tool passing a narrow opening while leaving the player on the wrong side, and a tool aligned with its target whose other member collides with a wall during the push.

## Choose geometry

Derive rigid shapes from functional cells:

1. Identify the part the player pushes and the part that contacts the target.
2. Connect them into a complete shape with clearance for the entire translation.
3. Give each transport-related protrusion, recess, or change in width a specific contact, parking, or stance role.
4. Check support with the official engine. One verified overhang does not establish other directions, spans, or heights.

Bars, L shapes, staircases, and other connected shapes are candidates. Camera movement does not grant objects rotation. A shape working in a layout does not prove that it is the only possible shape.

## Connect transport stages

Describe a stage as current configuration, blocked action, preparation, tool movement, and next stance. A configuration includes the player and every relevant group.

- **Temporary parking:** The complete shape fits, and a pushing face remains available for later extraction.
- **Clear and restore:** A helper first clears the route, then returns to a position useful for force transfer or access to the next stance.
- **Change sides:** A continuous player route connects consecutive pushing faces. Distinguish walking-only access from access that needs additional pushes.
- **Propagate contact:** Record actual contacts and every affected group when one push moves others. Shared motion alone does not establish shape functionality.
- **Connect stages:** The actual previous endpoint must satisfy the next stage's requirements, including neighboring objects and return paths.

Use only the methods the task needs. Extra walking distance does not substitute for a preparation dependency.

## Compose with other mechanisms

`boundary-stagger` helps derive how a fixed boundary and relative offsets release a move; this skill follows the tool through several configurations. `hook-transfer` helps derive how contact geometry changes an effective pushing location; this skill makes its tool and player prerequisites reachable.

A short composition record should include:

| Field | Record |
| --- | --- |
| Input | Player entry and elevation, initial tool/helper states, satisfied mechanism states |
| Roles | Actual IDs and complete shapes; one group may serve several stages |
| Space | Swept footprints, player circulation, parking, and required support |
| Output | Replayed delivery state, player pushing cell, and executable next action |
| Preserve | Opened route, objects needed later, support, and pushing faces |
| Side effects | Occupied neighboring routes, merged IDs, bypasses from extra entrances, blocked return paths |
| Evidence | Map/engine fingerprints, witness, exclusions, passed and unknown claims |

Cells with the same ID form one rigid object, so check ID collisions when composing. Do not simply concatenate two action strings. Built-in checks apply to the declared single-room configuration; changed entries, walls, objects, or goals require revalidation.

## Revise from observed failures

| Failure | Check first |
| --- | --- |
| Player can pass, tool cannot | Complete tool and contacted-group destination footprints |
| Delivered tool cannot be used | Pushing face, stance connectivity, and clearance ahead of tool/target |
| A helper cannot be restored | Its next pushing face, wall corners, and its own circulation route |
| A frozen helper still permits collection | The returned bypass; the helper may be decorative or the dependency claim false |
| Collection remains possible without the declared use | Alternative contacts, direct target pushes, another entrance, or another tool use |
| Necessity search hits its cap | Mark unknown; preserve the witness, increase the budget, or simplify demonstrated redundancy |

Revise the cells or relationships responsible and rerun checks. Do not hide the gem, prescribe a route by fiat, or add unrelated obstacles to claim a mechanism is necessary.
