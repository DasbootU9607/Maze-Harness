---
name: mazebench-bridge-convoy
description: Design and analyze MazeBench puzzles that reserve consumable bridge floors, stage a reusable gate-opening block, and re-form a two-module push convoy after a turn. Based on verified official BxE evidence; for map authoring, not model evaluation.
---

# MazeBench Bridge Convoy

Plan access across disconnected floor regions while keeping a bridge floor available for a later gap. Use a movable blocker to pass proximity gates, recover both modules into a usable push chain, and change its heading through supported staging moves. A leading floor can then fill the gap before the reusable block follows. The verified reference is official BxE, ending at its east doorway; tool transport is between internal chambers.

## Required reading and modes

Read [mechanism logic](references/mechanism-logic.md) before choosing layout. Record its current SHA256 in the new design's reading receipt. For maintenance or reproduction, read [the entire official case](references/official-case.md), its complete design, states and checks. A receipt binds a version; it does not establish understanding or necessity.

Default composed authoring connects bridge allocation, gate access, two-tool recovery and a useful convoy turn to a complete destination. An explicitly requested compact study may isolate a relation. Reproduction remains a separate regression task. Choose unspecified shapes, sizes and coordinates autonomously; do not copy the official map into the empty template.

## Derive the design

Define the destination and which tools must survive. Build an access graph and budget the consumable floors. Assign a gate occupant, a bridge resource, staging positions and the next pushing stance. Design the turn as supported translations that restore a direction-aligned chain. Place the floor ahead of a reusable actor when it must fill a gap first. Require actual next work after delivery and a complete supported route to the endpoint. See [design guidance](references/design.md).

## Motion rules and evidence

Use the pinned official movement rules. Red player gates depend on player proximity and same-elevation occupancy; they are not permanently opened. Floating floors are consumed on holes. Touching modules can push together but do not become one rigid group, and a turn does not rotate their geometry. Test full footprints, heights and contact propagation. Treat unsupported physics and capped exclusions as unknown. The current executable profile verifies the official reference, with local gate and actor-order controls; it does not certify global necessity or arbitrary new layouts.

## Reference library and difficulty

Use [the catalog](references/reference-catalog.json) and [difficulty guide](references/difficulty.md) to choose roles and evidence. BxE is provisionally l3 Planning from its dependent preparation, staging, recovery and irreversible consumption; it is not a calibrated human difficulty rating. Additional cases require their own human focus, full endpoint and independent replay through the case workflow.

## Verify and deliver

Start a new specification from [the empty template](references/design-template.json). This package currently supplies design rules and a reference verifier, not a generic map builder. Give any new map a compatible builder and observer before claiming it verified.

Run from this skill directory with a separate pinned engine and fresh output:

    node scripts/verify-reference.cjs --repo ENGINE --out NEW_OUTPUT

This replays all 177 official inputs and three selected controls. See [verification scope](references/verification.md). Deliver the complete design, source provenance, route, full goal, physical observations, scoped bypass results and explicit unknowns. The present package includes no newly generated maze and makes no new-map transfer claim.

## Website completion in Maze Harness

Follow the destination repository's AGENTS.md and docs/website.md after required checks. In Maze Harness, completed skill publication is authorized: run scripts/publish-site.cjs with the skill and separate engine, preserve earlier references and trials, and check the Pages deployment before reporting it live. Add a playable trial only with its actual design, build manifest and passed matching verification. Outside Maze Harness, follow that project's publication authorization.
