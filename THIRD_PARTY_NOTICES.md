# Third-party notices

These skills use the official parser, local save services, engine, and solver interfaces from [MazeBenchEngine](https://github.com/mazebench/MazeBenchEngine). The basic helper baseline is `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe`; the full official case maps and complex helper checks use `0ac96b8a2648db09f375989cd7bc33699222c1e6`.

MazeBenchEngine is MIT-licensed, with the notice:

> Copyright (c) 2026 Jonathan Pappas and David Pappas

That upstream notice is retained in [LICENSE](LICENSE) for material adapted during development. These are public license credits.

This repository distributes skill instructions and reusable authoring helpers. It includes unmodified textual excerpts of official levels `mygl8anih8.txt` (HxH), `0lzre7ixaq.txt` (GxF), and `9hgghfgcsu.txt` (GxE), under their respective skill references as `official-world-map.txt`. Original source paths, map hashes, and the engine commit are recorded in each `official-case.md`. The runnable `official-design.json` files encode those same case layouts for local verification. The upstream MIT notice applies to these excerpts as well as adapted helpers. It does not bundle the engine runtime, complete worlds, generated drafts, Three.js, Lucide, or game model and texture assets.

Draft builders copy required resources from the user's separate engine installation into a fresh local draft. Redistribution of those generated drafts must retain the applicable engine and asset notices; consult the upstream `LICENSE` and `THIRD_PARTY_NOTICES.md`.

The `skating-cross` package adds a user-authored local map, preserved as `references/reference-world-map.txt`, with its map hash and confirmed objective recorded in `reference-case.md`. It is a reference supplied for skill authoring, not an upstream official level. Its author-side observations and checks use the official engine at `0ac96b8a2648db09f375989cd7bc33699222c1e6`; its local serialization helper is adapted from the existing skill helpers. No engine runtime, model or texture assets are bundled in the skill.
