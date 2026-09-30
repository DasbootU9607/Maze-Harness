# Planning around contact

Use for a request for a challenging room. The aim is a connected problem involving recognition, preparation, usable contact, and its consequences. These are interpretations of verified maps, not recorded statements from the original author or proof of human difficulty.

## What GxE teaches

The [saved reconstruction](reconstruction.md) separates the tool from a target with a constrained tail. Geometry lets an input north of the player move a target south of the player northward. This is a spatial relationship between input and working part, not a new pulling rule.

Its 41-input witness has 13 pushes and seven compressed push runs. Independent transport is necessary before a first rear-contact opportunity. After the witness's first contact, walking alone cannot finish; both objects must still move from that state. A 43-input counterexample finishes without moving the target right, so the general lesson is to plan continued access after contact, not to require a fixed left-retreat/right-load sequence.

## Derive the stages together

Write the intended obstacle to the goal first. Then connect these questions:

| Stage | Design question | State that must remain usable |
| --- | --- | --- |
| Recognize a tool | Why can the player not make the useful target move directly? Which working part can reach it? | Full shape, support, target contact, and visible restriction |
| Prepare and dock | Which relative positions must change before contact becomes useful? What blocks a naive approach? | Full tool footprint plus a reachable input stance |
| Apply contact | Which actual contact transmits the push, and what restriction does that remove? | Resulting target pose and player escape or next stance |
| Complete the task | What still blocks passage, the goal, or another necessary operation? | Withdrawal, further target movement, or another verified route |

Stages may overlap. For a challenging room, require a concrete dependency across stages: a stance opened by prior preparation, a working bay that must later be vacated, or a moved target that changes the next available pushing face. A distant initial tool plus an otherwise unconstrained docking walk is a weak substitute. Use constrained transport for helper-dependent delivery when that is the desired challenge; more groups are not automatically better.

Derive P, I, C, T, and d at the critical contact and inspect the entire rigid footprint along the approach. Check the route to the pushing face after docking and the route out after use. If an intended extra phase is unnecessary, either remove it or change the actual spatial conflict. Do not force a compass sequence solely to match the reference.

## Validate planning claims

- Use the task's real objective. GxE has no gem: check arrival at the declared passage endpoint. An empty-gem `isSolved` result would certify nothing useful.
- Separate a complete solution, a qualifying contact, contact necessity, and preparation necessity. Use [first-event searches](rules-and-validation.md#first-event-prefix-search) for claims about preparation before first use.
- Freeze objects or exclude named directions when claiming they are required. A route that still solves is evidence against the claim, even if it differs from the intended solution.
- Test continuation from recorded contact states. State-specific failure of walking-only completion does not establish the same property for every possible first-contact state. Broader claims need broader enumeration or an appropriate event/state model.
- Declare direct tool contact versus a relay before selecting a checker. A helper pushing the tool can be a legitimate different design. The direct-input observers cannot certify all relays; use a corresponding contact-chain check rather than mislabeling a bypass.
- Keep a compact sequence of functional changes alongside the full route. Repeated pushes, solver expansions, and input count are not a difficulty score. Record which dependencies survived exclusions and which remain hypotheses.

For human review, show the unplayed room first. Observe whether players identify the useful working part, anticipate the required stance, and plan beyond the initial contact. Keep their hints, failed plans, and completion observations separate from engine correctness. Without player evidence, report an intended challenge with verified structural dependencies.
