---
name: mazebench-block-coordination
description: "Design MazeBench passages with several movable blocks whose shielding roles are prepared, handed off, retained or released to reach an exit. Uses BxB and BxC; for map authoring."
---

# MazeBench Block Coordination

Coordinate movable gate shields by preserving the player's next executable input. A successful operation delivers both a useful tool position and access to its working side. BxB demonstrates handoffs to initially placed shields and later reuse of one block; BxC demonstrates temporary joint transport, separate preparation and another block supplying the approach. Retaining a tool means keeping its future role usable, including while it is parked. Release follows a verified continuation to the exit.

## Required reading and modes

For new authoring read [mechanism logic](references/mechanism-logic.md), then [design guidance](references/design.md). Use the [cross-case comparison](references/reference-library.md) to select supported branches; the [catalog](references/reference-catalog.json) and [difficulty guide](references/difficulty.md) record source and relative complexity. For maintenance or reproduction read the complete case and its evidence: [BxB](references/official-case.md) and [BxC](references/official-bxc-case.md). Preserve complete objectives and all original members. Record the current required document SHA256 in contract.readReceipt; this checks version consistency, not understanding.

## Derive the design

Work backward from the complete exit to useful operations, input stances, contacts and geometry. Decide separately how the next tool becomes available, whether delivery uses independent or joint motion, and whether continuation hands off, reuses the same tool from another side, or exits through clear ground. Neither room is a mandatory recipe. At every commitment, identify the next legal input and which parked tools still have work to do. Check reapproach before relinquishing a pushing side, and replay the final route around any parked shield. Choose shapes, coordinates and stage count autonomously. Compact requests may isolate one relation; composed designs connect changes of capability, not counts of walking or repeated pushing inputs.

## Motion and claims

Use same-elevation occupancy to shield reactive player gates and official full-body translation rules. Contact co-motion is not rigid-group identity. The protected direction still needs full clearance/support and a reachable input stance. Read the source rule table in mechanism logic. Distinguish a complete witness, selected-state observation, exhaustive scoped restriction and unknown. Do not generalize necessity or difficulty between maps.

## Verify and deliver

Use the [empty new-map template](references/design-template.json) only after deriving roles; it contains no inherited map, stages or route. The tested helper replays official references:

`node scripts/verify-reference.cjs --repo ENGINE --family official --out NEW_OUTPUT`

Use `--family official-bxc` for BxC. Read [verification](references/verification.md) for source pinning, restrictions and limits. Deliver the chosen complete goal, relation-to-member/stance mapping and actual evidence. No authored realization was generated or transfer-tested in this package's creation. The helper is an official-reference verifier, so new authoring requires its own compatible build and causal checks. Unsupported physics and capped results remain unknown.

## Website completion in Maze Harness

Follow the destination repository AGENTS.md and docs/website.md. Completed skills and verified trials have standing publication authorization in Maze Harness. Run scripts/publish-site.cjs with the separate engine after the required checks, preserve prior cases, and check the Pages run before reporting the result live. Add actual design/build/matching verification only for an authored trial that was requested and verified. Outside Maze Harness use the destination's authorization.
