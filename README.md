# Maze Harness

Reusable skills for designing and verifying mechanisms in the official [MazeBenchEngine](https://github.com/mazebench/MazeBenchEngine).

The first skill, **mazebench-hook-transfer**, derives useful tool geometry from a design goal, builds an editable local map, and checks contact, preparation, and bypasses with the official engine and solver. It supports rear-hook and lateral-arm examples. This initial package is an authoring toolkit, not a replacement engine or a model-evaluation runner.

## Use the skill

Copy `skills/mazebench-hook-transfer` into your agent's local skill directory, or point a skill-capable coding agent directly at [SKILL.md](skills/mazebench-hook-transfer/SKILL.md). Provide access to a separate local MazeBenchEngine checkout for trusted authoring work.

> Use $mazebench-hook-transfer to design and build a mechanism that requires the player to discover a tool's purpose, actively transport it, and dock it to finish. Choose the shape and layout yourself. Use my local MazeBenchEngine checkout and preserve all existing maps.

No prescribed half-frame, L shape, coordinates, or action sequence is needed. The agent is responsible for geometry and validation. A missing engine location or unavailable official dependency may require setup; an unspecified shape does not.

## Requirements

- Node.js; this publication was checked with Node 24.13.0.
- A separate official MazeBenchEngine checkout with its dependencies installed according to the upstream README. The tested engine baseline is `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe`.
- Local write access to that checkout's `games/` directory to create new drafts.

No API key, paid model, Prime account, or network request is needed by the build/verification scripts. Engine code, official level assets, credentials, and personal session files are not bundled here.

## Reproduce an example

From this repository's root, replace ENGINE with the engine checkout path. Quote paths containing spaces.

```text
node scripts/build-example.cjs --case side-reach --repo ENGINE --out outputs/side-reach
node skills/mazebench-hook-transfer/scripts/verify-contact.cjs --repo ENGINE --out outputs/side-reach --cap 300000
```

The builder creates a fresh local draft and writes `manifest.json`, `world.json`, `contract.json`, and the room text into OUTPUT. It refuses an output directory that already has a manifest. No existing map or engine physics is modified. To view the map, start the engine using its own instructions, then append the manifest's `play`, `edit`, or `map` route to your local server origin. `world.json` can also be imported through official Build.

Run all included logic regressions:

```text
node scripts/check-examples.cjs --repo ENGINE --out outputs/regression
```

This creates eight separate local drafts. It uses official searches and ordinary move replays, plus scoped necessity and control checks. It does not launch evaluated agents or models. Detailed generated logs stay under the ignored output directory.

## Included examples

| Example | Role | Key distinction |
|---|---|---|
| [minimal](examples/minimal/world.json) | Predocked baseline | Rear transfer releases a constrained load |
| [north-store](examples/north-store/world.json) | Parameter reuse | Adds transport within the baseline dependency structure |
| [wide-hook](examples/wide-hook/world.json) | Parameter reuse | Wider/taller tool, same baseline dependency structure |
| [repair-plate](examples/repair-plate/world.json) | Predocked module composition | Fill a hole, then leave a persistent button weight |
| [elevated-bridge](examples/elevated-bridge/world.json) | Predocked height composition | Lower to push, raise to cross the new box-top bridge |
| [active-docking](examples/active-docking/world.json) | Active rear-hook docking | Independently transport and dock before building the bridge |
| [side-reach](examples/side-reach/world.json) | Active lateral docking | Reach across air from an offset supported input |
| [cantilever-key](examples/cantilever-key/world.json) | New geometry using lateral transfer | A bent arm's trailing handle supplies input and support |

Running an example reproduces a known template. Changing size or travel is a parameter variant. A new-design request uses functional reasoning and, where needed, a new layout function. Structural novelty is an additional requirement only when requested.

## Evidence and limits

See [validation scope](docs/validation.md), [publication results](evidence/publication-check.json), and the skill's [mechanics and validation rules](skills/mazebench-hook-transfer/references/rules-and-validation.md). Legal solution, mechanism use, mechanism necessity, preparation necessity, and part function are reported separately. Search limits mean **unknown**. Solvers do not establish player insight, universal difficulty, arbitrary 3D compatibility, or global shape minimality.

No second verified MazeBench mechanism skill is included. Composition interfaces can be used with user-supplied room fragments; the resulting whole puzzle still needs validation.

## License and provenance

This package is available under the [MIT License](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for upstream attribution. Scripts call the separately installed official engine; they do not reimplement game physics.
