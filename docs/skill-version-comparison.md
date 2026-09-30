# Version provenance and comparison

"Before" and "after" refer to the **revision based on three saved official-mechanism reconstructions**. They do not mean that every earlier map was created with one identical skill version.

## Published versions

| Version | Repository snapshot | Meaning |
| --- | --- | --- |
| Before revision | [`a6ec285`](https://github.com/DasbootU9607/Maze-Harness/tree/a6ec28592458c0cefed526e209b8de95c4fb8db9/skills) | The public repository before this refinement |
| After revision | [`5b547cd`](https://github.com/DasbootU9607/Maze-Harness/tree/5b547cdee32d5ee529046ff96879f5ed2df874fe/skills) | Published refined instructions, reconstructed references, and completed Borrowed Bay example |
| Change view | [Compare the two revisions](https://github.com/DasbootU9607/Maze-Harness/compare/a6ec28592458c0cefed526e209b8de95c4fb8db9...5b547cdee32d5ee529046ff96879f5ed2df874fe) | The actual public source changes |

The local review archive also preserves the skill folders actually read during the earlier four-map trial and the installed folders immediately before editing. Those are separate provenance sources. They are not assumed byte-identical to the public pre-revision commit. Raw installation copies and machine-dependent development files are not republished here.

The earlier trial's recorded `SKILL.md` fingerprints remain in [trial-context.json](../examples/skill-comparison/before/trial-context.json):

| Skill | SHA-256 of the recorded trial input |
| --- | --- |
| Boundary Stagger | `b0d121977026f96ad3aa432709a48fdb9b2ef9064b44c11aff45ca3ae771d0ff` |
| Hook Transfer | `a5202e0dc07cce81806478b5e6100700a8f90384f776d1d7a230fa44ef3ba1d4` |
| Constrained Transport | `7c25b42e8c027b618b829e8ce57781bbc43b531d296aad39aad8e2dcdccd362c` |

These fingerprints identify recorded input files; they do not make the public older commit an exact substitute for those files.

## What to compare

- Read each `SKILL.md` for changes to the construction procedure, supported scope, and deliverables.
- Read the three `planning-depth.md` references for preparation, stance, clearance, restoration, and changing use of shared space.
- Compare the saved HxH, GxE, and GxF analyses with the actual maps and scoped exclusions.
- Examine Borrowed Bay and its unsuccessful candidates for a concrete application of the revised guidance.
- Check whether successful bypasses are retained and whether claims are narrowed appropriately.

Language changes and a longer document are not evidence of better authoring. More walking inputs are not evidence of deeper planning.

## What the cases can establish

The earlier four-map trial was assisted authoring in the skill-development conversation, not a fresh isolated agent evaluation. The later Borrowed Bay trial used an independent authoring task with the revised skills, but it was only one trial, with iterative repairs and no matched no-skill baseline.

The after-revision published package already includes the completed Borrowed Bay map, explanation, and solution evidence. It is a final delivery snapshot, not an answer-free snapshot of the exact materials available before that authoring task. Do not use it to claim that a later reproduction of Borrowed Bay is unseen generalization.

Use the [case collection](../examples/skill-comparison/README.md) to review concrete behavior and the [review guide](reviewing-skills.md) to plan a separate controlled comparison.
