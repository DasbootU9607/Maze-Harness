# Boundary Stagger mechanism logic

Read this document first for new authoring. It extracts relationships from the complete upstream official HxH case; it is not a layout or a player action sequence. Consult [the full case](official-case.md), [states](official-states.json), or [checks](official-checks.json) when an evidence or physics detail matters. Skill maintainers must analyze those complete artifacts when changing this extraction. Reproduction uses [the original design](official-design.json); new authoring starts with [the empty contract](design-template.json).

Evidence labels below distinguish **necessary in the case** (an exhausted restriction), **witness choice** (one replay), **selected state** (one configuration), and **unconfirmed** (an interpretation without the corresponding exclusion). None transfers a necessity result to a new map.

## Roles and interactions

### bs-contact-release

The player directly inputs one rigid group; directional member contact may recruit another independent group into the push cluster. A fixed boundary blocks a destination of that complete cluster. Independently offsetting one group breaks the obstructing contact, allowing the other group to work. Roles may use different IDs and shapes. Heights must agree at real contact; the supported complex profile is z=0.

**Selected state:** at input 40, M3-U contacts M4 at (5,3)/(4,4), and M4's (5,1) would hit roof (5,0). M4-L at 41 releases that cluster; M3-U at 47 opens the approach. See [case collision analysis](official-case.md), [states at 40/41/47](official-states.json), and [first-M3-U controls](official-checks.json). **Necessary in the case:** M4-L and M3-U, including the tested first-opportunity dependency. This does not prove the unique offset distance or witness order for every other move.

## Movement preconditions

### bs-whole-body-access

Account for every member of the directly pushed group and every group recruited by contact. A clear leading member or a visible recess is insufficient. The player must reach the rear face through the current frozen-object walking region, and the translation must preserve support or cause declared legal whole-group removal. Check the next pushing face after moving.

**Selected states:** walking regions at 40 and 41 contain 109 and 111 positions, yet neither gives a walking-only goal. **Witness choice:** the stance (6,4) probes the blocked upward action; other reachable faces can exist. [States and ordinary probes](official-states.json) and [engine rule basis](design.md#what-counts-as-evidence) establish full-footprint collision and support observations, not global geometry minimality.

## Structural functions

### bs-functional-parts

A contacting prong couples the groups; a boundary-facing part makes that coupling restrictive; a recess or input face lets the player apply the independent release. Connect functional parts as one rigid body with swept clearance. A connector may create a new collision or close circulation even if it never contacts the other group.

**Selected state:** the upper/lower stair members and roof implement these functions; the recess (2,2) bounds left motion. [Complete members and terrain analysis](official-case.md#complete-initial-rigid-group-members) identify their realization. **Unconfirmed:** no packaged evidence proves that six-cell stair silhouettes, that notch, or each individual member is globally necessary. Changed parts require separate contact, support, clearance, and stance comparisons.

## Causal dependencies

### bs-prepared-release

Preparation changes access to the useful release face; release changes the contacted cluster; subsequent movement opens the objective route. Each stage must make the next operation usable, including its player stance, rather than merely align objects.

**Necessary in the case:** M0 removal and both M2-R and M2-L precede the first usable M4-L opportunity under the tested exclusions. [Checks](official-checks.json) name `first_M4L_without_M0_removal`, `first_M4L_without_M2R`, and `first_M4L_without_M2L`, with a positive control and the real goal as bypass. **Witness choice:** M2-U/removal is avoidable; replayed counterexamples and optional M1 are retained in that file. Do not turn the witness's support-loss sequence into the only possible preparation method.

## Allowed variations and verification obligations

Preserve fixed-boundary restriction of a real contact cluster, independent release, reachable input, full-body support/clearance, and connected preparation and subsequent work. Re-derive group count within the supported range, member shapes, boundary orientation, circulation, parking, start, goal, and preparation method. Replacing the case's legal disposal with recoverable parking needs a newly tested causal role; it is not certified by the case.

For each chosen relation ID above, write an `inherited` realization using this map's initial members and boundary/passage/stance cells, then connect it to this map's events and dependencies. Verify legal completion, freezes, first-opportunity preparations with positive controls, and matched wall interventions at the same actor state. Record walking side effects of boundary removal. Use [complex verification](complex-validation.md) and preserve its profile/support limits; caps, exceptions, and unsupported inputs are unknown.

A new spatial implementation need not invent new physics or a new mechanism. Translation, reflection, renaming, or adding one cell alone does not demonstrate a substantive change. Explain which clearance, access, contact, or preparation relationship was newly derived; legal replay and scoped exclusions are application evidence, not proof of creativity or human difficulty.
