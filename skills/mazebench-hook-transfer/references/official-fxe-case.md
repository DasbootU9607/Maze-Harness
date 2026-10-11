# FxE official case and mechanism analysis

Original room: **FxE**, indexed by `games/maze/world_map.json` as `games/maze/levels/5ufa4nkpse.txt`. Engine baseline: `0ac96b8a2648db09f375989cd7bc33699222c1e6`. The unmodified [official room map](official-fxe-world-map.txt) has SHA256 `31db3aa3e127c359bd909958d038535b7cc805810d90edc43f9cf47e1175d9ec`. Preserve the MIT license and original source bytes. This is a separate case from [GxE](official-case.md).

New authoring first reads [Mechanism logic](mechanism-logic.md). Maintainers analyze this complete case and its [states](official-fxe-states.json) and [checks](official-fxe-checks.json); its [runnable design](official-fxe-design.json) is reproduction/regression evidence. Coordinates are zero-based, U decreases y, and all initial actors have z=0. Interpretations come from the map and official engine, not an account from its original author.

## Objective, roles and complete members

The actual objective is to collect the gem at (11,2,0), starting at (14,8,0). The ordinary frozen-object walking region initially contains 107 positions. Four rigid groups take different roles during the route: M1 releases M0; M0 becomes a tool for M3 and then M2. A group's role belongs to an interaction, rather than permanently to its ID.

| ID | Role in the replay | Complete initial members (x,y,z) |
| --- | --- | --- |
| M2 | Gem-pocket blocker | (12,2,0) (13,2,0) (12,3,0) (13,3,0) (12,4,0) (13,4,0) (13,5,0) |
| M3 | Corridor blocker with an opening | (1,4,0) (2,4,0) (1,5,0) (1,6,0) (2,6,0) |
| M1 | Offset starter tool | (7,7,0) (8,7,0) (8,8,0) (8,9,0) (9,9,0) |
| M0 | Initially restricted long tool; reused at two later contacts | (5,13,0) (6,13,0) (7,13,0) (8,13,0) (9,13,0) (10,13,0) (10,14,0) |

M0's horizontal span ends in a downward foot at (10,14). The wall at (11,14) blocks rightward motion, the wall at (10,15) blocks downward motion, and the row-14 floor behind the span is initially inaccessible for an upward push. The right input faces at (11,13)/(11,14) are walls. These restrictions concern the complete group and the player's actual stance.

M3 occupies a two-cell-wide left corridor. Its opening at (2,5) admits a working member while the void at x=3..5 separates the player's central work area. M2 blocks the northeastern gem pocket: the left approach (11,2) is initially inaccessible, and the wall at (12,5) restricts downward movement. Walls and voids jointly restrict input access and full-body movement.

## Replayed contact and access chain

The complete 149-input route in the design is replayed with ordinary official moves and compared step by step with search transitions. It is one witness, not a shortest route or a difficulty measure.

| Input | Actual input and member contact | Effect and scope |
| --- | --- | --- |
| 27 U | P=(3,13), I=(3,12) on M1; C=(5,14) on M1, T=(5,13) on M0 | The offset lower end of M1 lifts the long tool from a reachable stance. Both complete groups translate. The contact is lateral (T is at the same y as P), not rear contact. |
| 56 D | P=(7,4), I=(7,5) on M0; C=(2,5) on M0, T=(2,6) on M3 | The long span reaches into M3's opening across the void. Its left end drives the lower arm down while the player operates from the supported central area. |
| 119 R | P=(5,1), I=(6,1) on M0; C=(11,2) on M0, T=(12,2) on M2 | The same tool's foot now supplies lateral contact on a different row, moving the gem-pocket blocker right from the upper corridor. |

Each row satisfies I=P+d and C+d=T at z=0. The observer checks the actual primary input and full translation of each named pair. All members, support-loss flags, legal pushes, and frozen walking regions are retained in the state evidence; mere adjacency or joint motion is insufficient.

Inputs 6-24 independently reposition M1 before the first contact. Further upward operations release and transport M0. Input 36 legally removes all of M1 after support loss; this removal step is not counted as a complete pair translation. The witness's disposal of M1 is a choice, with no claim that every solution must remove it.

M0 is then placed through M3's opening. Inputs 56-60 lower M3. The witness revisits this relationship: 66-68 move both groups upward, 71 withdraws M0 right, and 82 contacts M3 again from above. This distinguishes contact-driven co-motion from permanent attachment. The later independent moves of M3 at 101-102 make the upper approach usable. Do not treat this detour, these exact poses, or the D/U/R order as necessary without their own exclusions.

Input 112 raises M0 into the upper corridor. Inputs 115-118 deliver its span and foot to the final contact pose. After the transfer at 119, the player returns through the main floor area; input 145 moves M2 upward directly, and input 149 collects the gem. Contact is intermediate progress followed by access and object work in this witness.

## Evidence and verification scope

Run the scoped regression with a separate engine checkout and a fresh output directory:

```text
node scripts/verify-official-fxe.cjs --repo ENGINE --out NEW_OUTPUT --cap 5000
```

The checks distinguish legal completion, actual contact, global group freezes, contact exclusions, first-opportunity dependencies with positive controls, and selected-state walking tests. A `solved` restriction preserves a replayed bypass; `unsolved` means that specific search exhausted; `capped` and exceptions remain unknown. The CLI exits nonzero if a listed claim is contradicted or unknown; its overall verdict covers only these scoped checks. Selected-state evidence never establishes every first-contact history. The packaged record identifies the cap for each result.

The initial unguided official A* run reached its 1,000,000-state cap. The complete witness was obtained from scoped searches and joined only after ordinary replay from the unmodified initial state. The bounded checks do not automatically certify this case under every default complex-authoring obligation. The design's necessary-role and dependency declarations are hypotheses for those checks, not additional proofs. New maps must run their own complete-goal and bypass verification.

The exhausted exclusions establish that M1, M0, their initial lateral contact, and independent starter preparation are required for this map and gem objective. The all-history check also excludes completion by walking alone after the first qualifying M1-to-M0 contact. Walking alone fails at the selected states after inputs 27, 56 and 119.

The 5,000-node exclusions for freezing M2 or M3, forbidding the later two contact pairs, and reaching delivery without corridor contact are capped and remain unknown. The separate positive search toward delivery also capped; the recorded 118-input witness prefix supplies a replayed positive control with delivery forbidden until the next ordinary action. Earlier 26- and 55-input prefixes likewise verify their actual contact opportunities. The cap counts push states with frozen walking components; the earlier official A* cap counts action states.

In raw event records, `transfer` refers to the primary M1-to-M0 mechanism. The named `corridor` and `delivery` selectors separately verify the later pairs using `translated`, the primary input and directional contacts.

## Transferable functions

Extract a constrained tool release, a change from target to working tool, supported spans that connect separated input and working cells, insertion into an opening, recoverable contact, and reuse of different members against successive targets. Re-derive the corridor access, shape functions, support and recovery poses for new maps. Neither four groups, these silhouettes, disposal of the starter, 149 inputs, nor a fixed direction sequence is universal. Keep source-specific GxE and FxE conclusions separate in the mechanism extraction.
