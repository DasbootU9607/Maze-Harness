# Active lateral-arm transfer

This optional mode does not replace rear hooks. A transverse tool connects a supported player input line to an offset target line over air. Shape need not resemble a hook: the useful relationship is that the tool can apply force where the player cannot stand.

## Official GxF evidence

Upstream `games/maze/levels/0lzre7ixaq.txt`, world GxF, solved in 219 inputs / 188772 expansions and replayed normally during development. Before input 211, player `(4,10,0)`, M0 `(3,11,0),(4,11,0)`, M3 `(1,12,0),(2,12,0),(3,12,0)`. D pushes the right input; the left member over air contacts `(3,12)`, moving both groups south. Input 212 repeats the southward transfer. Contact lies ahead and one column left of the player: sideTransfer=true, rearTransfer=false. No pulling is involved. Four-group rearrangement in this example does not establish a general relay generator.

## Two-cell authored case

All actors remain at z0 on a 16x16 board. Default one-layer wall, floor x2..5/y5..10; M2 at `(3,8),(4,8)`, M3 at `(6,5)`, player `(2,10)`. `(6,6)` is air; button `(6,4)`, gate `(7,9)`, gem `(8,9)`, exit floor `(6,9)`. Tokens are `.+M2`, `.+M3`, `.+p`, `+`, `.+o`, `.+O`, and `.+G` respectively.

The target's south pushing stance is a hole. The north end is closed, a westward push would need an east-wall stance, and eastward motion hits that wall. The nearby movable bar can reach from the supported west column across the hole. These are tool-use clues and a design goal, not proof of human recognition.

Verified route `URUULURRDRUDDDRRR`: 17 inputs / 387 expansions.

| Phase | Input | Player | M2 | M3 |
|---|---|---|---|---|
| Separate | 0 | `(2,10)` | `(3,8),(4,8)` | `(6,5)` |
| Independent transport | 3 U | `(3,8)` | `(3,7),(4,7)` | Unchanged |
| Docking | 8 R | `(4,6)` | `(5,6),(6,6)` | Unchanged |
| First transfer | 11 U | `(5,6)` | `(5,5),(6,5)` | `(6,4)`, on button |
| Gem | 17 | `(8,9)` | Remains after use | Holds button |

After docking, frozen-box walking `DR` reaches `(5,7)` and U performs the event. Input `(5,6)`, tip `(6,6)`, target `(6,5)` give lateral projection -1 and forward projection 2: a lateral transfer, not a rear transfer.

## Case contract and controls

- No side event: exhausted 478. No tool: 24. No target: 478.
- First-event prefix with no independent preparation or no tool preparation: 24 each. No entry into alignment: 454. Positive boundary control: 10 inputs.
- Optional no-rear comparison retains the same 17-input solution; this is evidence about this example, not a restriction on other hook designs.
- Fixed-target direct stance `(6,6,0)` unreachable: 478. Frozen boxes before use cannot reach the gem: 24. Frozen boxes after use permit `DDDRRR`: 7 expansions.
- Local tip removal preserves terrain, player, target, input, and input support. U still moves the input north, but target stays and gate remains closed. This shows local transmission, not global shape minimality.
- A collinear two-box control yields coupled=true, rear/side=false. cap=1 yields unknown.
- Historical bad route `URUUU` has 72 exhausted states; Undo permits `LURRDRUDDDRRR` (13 inputs). Official UI recovery was checked during development; not every deadlock was enumerated.

`build-side-reach.cjs` reproduces this north-facing template. Optional spec fields are `toolGroup,targetGroup,toolStart,barLength,target,player,workspace,exitY,title`; workspace is `[left,top,right,bottom]`, with right=target.x-1 and top=target.y. Length 2..4 is accepted, but only length 2 has this case's evidence. `verify-contact.cjs` is specific to the active-side-reach plate contract. Add `--contrast-no-rear` only for the stated comparison.

## Bent-arm extension: Cantilever Key

The distribution's `examples/cantilever-key` is a different layout using the same lateral principle and plate outcome. Initial M2 has a four-cell bar `(3..6,10)` and trailing handle `(3,11)`; M3 `(10,6)`; player `(2,12)`. The useful pose has P=`(7,9)`, I=`(7,8)`, C=`(10,7)`, T=`(10,6)`, direction U. The bar spans air, while the trailing handle provides the only pre-event support and accessible input. This explains the bend rather than decorating a longer bar.

Verified route `URRRRDRUUUUDDDRRR`: 17 inputs / 807 expansions. First independent motion 2, docking 10, use 11, gem 17. No event exhausts 1732; no independent preparation 48; no alignment 1633. The dedicated validator checks all four direct target stances and the frozen-box before/after objective. A controlled outer-tip removal retains moving input but loses transmission. Handle removal changes both input and support, so it does not isolate either function.

A first prototype allowed the tool to press the button directly; a stop at `(8,5)` repaired that specific bypass. This is new geometry with a supported trailing input, not default-constructor reproduction, new physics, or a claimed new dependency structure. It arose in one fresh-conversation skill invocation; the English package has not received an additional independent authoring trial. See distribution `docs/validation.md` for evidence scope.

For composition, preserve target pressure, exit passage, and tool support. Same IDs, new buttons, moving the weight, or outside access to the socket invalidate local necessity results. No reuse after completion is promised.
