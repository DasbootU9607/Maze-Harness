# Hook Transfer mechanism logic

Use this extraction before choosing new geometry. The official source rooms are **GxE** and **FxE**. [GxE](official-case.md) supplies rear release and passage-work evidence; [FxE](official-fxe-case.md) adds a released object becoming a tool and repeated use of a span at separate targets. Consult each case's linked states/checks when details need confirmation. Maintenance requires complete analysis of the affected source. Preserve their runnable designs for reproduction/regression; start new authoring from [the empty contract](design-template.json).

Claims are labeled **necessary in the case**, **witness choice**, **selected state**, or **unconfirmed**. The first four relations below refer to GxE; the two additional relations explicitly identify FxE. Exhausted restrictions prove only their map and endpoint. GxE has a passage goal and no gem; a gem-free engine `isSolved` is not evidence of reaching it. FxE has a gem objective. Its scoped checks do not inherit GxE's necessity conclusions.

## Roles and interactions

### ht-remote-contact

The player inputs a tool member I from P with I=P+d. A different working member C reaches target member T with C+d=T at the same elevation. Rear contact places T behind P along d; lateral contact offsets T from the input line. The useful relationship is actual contact solving a constrained input problem, not a letter-shaped silhouette or two groups moving together.

**Selected state:** before input 28, P=(7,10), I=(7,9), C=(7,12), T=(7,11), d=U. The rear arm transmits the ordinary push and lifts the target tail out of its restriction. [States 27/28](official-states.json) and [case contact analysis](official-case.md) provide complete pre/post members. **Necessary in the case:** rear transfer, tool, target, and independent preparation. [Checks](official-checks.json) preserve the exclusions; use their documented role mapping when reading historical group labels.

## Movement preconditions

### ht-operable-docking

Docking is a legal next action from a reachable player stance, with full-body clearance, matching heights, and valid support for all affected groups. Independently transport the whole tool from an unprepared start; walking to pre-docked geometry is not preparation. Keep an escape or subsequent pushing face available after contact.

**Selected states:** after 20 the tool is aligned and frozen walking reaches the interior; at 27 the player actually occupies P. A right push would send the target tail into a wall; a downward target push hits the bottom edge. [States and ordinary probes](official-states.json) record these facts. **Necessary in the case:** the positive first-contact prefix is reachable and the prefix without independent tool preparation exhausts, as reported in [checks](official-checks.json). The witness's U/L/D/R transport sequence is a choice.

## Structural functions

### ht-parts-and-restriction

An input arm admits direct player input; a working arm reaches a restricted member; a connector maintains rigid identity and support; an opening supplies P and a route to it. The target's boundary-facing part makes direct operation restrictive. Every connecting cell participates in collision even if it is not a working member.

**Selected state:** the case's upper arm, left connector, rear arm, and interior implement these functions; target tail (8,14), walls (7,14)/(9,14), bottom edge, and voids at x=4..6,y=11 restrict direct alternatives. [Complete members and terrain](official-case.md#complete-initial-rigid-group-members) document that realization. **Unconfirmed:** no global part minimality or unique C silhouette is proved. Other connected shapes or lateral contact can realize remote input if their actual restriction, contact, support, and access are verified within the unchanged profile.

## Causal dependencies

### ht-continued-work

Independent preparation enables usable contact; contact changes the target's restriction; subsequent object work opens the actual objective route. A transfer that immediately leaves only walking is a compact demonstration rather than the default connected complex room.

**Selected state:** walking or freezing either group at the input-28 pose cannot complete the passage. **Witness choice:** tool-L at 29 then target-R at 31 is one continuation. A complete target-R-free counterexample is preserved in [checks](official-checks.json), so that continuation is not uniquely necessary. [Case scope](official-case.md#evidence-and-scope) distinguishes these selected states from all first-contact histories; the complex verifier's all-history walking-only and optional post-contact group checks are separate obligations. Do not upgrade selected-state freezes to universal claims.

## Additional relationships from FxE

### ht-tool-role-transition

A constrained object can first be the target of contact and later become the tool for another operation. Derive each interaction's player stance, primary input, working member and target independently. Releasing an object is useful only if the resulting configuration permits its transport, input access and subsequent work.

**FxE witness choice:** M1's offset end releases M0; M0 subsequently operates M3 and M2. The three contacts use different input/working members and preserve ordinary rigid translation. [The contact table](official-fxe-case.md#replayed-contact-and-access-chain) and [states](official-fxe-states.json) record the actual pairs. **Necessary in FxE under exhausted checks:** M1, M0 and the initial M1-to-M0 lateral contact cannot be bypassed. Other global role/contact exclusions may be capped; [checks](official-fxe-checks.json) govern their scope. The same four groups or a universal three-contact chain is unconfirmed.

### ht-recovered-span

A supported span can reach a restricted member across a gap while keeping the player's input on accessible terrain. An opening can admit the working end and allow different contacts as relative positions change. Plan withdrawal, renewed stance access and later use of another part of the same tool; actual contact must end when the groups separate.

**FxE selected states and witness choices:** the span enters M3's opening and moves its lower arm; later translation separates the groups, and further work permits upper-corridor access. The same tool's foot then contacts M2 on a row offset from the input. [Replay analysis](official-fxe-case.md) records these functions, supported overhangs and the legal loss of the starter at input 36. The starter's removal, selected reversals, exact opening, length and direction order are not established as necessary. Preserve complete footprints and official support rules; a span is not automatically a walkable bridge.

## Allowed variations and verification obligations

Keep constrained direct operation, independent transport, reachable input, actual rear/lateral member contact, full-body support/clearance, and connected work after contact. Re-derive the goal, shapes, openings, orientation, boundaries, support and parking space, initial separation, and continuation. Neither the source's exact passage coordinate nor a particular compass order is inherited.

Map each chosen relation ID to this map's initial members and boundary/passage/stance cells in `inherited`. Declare the new P/I/C/T observations, all-group motion, conflicts, and tested preparation endpoints. Verify completion, freezes, mechanism exclusion, positive/restricted first opportunities, and post-contact work using [complex verification](complex-validation.md). A change in a connector may affect contact, support, clearance, and stance reachability simultaneously; disclose each effect. Caps, exceptions, and unsupported physics are unknown.

Choose relations that serve the new goal; adding FxE does not require copying its group count, route or every relation into every map. For repeated contacts, declare each pair with the complex event selector's `tool`, `target`, and `contactKind`, then test the claimed dependencies at their actual opportunities. A legal source witness supports that realization; a capped exclusion does not establish necessity.

New physics and a newly invented mechanism are unnecessary. A translated/reflected/renamed case or one added member alone does not establish substantive variation. Explain the newly derived access/contact/preparation realization and report only the application evidence actually checked.
