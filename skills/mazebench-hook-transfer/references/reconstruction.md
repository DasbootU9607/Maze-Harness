# Saved GxE rear-hook reconstruction

This user's reconstruction, captured on 2026-09-30, reproduces the official GxE mechanism. Its group IDs are swapped relative to upstream `9hgghfgcsu.txt`, and its north boundary differs. It is not claimed to be a byte-for-byte official level.

## Files and actual objective

- [world.json](../examples/reconstruction/world.json): portable Build map.
- [level_AxA.txt](../examples/reconstruction/level_AxA.txt): original saved tokens, with no added gem.
- [case.json](../examples/reconstruction/case.json): source fingerprint, explicit passage endpoint, witness, and checks.
- [analysis.json](../examples/reconstruction/analysis.json): fresh analysis, push runs, and counterexamples.
- [reference-check.json](../examples/reconstruction/reference-check.json): independent checker results and engine fingerprints.

The objective is to reach `(2,13,0)` in the left passage. There is **no gem**. The checker tests this player position instead of an empty-gem `isSolved` condition. Coordinates are zero-based.

M1 is the six-cell tool at `(11,8),(12,8),(11,9),(11,10),(11,11),(12,11)`. M0 is the target at `(7,11),(8,11),(8,12),(8,13),(8,14)`. Player starts at `(13,7)`. See [mechanism](mechanism.md) for the corresponding official IDs and geometry.

## Witness stages and a useful counterexample

| Inputs | Functional change |
| --- | --- |
| 4-20 | Tool transports independently and docks around the target |
| 27 | Player reaches `(7,10)` below the input member at `(7,9)` |
| 28 U | Tool rear member `(7,12)` contacts target `(7,11)`; both rise |
| 29 L | Tool moves aside |
| 31 R | Target shifts right in this witness |
| 41 | Player reaches the declared passage endpoint |

There are 13 push inputs, 28 walking inputs, and seven compressed push runs. A separate positive control reaches a legal first rear-transfer opportunity. Freezing either group, forbidding rear transfer, or prohibiting independent tool preparation before first contact prevents completion of the corresponding checked goal.

Excluding tool-left, tool-right, or target-up prevents reaching the passage. However, forbidding target-right still permits this ordinarily replayed 43-input route:

```text
DDLULLLLLLRUULDDLLDRURRRDDLUULDDRDDDLDLLLLU
```

Therefore target-right is a witness choice, not a necessary design rule. Further northward motion offers another way to open access. Teach the useful release and continued passage work, not an invariant left-retreat/right-load recipe.

From the recorded state immediately after input 28, walking-only completion, frozen-tool completion, and frozen-target completion all exhaust unsuccessfully. Both objects must still move **from that selected state**. This does not quantify over every possible first-contact state.

## Recheck

```text
node scripts/check-reconstruction.cjs --repo ENGINE --out NEW_OUTPUT --cap 1000000
```

Run from the skill directory with a separate engine checkout. It preserves the source, replays the saved route and found counterexamples, and runs twelve exclusions or controls against the explicit objective. `--mode replay` skips fresh necessity checks. Capped results are unknown. This reference checker does not replace the outcome-specific authoring validators or certify arbitrary goals and relays.

Import `world.json` in official Build for manual inspection. Read [planning depth](planning-depth.md) when using this case to design a more involved room.
