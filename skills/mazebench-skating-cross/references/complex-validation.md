# Contract and executable interfaces

Run from this skill directory; outputs must be new directories.

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_BUILD_OUTPUT
node scripts/verify.cjs --repo ENGINE --spec SPEC.json --out NEW_CHECK_OUTPUT --cap 300000
```

For new maps read [Mechanism logic](mechanism-logic.md) and use [design-template.json](design-template.json). The intentionally incomplete scaffold must be filled from the goal. [user-design.json](user-design.json) remains a runnable reproduction/regression contract. New geometry needs its own contract/evidence. The builder uses official serialization and writes Build JSON, map, spec, contract and manifest routes; building does not certify the design. Verification writes `verification.json`, retains counterexamples and exits nonzero for failed/unknown.

| Field | Meaning |
| --- | --- |
| `title`, `cells` | Title and complete 16×16 official token array |
| `contract.profile` | `planar-skating-cross-v1` |
| `mode` | Default `complex`; requested reproduction/compact demonstration can use `reference`/`demo` |
| `group`, `members`, `center` | One M0..M4; all initial members in row order, z=0; center and four contiguous nonempty arms |
| `goal` | `{kind:"gem-and-return",cell:[x,y,0]}`; one player, one gem |
| `spatial.walls`, `spatial.ice` | Complete fixed footprints in row order, including ice under actors |
| `readReceipt` | New maps: `references/mechanism-logic.md`, current SHA256, `readBeforeLayout:true`; legacy reproductions may retain the current `references/user-case.md` receipt |
| `inherited`, `changes` | Preserved functions and their new geometry |
| `events` | Named `kind:motion`, `cross-brake` or `gem`; optional `direction` and `centerAfter` |
| `dependencies` | `prepare`, `before` (`goal` or event), `conflict`, `effect`; optional `after` history event |
| `stages` | In complex mode at least three connected stages: name, event, conflict, effect, witness `keyStep`, reachable `nextStand` |
| `directionChecks` | Optional directions required by this layout |
| `motionLimits` | Optional additional maximum-motion restrictions, specific to this design |
| `selectedPost` | Optional witness steps expected to need further cross motion |
| `witness` | Optional direction string finishing full goal; otherwise solver route |

Supports floor `.`, ice `i`, wall `#`, player `p`, gem `G`, one M group, and supported floor/ice stacks. Multiple groups, heights, slopes/devices and other mechanics are unknown. Arm-deletion interventions need a separate scoped analysis; they do not pass the four-arm profile.

All modes require legal completion, motion/brake necessity and declared checks. Complex mode additionally requires connected functional stages and reachable next stances; it rejects at-most-one-motion, same-direction-only and first-motion-then-frozen completions. Counts complement functional dependencies.

Dependency prefixes include a positive control and the actual full goal as an alternative endpoint. `after` restricts the claim to histories that reached that event. Keep history outside engine buffers and inside search keys/replay.

Reports preserve source/contract/engine fingerprints, shapes, collision/braking members, stop graphs, scopes and counterexamples. A structural pass is not a difficulty score, publication, shape minimality result or authorization to launch benchmark models.

## New-map realization record

For a mechanism-document receipt, each `inherited` entry is an object with `relation` (an ID headed in the mechanism document), `realization` (the functional explanation), `members` (actual group IDs mapped to relevant initial `[x,y,z]` members), and `boundaries`, `passages`, `stances` (coordinate arrays, possibly empty). Member anchors identify parts across later translations; event observations supply their working poses. At least one concrete anchor is required per relation. Boundaries must be walls; access anchors must have traversable terrain, though objects may initially occupy them. Explain which event changes access and how those parts carry the relationship.

The checker validates version and anchor membership against this map. Natural-language functions and empty initial terrain do not prove usable access. Ordinary move/contact observers, complete rigid-footprint replay, walking or directed-stop searches, and declared dependency exclusions provide the physical evidence. Legacy case receipts keep their existing string `inherited` entries. `changes` explains newly derived spatial relationships rather than asserting innovation from renaming, symmetry, input count, or a one-cell edit.
