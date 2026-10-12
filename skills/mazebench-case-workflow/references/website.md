# Website completion

For the Maze Harness project, the owner has explicitly requested ongoing website updates after completed skill construction and verified playable-trial generation. This is part of delivery, without another website prompt. Other destinations follow their own authorization. Preserve the case-specific human-input gate and finish the package and gameplay checks first.

Locate the Maze Harness Git checkout used for the task, including when running an installed copy of this skill. Read its `AGENTS.md` and `docs/website.md`. Use repository automation rather than duplicating publishing code in installed skill packages. Do not include local checkout paths or raw workflow records in distributed files.

From that checkout, register a finished skill or reference-library update:

```text
node scripts/publish-site.cjs --engine ENGINE --skill mazebench-mechanism
```

After generating and verifying a new playable example, use the actual outputs:

```text
node scripts/publish-site.cjs --engine ENGINE --skill mazebench-mechanism --spec DESIGN.json --build BUILD_OUTPUT/manifest.json --verification CHECK_OUTPUT/verification.json
```

The publisher discovers official reference designs and matches their unmodified maps against the 256-room world, updates the skill page and room highlights, preserves earlier examples, captures missing thumbnails from the actual 3D player, replays saved routes, checks packages and pushes to `main`. GitHub Actions then deploys Pages. New examples require a matching passed report; source/contract mismatches and unknown results stop publication. Do not create a fake report to bypass the gate. Use a compatible verifier and complete the design instead.

Carry the website completion section in the mechanism entrypoint template into new skills. This makes later ordinary map generation finish with the same publication step without invoking this case-analysis workflow again. Optional `references/website.json` supplies concise editorial descriptions; absent metadata uses the package title and description. It is not a new human-input requirement.

The publisher stages only website files, the named skill and its README entry. If broader task changes are present, finish their required checks, commit those intended changes separately under repository rules, then rerun publication. A rejected push, divergent branch, missing asset, stale report or failed deployment is a concrete failure to resolve or report; preserve all work and do not force-push. Respect an explicit request to keep a particular task local by using `--prepare-only`.

Check the `Deploy GitHub Pages` run for the pushed commit using GitHub Actions, and verify the resulting skill and player links. If the commit contains no changes, report the existing published links. Do not claim that a queued or failed deployment is live. Report the skill page, example links and any actual validation limitations.
