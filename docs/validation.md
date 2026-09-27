# Validation scope

The skill has two types of evidence: development observations from the original authoring work, and fresh reproducible engine checks for this English distribution. Neither is a model capability evaluation.

## Publication checks

`node scripts/check-examples.cjs --repo ENGINE --out FRESH_OUTPUT` creates eight new local drafts, loads them through official services, runs official searches, and replays solutions with ordinary moves. It retains case-specific validators rather than pretending one predicate covers every shape. The original maps and engine remain unchanged.

[publication-check.json](../evidence/publication-check.json) records results, solver expansions, paths, controls, official tests, and SHA-256 identities of the engine/parser files used. Per-case summaries in `evidence/` retain key states and events without machine-specific paths or local draft identifiers. Full traces and logs are generated locally by rerunning the command.

The checks include the three z0 baseline cases, two predocked compositions, active rear docking, active lateral docking, and Cantilever Key. They also check optional no-rear comparison scope, capped-as-unknown behavior, rejection of an incompatible contract, controlled tip removal, a straight-chain negative control, and a specific deadlock with Undo recovery.

Search restrictions remove named transitions from the unchanged official state graph. Their conclusions apply to those maps, initial states, and event definitions. Prefix checks terminate at a legal first-event opportunity or the gem; a found boundary is not automatically a complete bypass. Search exhaustion supports necessity under the restriction. A cap or interruption does not.

## Historical observations

During development, the official GxE passage and GxF puzzle were solved and replayed; their source filenames, contact states, and interpretations are in the skill references. The public examples were also checked in official browser Play/Edit, with save/export and selected Undo/Reset and camera checks. Those browser runs are historical, not a fresh UI test of this publication. Their screenshots and personal session metadata are not included.

One independent authoring invocation used a fresh conversation with the skill and official engine materials and this task:

> Design a hook mechanism that requires discovering the tool's purpose, actively transporting it, and docking it to finish. Choose the shape and layout yourself.

No shape, reference-case choice, or solution hints were supplied. It produced Cantilever Key, explained its input/contact/support relationship, built a map, solved and replayed it, and checked bypasses and preparation. It did not request geometry from the user. The conversation was fresh, but the filesystem was shared: this was not a filesystem-isolated experiment or a benchmark-agent run. One success establishes that invocation only. The translated English instructions have not had another independent authoring trial; the fresh publication checks validate their executable examples and interfaces.

## Preserved counterexamples and limits

- The initial Cantilever prototype let the tool itself press the button. A stop at `(8,5)` corrected that concrete bypass in the delivered layout.
- Removing the active rear bridge's tip yielded an alternate 35-input solution because clearance also changed. This refutes a simplistic shape-minimality claim; it is not a bypass of the unchanged map.
- Cantilever tip removal isolates local transmission while retaining input motion. Handle removal changes both accessible input and support; no independent causal claim about either or globally minimal shape follows.
- The first three examples share a release/retreat/side-shift dependency chain. They are not sufficient evidence of structural diversity.
- No arbitrary mixed-height object shapes, general multi-object relays, second-target tool reuse, or constraint-only hook generator is established.
- Browser rendering, camera readability, and cross-room combinations need appropriate new checks. Solver success cannot prove human recognition, observation difficulty, or planning difficulty.

No Prime, evaluated model, paid evaluation, remote map publication, or deployment is involved in these checks. Publishing this source package does not publish generated local drafts to an online game service.
