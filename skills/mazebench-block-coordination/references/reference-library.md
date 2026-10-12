# Cross-case reference library

The library contains two independent official rooms under the same pinned movement rules and three stable relation IDs. BxC extends the possible realizations; it does not replace BxB or make joint pushing mandatory. Use this comparison to choose functions before geometry. Full state, provenance and controls remain in [BxB](official-case.md) and [BxC](official-bxc-case.md).

## Shared relations and different realizations

| Relation | BxB | BxC | What to preserve |
| --- | --- | --- | --- |
| prepare-next-shield | At inputs 12/19 the player arrives at the input side of an initially placed next shield. | Inputs 35-39 place the future working shield; 40-43 reconnect to the other block and use it to create the approach; 44 performs the handoff. | Tool position, reachable player stance and an actual legal next push must agree. |
| independent-or-chain-motion | Every blue-moving input moves one group; only the role transitions are handoffs. | Inputs 15-23 and 31-32 move two distinct groups through actual contact, then individual motion separates their jobs. | Choose transport mode by downstream use; preserve group identity and verify real contacts and full-body movement. |
| retain-or-release-tools | M0/M1 stay parked after handoff; M2 is reused after changing input side; M3/M4 remain unused. | M0 waits in a useful placement while M1 supplies access, then M1 stays parked; the final tool is left before walking to a free door slot. | Retention means future usability, including while stationary. Release is justified by the complete remaining route. |

The cases jointly support an operation-centered design model: current shielding must connect to a usable next input. They do not require every case-specific transport, return or handoff event in every new layout. Distinguish how a tool becomes available, how it is transported and how the player continues after using it. These choices describe different aspects of the plan. A combination not witnessed here needs its own verification.

## Strongest evidence and its boundary

| Evidence | Supported conclusion | Unsupported extension |
| --- | --- | --- |
| Both complete ordinary routes, with full actors and explicit door goals | At least one route completes each original objective through the reported operations. | Shortest route, unique order or new-map reliability. |
| BxB selected-state probes at 12/19 | The next shield is usable from those reached states. | Every legal alternative from those states is excluded. |
| BxB full-goal freezes of M0/M1/M2 exhaust 15/344/367 states | Each named group must move under that map, initial state, endpoint and exact exclusion. | Every block is required; the particular route/order is required; the result transfers to BxC. |
| BxC seven actual-contact and movement assertions | Joint delivery and subsequent individual movement occur in the witness. | Permanent binding or globally necessary joint movement. |
| BxC paired ordinary branches from step 35 | With matching player/M1 positions before the final R, preparing M0 changes that input from blocked to legal. | All possible first-contact histories need this preparation. |
| BxC freeze-M0, freeze-M1 and forbid-joint-motion searches reach their limits | The checks did not resolve the full-goal exclusions. | Impossibility, necessity or difficulty inferred from timeout. |

Historical checks retain their original search counts and fingerprints. Fresh runs belong in separate output directories; a new replay does not retroactively strengthen an old unknown result.

## Role changes explain the mechanism

In BxB, the functional sequence uses M0, then M1, then M2; M2 continues through a change of pushing side before final release. In BxC, the same pair first travels together, then divides into a prepared working shield and an approach shield. The working shield remains retained while stationary. The player later reaches its input side using the approach shield and finishes through clear ground.

These are different realizations of continued input access. Requiring all tools to travel together would erase BxB's evidence. Treating every stationary tool as released would erase BxC's preparation. Counting every return as a stage would overstate the mechanism: BxC's input-28/29 D,U pair returns to the same state and is not a new causal dependency. Preserve the recorded witness as evidence without turning such route choices into design requirements.

## Selection and future additions

Choose BxB to study direct handoffs and same-tool reuse; choose BxC to study shared delivery, separate placement and a later approach by another tool. Read [difficulty](difficulty.md) for the qualified structural comparison. Both use single-member blue groups at one elevation. The source handles full group membership, but a larger shape, different support arrangement or combined physics profile requires fresh evidence.

For later additions, preserve the three IDs and source-qualified families in the [catalog](reference-catalog.json). Record the new case's human focus, full objective and ordinary route, then determine whether it corroborates a relation, adds a conditional realization or changes the mechanism. Compare complete objectives before revising grades. No authored variant or independent transfer test is included in this library.
