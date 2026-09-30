# Setup and examples

Use a separate [MazeBenchEngine](https://github.com/mazebench/MazeBenchEngine) checkout with its dependencies installed and local write access to `games/`. The scripts were checked with Node 24.13.0 and engine baseline `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe`. Engine code and assets are not bundled with this skill.

Run these commands from the skill directory. Replace ENGINE with the checkout path; quote paths containing spaces and choose fresh output directories.

```text
node scripts/build-example.cjs --case side-reach --repo ENGINE --out outputs/side-reach
node scripts/verify-contact.cjs --repo ENGINE --out outputs/side-reach --cap 300000
```

The builder creates a fresh local draft and exports `manifest.json`, `world.json`, `contract.json`, and room text. Append the manifest's `play`, `edit`, or `map` route to your engine's local server origin. `world.json` also imports through official Build. Existing manifests refuse overwrite.

| Example | Role |
|---|---|
| [minimal](../examples/minimal/world.json) | Predocked rear-hook baseline |
| [north-store](../examples/north-store/world.json), [wide-hook](../examples/wide-hook/world.json) | Parameter reuse within the baseline structure |
| [repair-plate](../examples/repair-plate/world.json), [elevated-bridge](../examples/elevated-bridge/world.json) | Predocked module and height compositions |
| [active-docking](../examples/active-docking/world.json) | Transport and dock before building a bridge |
| [side-reach](../examples/side-reach/world.json), [cantilever-key](../examples/cantilever-key/world.json) | Lateral transfer with different useful geometry |

To reproduce all example checks:

```text
node scripts/check-examples.cjs --repo ENGINE --out outputs/regression
```

This creates eight drafts and runs official searches, ordinary move replays, and case-specific controls. It launches no models or paid evaluation. Outputs remain local. See [validation history](validation.md) for recorded results and limits. Running an example reproduces a known layout; use the skill's design workflow for a new puzzle.

The ninth map in `examples/`, [the saved GxE reconstruction](reconstruction.md), is an attributed reference rather than an authored fixture in that regression command. Import its `world.json` through Build. Run `scripts/check-reconstruction.cjs --repo ENGINE --out NEW_OUTPUT` to check its preserved route, explicit passage endpoint, and exclusions. No gem is added to its source.
