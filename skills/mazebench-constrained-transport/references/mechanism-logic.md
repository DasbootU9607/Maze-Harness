# Constrained Transport mechanism logic

Read this extraction first for new authoring. Its source is the complete upstream official GxF case. Consult [the full analysis](official-case.md), [states](official-states.json), and [checks](official-checks.json) for detailed evidence or physics questions. Maintaining this document requires complete case analysis. [The original design](official-design.json) is regression material; [the empty contract](design-template.json) is the new-authoring scaffold.

**Necessary in the case** means the named restriction exhausted; **witness choice** describes one replay; **selected state** has only local scope; **unconfirmed** needs another intervention. No source search establishes a new map's necessity or a unique action order.

## Roles and interactions

### ct-usable-delivery

The player, tool, helpers, and target form a joint working configuration. Delivery requires reachable input stance P, input member I=P+d, working member C with C+d=T on the target, matching elevations, and a legal next ordinary action. The input and working ends may occupy different columns; joint motion alone does not prove offset force transfer.

**Selected state:** input 208 aligns M0 but not the player; at 210 P=(4,10), I=(4,11), C=(3,11), T=(3,12), d=D. Inputs 211/212 translate both full groups across a void-constrained contact. [States 208/210/211/212](official-states.json) and [case contact analysis](official-case.md) separate alignment from operability. **Necessary in the case:** actual side transfer and all four groups, as established by [contact and freeze restrictions](official-checks.json).

## Movement preconditions

### ct-shared-clearance

Plan complete tool/helper destination footprints, support, propagated contacts, and reachable pushing faces. A tool path must also preserve the player's route between faces and the next workspace's access. Check supported overhang with the official engine; a successful span does not license arbitrary suspension or heights.

**Selected states:** at 106, the tool and helper jointly admit an upward push from (9,10); at 149 and 172, helper reconfiguration changes the available downward passage. [Full members, walking regions, and legal probes](official-states.json) establish those opportunities. **Witness choice:** these particular poses and player paths are not a required transport corridor for every new design.

## Structural functions

### ct-input-work-support

An input end supplies a usable player face; an offset working end contacts the constrained target; connecting material preserves rigid identity, support, and clearance. Helper protrusions or recesses may reserve a bay, block a lane, or expose a later face. Derive these parts after defining the input/contact relationship.

**Selected state:** the two-cell tool separates input and working columns; other members provide support while the working end overhangs the void. The L helpers' ears compete with the tool's complete width and player circulation. See [members and void analysis](official-case.md#complete-initial-rigid-group-members). **Unconfirmed:** the package does not prove two L helpers, a two-cell bar, each helper ear, or the exact void strip to be unique or minimal.

## Causal dependencies

### ct-recovery-and-reuse

Preparation changes shared clearance or input access; transport establishes operable delivery; recovery/reuse restores access needed by later work. Temporary parking needs a reachable extraction face. Retreat or opposing-direction motion must release a real progress opportunity, not merely undo itself.

**Necessary in the case:** independent tool preparation precedes first usable contact or goal; the [positive and restricted prefix checks](official-checks.json) establish this. M0/M1 need opposing directions, while M2-L/R are necessary and M2-U/D avoidable. **Witness choice:** M1 returns upward at 45, the tool rises at 126/155, and helpers reuse the upper space at 149; [case analysis](official-case.md) describes their functions. Direction exclusions do not prove these exact returns, a fixed reversal count, or that they occur in that order. Ordered reuse requires the new map's history-aware check. **Unconfirmed:** an exact parking pose is not automatically necessary.

## Allowed variations and verification obligations

Keep purposeful tool use, complete-body transport through competing space, changing reachable pushing faces, recoverable preparation/reuse, real member contact, and usable delivery. Choose new shapes, helper count within the profile, bays, circulation, support spans, task placement, and preparation methods. The case's four groups, all-direction motion, coordinates, route length, and two L silhouettes are implementation choices.

Map each chosen relation ID to actual initial members and boundary/passage/stance cells in `inherited`, then declare the new conflicts and event opportunities. Check completion, all necessary roles, actual transfer, independent preparation, opposite directions at genuine progress, history-aware reuse, and post-contact work. Use [complex verification](complex-validation.md); preserve counterexamples, support limits, and unknown results. Separate contact loss from support, clearance, or access changes during part interventions.

Re-deriving spatial relationships does not require new physics or an invented mechanism. A shift, reflection, renamed object, longer route, or single-cell edit alone is not evidence of substantive change. Explain the changed transport/access/recovery realization and limit conclusions to the verified application.
