# Maze Harness

A growing collection of reusable agent skills for designing and building MazeBench puzzles.

## Guides and case collection

- [How to use the skills in a coding-agent conversation](docs/using-skills.md)
- [What to read and how to review the skills manually](docs/reviewing-skills.md)
- [Before/after versions and their evidence limits](docs/skill-version-comparison.md)
- [All 38 indexed case records before and after the skill revision](examples/skill-comparison/README.md): 16 earlier finished cases, Borrowed Bay, 17 prototype records, and four attributed reference layouts, representing 33 distinct saved layouts.

The public collection includes portable maps, recorded verification evidence, and failed candidates. It preserves the local archive's case coverage while omitting repeated installations and machine-dependent files.

## Skills

| Skill | Purpose |
|---|---|
| [mazebench-hook-transfer](skills/mazebench-hook-transfer/SKILL.md) | Design and verify puzzles that use object shapes, transport, and docking to transfer force. |
| [mazebench-boundary-stagger](skills/mazebench-boundary-stagger/SKILL.md) | Design and verify routes opened by offsetting movable groups around fixed boundaries. |
| [mazebench-constrained-transport](skills/mazebench-constrained-transport/SKILL.md) | Design and verify rigid-tool delivery through constrained spaces, helper preparation, and final contact transfer. |

## Use

Copy the desired folder from `skills/` into your agent's skill directory, or point the agent directly at its `SKILL.md`. Each skill keeps its instructions, scripts, references, and examples together.

> Use $mazebench-hook-transfer to build a puzzle that requires actively transporting and docking a tool. Choose the shape and layout yourself.

For a room intended to require substantial planning:

> Use the three MazeBench skills to design a challenging new room. Choose the shapes and layout. Make preparation, object rearrangement, usable delivery, and completion depend on each other. Verify the actual objective and the dependencies you claim. Explain what remains uncertain about human difficulty.

The skills distinguish necessary planning relationships from long walking routes. Their `planning-depth.md` references guide harder requests; compact mechanism demonstrations remain valid for simpler requests. A solver verifies rules and declared exclusions, not how difficult people will find a room.

## Reconstructed reference cases

| Reference | Preserved source and analysis | Main reusable lesson |
| --- | --- | --- |
| HxH | [Boundary reconstruction](skills/mazebench-boundary-stagger/references/reconstruction.md) | An offset changes a boundary-blocked contact chain and releases a route |
| GxE | [Hook reconstruction](skills/mazebench-hook-transfer/references/reconstruction.md) | Prepare usable rear contact, then plan continued passage work |
| GxF | [Transport reconstruction](skills/mazebench-constrained-transport/references/gxf-case.md) | Reconfigure shared space and pushing faces before operable delivery |

These are user reconstructions of official mechanisms, with provenance and differences recorded. Each skill includes `scripts/check-reconstruction.cjs` to replay its saved witness and rerun explicit exclusions using a separate MazeBenchEngine checkout. GxE uses a passage endpoint because its source has no gem. Case reports retain successful bypasses as evidence against overbroad claims.

An independent authoring trial also produced [Borrowed Bay](skills/mazebench-constrained-transport/references/borrowed-bay.md), a new room with connected preparation, lateral transfer, helper recovery, and tool withdrawal. Its portable map, scoped audit, and recorded browser checks are included. One successful trial after revisions establishes practical use, not a measured human difficulty level or a controlled improvement rate.

Setup and verification: [Hook Transfer](skills/mazebench-hook-transfer/references/usage.md) · [Boundary Stagger](skills/mazebench-boundary-stagger/references/usage.md) · [Constrained Transport](skills/mazebench-constrained-transport/references/verification.md).

New skills belong in `skills/<skill-name>/`, with an entry in the table above. Keep detailed guidance and supporting files within the relevant skill.

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
