# Maze Harness website

The buildless website lives in `site/`. GitHub Actions validates it and publishes that directory to [GitHub Pages](https://dasbootu9607.github.io/Maze-Harness/). No backend, remote game server, CDN, or runtime package installation is required. All asset and navigation URLs work beneath the `/Maze-Harness/` project path.

## Content

| Skill | Official rooms | Existing authored trial | Original local draft |
| --- | --- | --- | --- |
| Boundary Stagger | HxH | Shiftlock Vault | `draft-depth-972ac6fc10` |
| Hook Transfer | GxE, FxE | Offset Gallery | `draft-depth-bb5740533c` |
| Constrained Transport | GxF | Borrowed Aisle | `draft-depth-0c26344924` |
| Skating Cross | JxG | Glacier Turn | `draft-skating-52a89ba3c6` |

These are existing four-skill playtest maps, not newly generated examples. Official map bytes are checked against the references distributed with the skills. The full 256-room world matches the separate official local installation's source maps and game runtime. The website records the source engine commit `0ac96b8a2648db09f375989cd7bc33699222c1e6` and SHA256 fingerprints in `site/data/provenance.json`.

The source maps and exported level states are unmodified. Twenty official rooms contain no player token because they normally receive a player from a neighboring room. For a direct jump only, `room-entry.js` adds an arrival actor at an unoccupied, matching floor boundary with a verified legal inward move. The catalog records its adjacent source room. Normal doorway transitions still consume the original room JSON and use the engine's player-transfer logic. Reset restores the current entry state. Collected gems are stored per world in local browser storage, as in the original engine.

Saved solutions cover all nine examples and total 738 inputs. These are witnesses, not shortest-path or difficulty claims. Skating Cross routes include the post-gem return; GxE uses its documented passage-reaching goal.

## Local preview

Run from the repository root:

```sh
node scripts/serve-site.cjs
```

Open `http://127.0.0.1:4173/Maze-Harness/`. Set `PORT` to choose a different port. The preview intentionally serves a project subpath so broken absolute URLs are caught locally. Opening HTML files through `file://` is not supported because the player fetches room JSON and ES modules.

## Validation

```sh
node scripts/check-site.cjs
node scripts/check-skills.cjs
```

The site check initializes every official room with the vendored engine, validates all 20 direct entries, replays all nine complete saved solutions, checks the five skill mappings, and validates assets, licenses, and source fingerprints. It runs on every website push and pull request before deployment.

Browser integration checks require a separate engine checkout with `playwright-core` installed and Chrome available:

```sh
node scripts/test-site-browser.cjs --engine PATH_TO_ENGINE
```

This checks desktop and mobile layouts, all four skill pages, atlas navigation, a real block push and undo/reset, natural AxA-to-AxB traversal, the 20 rooms without a predefined player, deep-link refresh, all 135 authored-route inputs against the engine, and solution playback. It blocks external network requests to verify all gameplay resources are bundled. Screenshots and reports stay in ignored `outputs/site-browser/`.

## Refreshing engine data or examples

Use an explicitly selected engine checkout and the original four-skill trial directory containing `maps.json` and the four design JSON files:

```sh
node scripts/export-site.cjs --engine PATH_TO_ENGINE --trials PATH_TO_TRIALS
node scripts/capture-site.cjs --engine PATH_TO_ENGINE
node scripts/check-site.cjs
node scripts/test-site-browser.cjs --engine PATH_TO_ENGINE
```

The exporter preserves geometry, copies the original 3D assets and runtime, records precise source hashes, and makes small guarded hosting adaptations: relative module and image URLs, JSON file URLs, query-based navigation, rectangular touch-button hit targets, and an opt-in opening flyover. It fails if the upstream patch anchors change or official references differ. It never edits the engine checkout or the source trials. The thumbnail script captures the actual 3D player, not a separately drawn approximation. Keep `.gitattributes` so original source-map bytes and runtime hashes survive checkout on different platforms.

The white interface uses self-hosted Geist Sans, Mono, and Pixel fonts. Their license, the engine license, and the Three.js notices are included in `site/licenses/`. The original game palette is retained inside the 3D viewport. The design references are [agent-browser](https://agent-browser.dev/) and [skills.sh](https://skills.sh/).

## GitHub Pages

Repository Settings → Pages must use **GitHub Actions** as its source. `.github/workflows/pages.yml` validates the site, uploads `site/`, and deploys through `actions/deploy-pages`. A successful deployment is available at `https://dasbootu9607.github.io/Maze-Harness/`. No custom domain or server credentials are needed.
