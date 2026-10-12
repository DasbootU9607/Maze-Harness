---
name: mazebench-enclosure-navigation
description: "Design MazeBench reactive-gate passages using a rigid enclosure, protected pushing directions, and safe release. Extracts CxB and DxB mechanisms for map authoring."
---

# MazeBench Enclosure Navigation

A rigid body places shielding members beside a player-sized cavity. The player pushes a contacted member, translating the entire group and the player together. The shielding member occupies a player gate before the player enters its former cell. Geometry determines which directions have such a contact; terrain still decides which of those directions are legal. Safe ground supports preparation, repositioning and final departure.

## Required reading and modes

For new authoring read [mechanism logic](references/mechanism-logic.md), then [design guidance](references/design.md). Select a compatible reference through the [catalog](references/reference-catalog.json) and [difficulty guide](references/difficulty.md). For maintenance or reproduction read the complete case and its evidence: [CxB](references/official-case.md), [DxB](references/official-dxb-case.md). Preserve complete objectives and all original members. Record the current required document SHA256 in contract.readReceipt; this checks version consistency, not understanding.

## Derive the design

Choose the complete passage objective and the sides that must remain pushable during its constrained section. Build a cavity and input members for those sides, then fit the whole body through the terrain. Derive staging space that lets the player enter that cavity from the real spawn. Arrange terrain changes that give the different protected directions work to do. Finish with a usable departure area; check that the parked body does not seal the only exit slot. A compact demonstration can isolate one protected move. A composed design should connect entry, direction-dependent traversal and release through their actual preconditions; repeated straight pushes do not add functional stages.

## Motion and claims

Use same-elevation occupancy to shield reactive player gates and official full-body translation rules. Contact co-motion is not rigid-group identity. The protected direction still needs full clearance/support and a reachable input stance. Read the source rule table in mechanism logic. Distinguish a complete witness, selected-state observation, exhaustive scoped restriction and unknown. Do not generalize necessity or difficulty between maps.

## Verify and deliver

Use the [empty new-map template](references/design-template.json) only after deriving roles; it contains no inherited map, stages or route. The tested helper replays official references:

`node scripts/verify-reference.cjs --repo ENGINE --family official --out NEW_OUTPUT`

Read [verification](references/verification.md) for additional families, source pinning, restrictions and limits. Deliver the chosen complete goal, relation-to-member/stance mapping and actual evidence. No authored realization was generated or transfer-tested in this package's creation. The helper is an official-reference verifier, so new authoring requires its own compatible build and causal checks. Unsupported physics and capped results remain unknown.

## Website completion in Maze Harness

Follow the destination repository AGENTS.md and docs/website.md. Completed skills and verified trials have standing publication authorization in Maze Harness. Run scripts/publish-site.cjs with the separate engine after the required checks, preserve prior cases, and check the Pages run before reporting the result live. Add actual design/build/matching verification only for an authored trial that was requested and verified. Outside Maze Harness use the destination's authorization.
