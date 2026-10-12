---
name: mazebench-clear-ground-turning
description: "Design MazeBench passages where a single movable block shields reactive gates and nearby clear ground enables repeated changes of pushing side. Based on ExB; for map authoring."
---

# MazeBench Clear Ground Turning

One block shields only the gate it occupies. A player can follow it along a gate lane, but an unshielded sideways gate blocks a turn. Clear ground beside a future block position supplies a route around the block to a different input side. A successful design connects several such arrival poses and stance changes through the same reusable block, then gives the player a complete route out.

## Required reading and modes

For new authoring read [mechanism logic](references/mechanism-logic.md), then [design guidance](references/design.md). Select a compatible reference through the [catalog](references/reference-catalog.json) and [difficulty guide](references/difficulty.md). For maintenance or reproduction read the complete case and its evidence: [ExB](references/official-case.md). Preserve complete objectives and all original members. Record the current required document SHA256 in contract.readReceipt; this checks version consistency, not understanding.

## Derive the design

Start at the full goal and work backward through the last needed push and its input stance. Place a clear-ground area that makes that stance reachable from the preceding shielded arrival. Repeat only where a new change of pushing side has a causal role. Then derive spawn-side setup and a supported initial block pose. Check each turning area as a small reachability problem with the block held in its arrival pose; a nearby empty cell is insufficient if the player cannot enter it or reach the correct side. Connect the segments using the same block and finish at the doorway. A compact case may demonstrate one transfer; a composed design should make successive transfers depend on where the preceding pushes delivered the tool.

## Motion and claims

Use same-elevation occupancy to shield reactive player gates and official full-body translation rules. Contact co-motion is not rigid-group identity. The protected direction still needs full clearance/support and a reachable input stance. Read the source rule table in mechanism logic. Distinguish a complete witness, selected-state observation, exhaustive scoped restriction and unknown. Do not generalize necessity or difficulty between maps.

## Verify and deliver

Use the [empty new-map template](references/design-template.json) only after deriving roles; it contains no inherited map, stages or route. The tested helper replays official references:

`node scripts/verify-reference.cjs --repo ENGINE --family official --out NEW_OUTPUT`

Read [verification](references/verification.md) for additional families, source pinning, restrictions and limits. Deliver the chosen complete goal, relation-to-member/stance mapping and actual evidence. No authored realization was generated or transfer-tested in this package's creation. The helper is an official-reference verifier, so new authoring requires its own compatible build and causal checks. Unsupported physics and capped results remain unknown.

## Website completion in Maze Harness

Follow the destination repository AGENTS.md and docs/website.md. Completed skills and verified trials have standing publication authorization in Maze Harness. Run scripts/publish-site.cjs with the separate engine after the required checks, preserve prior cases, and check the Pages run before reporting the result live. Add actual design/build/matching verification only for an authored trial that was requested and verified. Outside Maze Harness use the destination's authorization.
