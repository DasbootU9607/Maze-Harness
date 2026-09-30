# Third-party notices

These skills and their authoring examples were developed against [MazeBenchEngine](https://github.com/mazebench/MazeBenchEngine), using its official local build, parser, engine, and solver interfaces. The tested upstream baseline is `07aa03a5c0ee8b4e0b025a52793055e89cb68bfe`.

MazeBenchEngine is MIT-licensed, with the notice:

> Copyright (c) 2026 Jonathan Pappas and David Pappas

That upstream notice is retained in [LICENSE](LICENSE) for material adapted during development. These are upstream public license credits, not private authoring-session information.

This repository does not bundle the MazeBenchEngine runtime, its complete official world, Three.js, Lucide, or 3D assets. Most example maps are authored layouts using the official token format. Boundary Stagger also includes an attributed, sealed extraction of official room HxH (`mygl8anih8.txt`), replay records, and local game screenshots for explanation. Local draft builders copy required assets from the user's separate engine installation into a new local draft; redistribution of such generated bundles must retain the applicable engine and asset notices. Consult the upstream `LICENSE` and `THIRD_PARTY_NOTICES.md` for those dependencies.

Constrained Transport includes a user-authored reconstruction of room GxF, a verified witness, and a compact verification baseline. Its hosted shared save was not retrieved, so exact identity with the online level is not claimed. The baseline records the engine, solver, parser, and token-definition fingerprints used for verification.

Boundary Stagger and Hook Transfer also include user-saved reconstructions of the official HxH (`mygl8anih8.txt`) and GxE (`9hgghfgcsu.txt`) mechanisms. These small reference maps preserve the saved tokens, source fingerprints, explicit goals, replay evidence, and recorded differences from upstream. They do not replace or redistribute the full official world. Descriptions of design intent are interpretations of observed rules and solutions, not statements supplied by the original authors.

The authored Borrowed Bay example includes a local gameplay screenshot and compact verification records produced with the same external engine. No additional engine runtime or assets are bundled with that example.
