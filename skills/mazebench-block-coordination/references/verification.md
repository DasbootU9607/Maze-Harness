# Reference verification

The implemented profile is `official-player-gate-reference-v1`. It checks complete ordinary replay of the unchanged original map, including full member/elevation arrays and recomputed reactive gates. It supports the reference room-local reach endpoint and player/weightless-box/floating-floor actors. It rejects unsupported profiles, actors, objectives, stale receipts, map bytes, entry snapshots or runtime hashes. It is not an authored-map builder.

From this skill directory, run:

`node scripts/verify-reference.cjs --repo ENGINE --family official --out NEW_OUTPUT`



ENGINE is a separate official checkout at the documented commit; use a fresh output directory. The helper verifies the case readReceipt, compares the original map with the pinned Git blob, pins the runtime and entry snapshot, replays all witness inputs with ordinary move, checks the full goal, probes all four next inputs at selected states and searches under each declared group freeze. The state/time caps are 20,000/10,000 ms per exclusion; reaching either produces unknown. Exhaustion means no allowed ordinary transition reaches this same endpoint under the exclusion. It is not a proof about another map or a unique order.

The packaged checks link current cells/contract/case fingerprints separately from solution-stage provenance. A future document edit needs refreshed reading and packagedDesign hashes, not fabricated historical replay dates. Checks establish record consistency and scoped gameplay evidence, not human authorship or difficulty. New maps must include positive controls and bypass tests for their actual relations; no generic new-map necessity certificate is provided here.
