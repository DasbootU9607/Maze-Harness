# Third-party notices

These skills use the official parser, local save services, engine, and solver interfaces from [MazeBenchEngine](https://github.com/mazebench/MazeBenchEngine). The development baseline is `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe`.

MazeBenchEngine is MIT-licensed, with the notice:

> Copyright (c) 2026 Jonathan Pappas and David Pappas

That upstream notice is retained in [LICENSE](LICENSE) for material adapted during development. These are public license credits.

This repository distributes skill instructions and reusable authoring helpers. It does not bundle the engine runtime, official worlds, generated maps, Three.js, Lucide, or game model and texture assets.

Draft builders copy required resources from the user's separate engine installation into a fresh local draft. Redistribution of those generated drafts must retain the applicable engine and asset notices; consult the upstream `LICENSE` and `THIRD_PARTY_NOTICES.md`.
