# Contract and executable interfaces

Run from this skill directory; outputs must be new directories.

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_BUILD_OUTPUT
node scripts/verify.cjs --repo ENGINE --spec SPEC.json --out NEW_CHECK_OUTPUT --cap 300000
```

[reference-design.json](reference-design.json) is runnable. New geometry needs its own contract/evidence. The builder uses official serialization and writes Build JSON, map, spec, contract and manifest routes; building does not certify the design. Verification writes `verification.json`, retains counterexamples and exits nonzero for failed/unknown.

| Field | Meaning |
| --- | --- |
| `title`, `cells` | Title and complete 16×16 official token array |
| `contract.profile` | `planar-skating-cross-v1` |
| `mode` | Default `complex`; requested reproduction/compact demonstration can use `reference`/`demo` |
| `group`, `members`, `center` | One M0..M4; all initial members in row order, z=0; center and four contiguous nonempty arms |
| `goal` | `{kind:"gem-and-return",cell:[x,y,0]}`; one player, one gem |
| `spatial.walls`, `spatial.ice` | Complete fixed footprints in row order, including ice under actors |
| `readReceipt` | Internal case path, SHA256, `readBeforeLayout:true`; a record, not mechanism proof |
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
