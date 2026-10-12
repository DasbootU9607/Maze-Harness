---
name: mazebench-block-coordination
description: "Design MazeBench passages with several movable blocks whose shielding roles are prepared, handed off, retained or released to reach an exit. Uses BxB and BxC; for map authoring."
---

# MazeBench Block Coordination

Coordinate several movable gate shields so every traverse leads to a usable next input. BxB hands off among independent blocks and reuses its final shield. BxC transports two groups together, separates them to pre-position a future shield, returns through clear ground, and uses the other block to reach the prepared contact. Keep joint movement, independent movement and safe release as conditional choices justified by downstream work.

## Required reading and modes

For new authoring read [mechanism logic](references/mechanism-logic.md), then [design guidance](references/design.md). Select a compatible reference through the [catalog](references/reference-catalog.json) and [difficulty guide](references/difficulty.md). For maintenance or reproduction read the complete case and its evidence: [BxB](references/official-case.md) and [BxC](references/official-bxc-case.md). Preserve complete objectives and all original members. Record the current required document SHA256 in contract.readReceipt; this checks version consistency, not understanding.

## Derive the design

Choose the complete exit, final working shield and required input stance first. Decide whether the preceding route can reach an already available shield (BxB branch) or must first transport and place that shield, then create another approach (BxC branch). Where tools travel together, derive the actual contact line and a useful shared destination. At that destination, ensure the player can separate roles without losing the future contact or its own return stance. Make a retreat serve a concrete reapproach, then replay the prepared handoff and final safe release. Choose geometry and direction order autonomously; neither source fixes a block count or stage count. A compact request may isolate one handoff. A composed design connects preparation, executable contact and subsequent work; an unused box or repeated straight push is not a stage.

## Motion and claims

Use same-elevation occupancy to shield reactive player gates and official full-body translation rules. Contact co-motion is not rigid-group identity. The protected direction still needs full clearance/support and a reachable input stance. Read the source rule table in mechanism logic. Distinguish a complete witness, selected-state observation, exhaustive scoped restriction and unknown. Do not generalize necessity or difficulty between maps.

## Verify and deliver

Use the [empty new-map template](references/design-template.json) only after deriving roles; it contains no inherited map, stages or route. The tested helper replays official references:

`node scripts/verify-reference.cjs --repo ENGINE --family official --out NEW_OUTPUT`

Use `--family official-bxc` for BxC. Read [verification](references/verification.md) for source pinning, restrictions and limits. Deliver the chosen complete goal, relation-to-member/stance mapping and actual evidence. No authored realization was generated or transfer-tested in this package's creation. The helper is an official-reference verifier, so new authoring requires its own compatible build and causal checks. Unsupported physics and capped results remain unknown.

## Website completion in Maze Harness

Follow the destination repository AGENTS.md and docs/website.md. Completed skills and verified trials have standing publication authorization in Maze Harness. Run scripts/publish-site.cjs with the separate engine after the required checks, preserve prior cases, and check the Pages run before reporting the result live. Add actual design/build/matching verification only for an authored trial that was requested and verified. Outside Maze Harness use the destination's authorization.
