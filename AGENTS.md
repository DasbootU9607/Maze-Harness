# Skill authoring conventions

These rules apply when creating or updating skills in this repository. Follow explicit user instructions when they override a convention.

## Names and source provenance

- Use `skills/mazebench-<mechanism>/` with lowercase ASCII letters, digits, and single hyphens; keep the complete name under 64 characters. The folder name and frontmatter `name` must match.
- Use `MazeBench <Mechanism in Title Case>` for the `SKILL.md` H1 and `agents/openai.yaml` display name. Use that same title in the README skill table. The default prompt must invoke the current `$mazebench-<mechanism>` name.
- Use lowercase, hyphen-separated resource filenames. Keep the conventional names `SKILL.md`, `AGENTS.md`, `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, and `agents/openai.yaml` where applicable.
- Identify case provenance in resource names: `official-*` for upstream official cases, `user-*` for user-authored cases, and `authored-*` for newly created fixtures. A case family uses `<source>-case.md`, `<source>-world-map.txt`, `<source>-design.json`, `<source>-states.json`, and `<source>-checks.json` when those artifacts are needed.
- Calling the official parser, engine, or solver does not make a user-authored map official. Describe modified excerpts, reconstructions, and generated fixtures accurately; do not label them as unmodified official cases.
- When renaming, update local links, code paths, JSON source paths, README entries, and invocation prompts together. Preserve existing engine profile identifiers and schema keys unless the task explicitly changes their interface.

## Language and files

- Write maintained instructions, metadata, comments, JSON explanatory strings, and repository documentation in English. User-facing conversation may follow the user's language. Preserve original source-map bytes and necessary literal quotations instead of translating evidence.
- Write UTF-8 without a BOM, use LF and a final newline, and format JSON with two-space indentation. Raw `*-world-map.txt` source evidence is exempt from text normalization.
- Use YAML frontmatter with a concise `name` and `description`. Quote string values in `agents/openai.yaml`; keep its title and prompt consistent with the entrypoint. Use a short UI description of 25-64 characters.
- Keep packages self-contained. Use relative links, put detailed guidance in `references/`, and add helpers in `scripts/` only when they support actual repeated work. Exclude personal identifiers, absolute local paths, dates added for authoring history, reports, build outputs, archives, and credentials from distribution.

## Evidence and licenses

- Preserve original maps, coordinates, mechanics, goals, replay routes, counterexamples, search results, and scope when editing wording or names. Record source paths, engine commits, and map SHA256 values in case documentation.
- Refresh a runnable design's `readReceipt` after its case document changes. Preserve historical report fingerprints; record the current packaged design separately in `packagedDesign` with `cells`, `contract`, and `case` SHA256 values. Do not claim old checks were rerun merely because wording changed.
- New authoring reads extracted `references/mechanism-logic.md` before geometry and records that document's current version. Maintainers analyze complete cases; reproductions may retain current case receipts. Receipts establish version consistency, not reading, understanding, or necessity. Keep complete case designs as regression evidence and new-map scaffolds free of case cells, coordinates, events, and routes.
- Retain applicable license text and copyright notices for adapted material. Add a separate third-party notice only when it contains necessary information not already preserved in the package license or case provenance. Generated drafts carry the licensing requirements of resources copied from the separate engine installation.
- Preserve scope and uncertainty: legal completion, mechanism necessity, preparation dependencies, and human difficulty are separate claims. Search caps, exceptions, and unsupported profiles remain unknown.

## Required checks

Run `node scripts/check-skills.cjs` from the repository root before completing any skill edit. It checks names, language, encodings, metadata, local links, case families, map hashes, reading receipts, and current package fingerprints. The same command runs in GitHub Actions.

Run `node scripts/test-read-records.cjs` for reading/contract changes. Add `--repo ENGINE --out NEW_OUTPUT` for complete original-route replay through the separate official engine. Format acceptance does not establish the migrated declarations or physical stage semantics; affected gameplay claims still need their scoped verifier.

For helper or behavior changes, also run the affected helper and replay or verify the relevant case using a separate MazeBenchEngine checkout and fresh output directories. For wording and naming changes, check that the original maps and mechanical JSON fields are unchanged and replay the existing complete routes. Report what was checked and any limits; do not launch paid evaluations or publish generated game content without authorization.
