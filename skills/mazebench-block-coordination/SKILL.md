---
name: mazebench-block-coordination
description: "Design MazeBench passages with several movable blocks whose shielding roles are prepared, handed off, retained or released to reach an exit. Based on BxB; for map authoring."
---

# MazeBench Block Coordination

A traverse with one movable shield delivers the player to a reachable input beside another shield. The next block continues the route in a new direction. Some tools can remain parked after their role is complete, while a later tool may need further transport and a change of pushing side before the exit is usable. The verified BxB route hands off among three independent blocks; it never moves two groups simultaneously.

## Required reading and modes

For new authoring read [mechanism logic](references/mechanism-logic.md), then [design guidance](references/design.md). Select a compatible reference through the [catalog](references/reference-catalog.json) and [difficulty guide](references/difficulty.md). For maintenance or reproduction read the complete case and its evidence: [BxB](references/official-case.md). Preserve complete objectives and all original members. Record the current required document SHA256 in contract.readReceipt; this checks version consistency, not understanding.

## Derive the design

Choose the full exit and work backward through the shield that makes the final approach possible. Give each preceding traverse an executable handoff to a useful next input, or provide a safe area that lets the same tool change roles. Decide from actual contact geometry whether groups should move independently or as a chain; the default reference supports independent handoffs. Preserve a tool only when the later route uses it, and allow a completed tool to remain parked. Build boundaries and reactive gates around these dependencies, then check full support, clearance and stance access. A compact example may expose one handoff; a composed map should connect several opportunities without inventing a fixed block or stage count. Repeated straight pushes and unused decorative blocks are not additional stages.

## Motion and claims

Use same-elevation occupancy to shield reactive player gates and official full-body translation rules. Contact co-motion is not rigid-group identity. The protected direction still needs full clearance/support and a reachable input stance. Read the source rule table in mechanism logic. Distinguish a complete witness, selected-state observation, exhaustive scoped restriction and unknown. Do not generalize necessity or difficulty between maps.

## Verify and deliver

Use the [empty new-map template](references/design-template.json) only after deriving roles; it contains no inherited map, stages or route. The tested helper replays official references:

`node scripts/verify-reference.cjs --repo ENGINE --family official --out NEW_OUTPUT`

Read [verification](references/verification.md) for additional families, source pinning, restrictions and limits. Deliver the chosen complete goal, relation-to-member/stance mapping and actual evidence. No authored realization was generated or transfer-tested in this package's creation. The helper is an official-reference verifier, so new authoring requires its own compatible build and causal checks. Unsupported physics and capped results remain unknown.

## Website completion in Maze Harness

Follow the destination repository AGENTS.md and docs/website.md. Completed skills and verified trials have standing publication authorization in Maze Harness. Run scripts/publish-site.cjs with the separate engine after the required checks, preserve prior cases, and check the Pages run before reporting the result live. Add actual design/build/matching verification only for an authored trial that was requested and verified. Outside Maze Harness use the destination's authorization.
