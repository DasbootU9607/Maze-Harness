# User-reconstructed GxF example

This fixture is a user-built single-room reconstruction, solved and ordinarily replayed on 2026-09-29. The hosted shared save was not retrieved, so cell-for-cell identity with the online level is not asserted.

[spec.json](../assets/gxf/spec.json) is the runnable input. [witness.json](../assets/gxf/witness.json) preserves the 219-input route, checkpoints, and original layout fingerprint. The original draft remains unchanged; `--example gxf` creates a separate draft.

## Roles and starting cells

Coordinates are zero-based `[x,y]`, including the outer walls.

| Role | ID | Initial cells | Function |
| --- | --- | --- | --- |
| Tool | M0 | `[6,5] [7,5]` | Two-cell bar; one end accepts a push from the floor side while the other reaches across the void |
| Helper | M1 | `[8,5] [9,5] [8,6]` | Changes transport configurations by moving down, clearing, returning, and participating in contact chains |
| Helper | M2 | `[10,4] [11,4] [10,5]` | Horizontal repositioning and contact propagation release tool movement |
| Target | M3 | `[1,12] [2,12] [3,12]` | Blocks the left entrance; eventually moves down two cells |
| Player | p | `[7,1]` | Starts above the mechanism |
| Gem | G | `[2,9]` | Lies in the separated left region |

`[3,9] [3,10] [3,11]` are void cells, not a walking route above the target. Walls also constrain part of the target. The rigid tool's support permits a push on its floor-side end while the other end contacts the target.

## Observed stages

| Completed inputs | Observed state or function |
| --- | --- |
| 12 | M1 moves down and M0 left, making room for later configuration changes |
| 45 | M2 moves left and M1 returns upward one cell |
| 80 | Side changes and contact chains place M1 lower in the mechanism |
| 106 | M0 reaches the middle; some moves also move M1 |
| 132 | M1 moves right, M0 up, and M2 left to release another arrangement |
| 149 | Upward and chained pushes park both L-shaped groups above |
| 172 | M0 occupies `[9,5] [10,5]`, aligned with the downward corridor |
| 200 | M0 occupies `[9,11] [10,11]` in the lower horizontal corridor |
| 208 | M0 occupies `[3,11] [4,11]`, overhanging the void on its left |
| 210 | The tool stays there and the player reaches `[4,10]`, completing operable delivery |
| 211 | Input D; the player pushes M0 at `[4,11]`, whose `[3,11]` member contacts M3 at `[3,12]`; both groups move down |
| 212 | Another D moves M3 to y=14 and opens the left entrance |
| 219 | `LLLUUUR` collects the gem |

These stages describe one verified witness, not a universal order for all solutions. Step 208 aligns the tool; step 210 also provides the pushing stance. Preserve that distinction in reusable delivery interfaces.

## Evidence and generalization

Original restricted searches separately froze M0, M1, M2, and M3 and exhausted without a solution. Forbidding indirect M3 pushes also exhausted. The witness was checked input by input against search and ordinary moves, then replayed with server-loaded data from the local play page.

The bundled verifier additionally checks necessity of the declared tool-use event, delivery or gem access with each helper frozen, and independent helper preparation in the witness. The [packaged baseline](../assets/gxf/verification-baseline.json) records 219 inputs, including 43 push inputs and 176 walking inputs; all seven restricted searches exhausted without a solution. Generate fresh results and engine fingerprints with `verify.cjs`; the baseline is not evidence of a new run.

The reusable relationship is that final use constrains tool shape, the working pose constrains delivery, group configurations and player stances constrain transport, and successful delivery enables indirect pushing. This example establishes its specific configuration. Changed shapes, directions, corridors, and starts require revalidation. Input count is neither a design target nor proof of human difficulty.
