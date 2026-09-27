# Third-party notices

This skill and its authoring examples were developed against [MazeBenchEngine](https://github.com/mazebench/MazeBenchEngine), using its official local build, parser, engine, and solver interfaces. The tested upstream baseline is `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe`.

MazeBenchEngine is MIT-licensed, with the notice:

> Copyright (c) 2026 Jonathan Pappas and David Pappas

That upstream notice is retained in [LICENSE](LICENSE) for material adapted during development. These are upstream public license credits, not private authoring-session information.

This repository does not bundle the MazeBenchEngine runtime, its official world, Three.js, Lucide, images, or 3D assets. The example maps are authored layouts using the official token format. Local draft builders copy required assets from the user's separate engine installation into a new local draft; redistribution of such generated bundles must retain the applicable engine and asset notices. Consult the upstream `LICENSE` and `THIRD_PARTY_NOTICES.md` for those dependencies.
