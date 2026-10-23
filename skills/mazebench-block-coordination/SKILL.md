---
name: mazebench-block-coordination
description: "Design MazeBench passages with several movable blocks whose shielding roles are prepared, handed off, retained or released to reach an exit. Uses BxB and BxC; for map authoring."
---

# MazeBench Block Coordination

Coordinate movable gate shields by preserving the player's next executable input. A successful operation delivers both a useful tool position and access to its working side. BxB demonstrates handoffs to initially placed shields and later reuse of one block; BxC demonstrates temporary joint transport, separate preparation and another block supplying the approach. Retaining a tool means keeping its future role usable, including while it is parked. Release follows a verified continuation to the exit.

## Automatic authoring record

Token usage, runtime-reported model names, and build wall time are default deliverables. Keep the current model, CLI or desktop client and perform the work in this conversation. Never launch a Codex worker, switch models, or delegate merely to collect usage. The ordinary `start` command binds a passive adapter to the current session; build, read, test and finish boundaries refresh its measurements. Client hooks supply exact session identity when available. Unsupported clients still record duration; absent model or token fields must be reported as "Not provided", never estimated or replaced with zero.

After `finish`, deliver the room and `token-usage.json` / `token-usage.md`. Distinguish the measured session interval from a complete task total: the current in-flight response, delayed usage, earlier conversation and other agents are excluded. Cached input and reasoning output are subsets. If several models appear in actual runtime records, retain each model's measured usage. No extra user command is required.

For new authored work, choose the absolute design-spec path before reading mechanism references or laying out cells. Start its local recording session and viewer through the packaged bridge; this is part of the agent's workflow and requires no extra command from the user:

```text
node scripts/authoring-observer.cjs start --spec SPEC.json --title "Authoring task"
node scripts/authoring-observer.cjs read --spec SPEC.json --file references/mechanism-logic.md
```

Use `read --spec SPEC.json --file FILE` for the other source files actually needed. Keep the spec path stable across revisions so ordinary build and verification commands join the same session automatically. The existing authoring CLI entrypoints record command output, candidate snapshots and fresh reports when the optional runtime is available; official-reference regression helpers remain reference checks rather than new-map sessions. For custom helpers, use `exec --spec SPEC.json --kind command -- EXECUTABLE ARGS`, or `--kind test --report FRESH_REPORT.json` for a validation report.

Record concise design goals and revision reasons with `note --spec SPEC.json --json NOTE.json`; supported note fields are `goal`, `sources`, `change`, `reason`, and `expectedChecks`. Preserve unsuccessful candidates and tests, and use `finish --spec SPEC.json` when delivery is complete. Notes are agent statements, not private internal reasoning. File delivery records access, while contract read receipts establish version consistency; neither proves comprehension or causal use.

The bridge discovers an optional local runtime through configuration or a surrounding checkout. An unavailable or failed recorder is reported explicitly. Continue the authorized design work when recording is unavailable, disclose the missing coverage, and never claim that unrecorded reads or commands were captured. Keep machine-specific runtime configuration and generated sessions outside the distributed skill package.

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
