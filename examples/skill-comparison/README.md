# Skill revision case collection

This collection preserves all **38 indexed records** from the local review bundle: **16 earlier finished cases**, **1 later finished case**, **17 prototype records**, and **4 attributed reference layouts**. These correspond to **33 distinct saved cell layouts**. Some selected prototypes duplicate their final maps; repeated local installations are not new designs.

The boundary is the revision based on the user's saved HxH, GxE, and GxF reconstructions. Earlier cases were produced at different times and under different requirements. The four earlier skill trials and the later Borrowed Bay trial are **not a controlled A/B comparison**.

- [Use the skills](../../docs/using-skills.md)
- [Review the skills and their evidence](../../docs/reviewing-skills.md)
- [Version provenance and comparison](../../docs/skill-version-comparison.md)
- [Machine-readable catalog](catalog.json) and [CSV index](catalog.csv)
- [Source fingerprints and publication transforms](provenance.json)
- [Publication integrity and link checks](publication-check.json)

All maps use the official Build JSON format. Import a case's `world.json` into your own local engine. Failed prototypes retain their defects. The engine runtime and its assets are supplied by your separate MazeBenchEngine installation.

## Before revision: finished cases

| Case | Recorded status | Witness inputs |
| --- | --- | --- |
| [Skill Trial 01 - Offset Latch](before/final/01-boundary/README.md) | historical checks passed | 9 |
| [Skill Trial 02 - Bent Key](before/final/02-hook/README.md) | historical checks passed | 19 |
| [Skill Trial 03 - Parking Bay](before/final/03-transport/README.md) | historical checks passed | 49 |
| [Skill Trial 04 - Linked Workshop](before/final/04-combined/README.md) | historical checks passed | 58 |
| [Agent Practice - Push into Alcove](before/final/agent-practice/README.md) | historical witness retained | 6 |
| [Parallax Foundry](before/final/parallax-foundry/README.md) | historical checks passed; import UI limitation | See report |
| [pocket-shutter](before/final/pocket-shutter/README.md) | historical checks passed | 17 |
| [twin-tee](before/final/twin-tee/README.md) | historical checks passed | 27 |
| [minimal](before/final/minimal/README.md) | historical checks passed | 10 |
| [north-store](before/final/north-store/README.md) | historical checks passed | 30 |
| [wide-hook](before/final/wide-hook/README.md) | historical checks passed | 25 |
| [repair-plate](before/final/repair-plate/README.md) | historical checks passed | 12 |
| [elevated-bridge](before/final/elevated-bridge/README.md) | historical checks passed | 12 |
| [active-docking](before/final/active-docking/README.md) | historical checks passed | 27 |
| [side-reach](before/final/side-reach/README.md) | historical checks passed | 17 |
| [cantilever-key](before/final/cantilever-key/README.md) | historical checks passed | 17 |

## After revision: finished case

| Case | Recorded status | Witness inputs |
| --- | --- | --- |
| [Borrowed Bay: The Returning Keeper](after/final/borrowed-bay/README.md) | historical checks passed | 81 |

## Before revision: prototypes

| Case | Recorded status | Witness inputs |
| --- | --- | --- |
| [stagger-prototype-01](before/prototypes/stagger-prototype-01/README.md) | selected as final candidate | See report |
| [hook-prototype-01](before/prototypes/hook-prototype-01/README.md) | intended dependency bypassed | See report |
| [hook-prototype-02](before/prototypes/hook-prototype-02/README.md) | selected as final candidate | See report |
| [transport-prototype-01](before/prototypes/transport-prototype-01/README.md) | intended dependency bypassed | See report |
| [transport-prototype-02](before/prototypes/transport-prototype-02/README.md) | historical search exhausted without a solution | See report |
| [transport-prototype-03](before/prototypes/transport-prototype-03/README.md) | intended design requirement not met | See report |
| [transport-prototype-04](before/prototypes/transport-prototype-04/README.md) | outside the declared verification contract | See report |
| [transport-prototype-05](before/prototypes/transport-prototype-05/README.md) | selected as final candidate | See report |
| [combined-prototype-01](before/prototypes/combined-prototype-01/README.md) | historical search exhausted without a solution | See report |
| [combined-prototype-02](before/prototypes/combined-prototype-02/README.md) | intended dependency bypassed | See report |
| [combined-prototype-03](before/prototypes/combined-prototype-03/README.md) | selected as final candidate | See report |
| [Cantilever Key v1](before/prototypes/cantilever-key-v1/README.md) | bypass investigation retained | See report |

## After revision: prototypes

| Case | Recorded status | Witness inputs |
| --- | --- | --- |
| [Borrowed Bay attempt-01](after/prototypes/attempt-01/README.md) | intended dependency bypassed | See report |
| [Borrowed Bay attempt-02](after/prototypes/attempt-02/README.md) | intended dependency bypassed | See report |
| [Borrowed Bay attempt-03](after/prototypes/attempt-03/README.md) | historical search exhausted without a solution | See report |
| [Borrowed Bay attempt-04](after/prototypes/attempt-04/README.md) | intended dependency bypassed | See report |
| [Borrowed Bay attempt-05](after/prototypes/attempt-05/README.md) | selected as final candidate | See report |

## Attributed official-mechanism references

| Case | Recorded status | Witness inputs |
| --- | --- | --- |
| [HxH mechanism reconstruction](references/hxh/README.md) | historical reference checks passed | 26 |
| [GxE mechanism reconstruction](references/gxe/README.md) | historical reference checks passed | 41 |
| [GxF mechanism reconstruction](references/gxf/README.md) | historical reference checks passed | 219 |
| [HxH sealed extraction](references/hxh-sealed-extraction/README.md) | historical checks passed | 16 |

## Publication scope

The public edition preserves the indexed maps, specifications and contracts when recorded, primary verification reports, selected original screenshots, iteration findings, and version provenance. English display titles and portable placeholders replace a few local metadata strings. Nonessential calendar dates and local stack paths are omitted; version commits identify the comparison boundary. Every room ID, dimension, and cell token matches the local archive.

The full local bundle additionally contains repeated installation snapshots, development scripts tied to the original machine, and raw historical documentation. Those machine-dependent copies and the large ZIP are not added to Git. Published skill history is linked in the version guide; it is not mislabeled as the exact installed snapshot used by every author.

The three official references are user reconstructions, with recorded differences from upstream. The fourth reference is an earlier sealed HxH extraction. GxE has no gem and uses the explicit passage endpoint `(2,13,0)`. Read its case description before interpreting a solve result.

Historical reports retain their original evidence scope, including failures, successful bypasses, and search caps. A reported route establishes feasibility under the recorded engine; it does not certify shortest paths, every deadlock, a unique sequence, or human difficulty. Preparing this public edition did not rerun the historical searches.
