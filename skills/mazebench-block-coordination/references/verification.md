# Reference verification

The implemented profile is `official-player-gate-reference-v1`. It checks complete ordinary replay of the unchanged original map, including full member/elevation arrays and recomputed reactive gates. It supports the reference room-local reach endpoint and player/weightless-box/floating-floor actors. It rejects unsupported profiles, actors, objectives, stale receipts, map bytes, entry snapshots or runtime hashes. It is not an authored-map builder.

From this skill directory, run:

`node scripts/verify-reference.cjs --repo ENGINE --family official --out NEW_OUTPUT`

For BxC use `--family official-bxc`. Its witness is a recovered human-recording prefix, independently replayed without agent-added moves.

ENGINE is a separate official checkout at the documented commit; use a fresh output directory. The helper verifies the case readReceipt, compares the original map with the pinned Git blob, pins the runtime and entry snapshot, replays all witness inputs with ordinary move, checks the full goal, probes all four next inputs at selected states and searches under each declared restriction. Only `freeze-group` and `forbid-joint-motion` are accepted; unknown kinds fail before search. The latter rejects a single ordinary input exactly when more than one blue group moves. Actual-contact assertions check selected joint and independent moves, and paired ordinary branches check the prepared handoff from the same reachable state. These branch checks establish a local opportunity rather than every possible history. The state/time caps are 20,000/10,000 ms per exclusion; reaching either produces unknown. Exhaustion means no allowed ordinary transition reaches this same endpoint under the exclusion. It is not a proof about another map or a unique order.

The packaged checks link current cells/contract/case fingerprints separately from solution-stage provenance. A future document edit needs refreshed reading and packagedDesign hashes, not fabricated historical replay dates. Checks establish record consistency and scoped gameplay evidence, not human authorship or difficulty. New maps must include positive controls and bypass tests for their actual relations; no generic new-map necessity certificate is provided here.

BxC full-goal exclusions are currently unknown because all three reached their time cap. The complete witness and all contact/branch checks pass independently of those unknown necessity results. The immutable full transcript is audited privately; the public package distributes only the concise ordinary route, recovery scope and source fingerprints.

## Match the check to the authoring claim

Use the [cross-case comparison](reference-library.md) to separate witnessed choices from necessary operations. The following obligations guide an authored realization; they are not additional checks already implemented by this reference-only helper.

| Claim | Evidence to collect | Limit |
| --- | --- | --- |
| The next input is usable | Ordinary approach to the actual input side, same-elevation member contact, whole-body legal movement and a successful continuation. | Tool alignment alone does not establish use. |
| Preparation changes an opportunity | Reachable positive/negative branches testing the same next input; match other approach conditions where possible. | A local change does not exclude all other histories. |
| Tools travel together and later work separately | Identify each directional contact and complete group displacement, then replay separation and the individual roles. | Co-motion does not merge IDs or prove joint movement necessary. |
| A parked tool is retained usefully | Replay intervening actions while preserving its placement, then reach its input side and use it. | Stationary does not mean released; adjacency does not mean usable. |
| A tool can be released from this plan | Replay the entire remaining goal route with the named tool staying parked. | This proves one completion without further motion, not global dispensability. |
| The mechanism is necessary for the whole goal | A successful ordinary control and an exhausted compatible exclusion from the same entry to the same full goal. | Caps, unsupported states and changed objectives remain unknown. |

Do not substitute a visually clear corridor for a recomputed gate-state check. Do not stop at the last block's boundary arrival: BxC's final direct R is blocked, and the witnessed player instead reaches a free doorway by U,U,R. Both references verify single-member groups; larger footprints or new physics need their own compatible checks.
