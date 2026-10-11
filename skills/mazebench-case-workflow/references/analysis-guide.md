# Analysis and evidence

Complete one analysis per human-supplied case before synthesis. The [case template](../assets/case-analysis.md) fixes the record structure; the analysis below determines its substance.

For human or agent-authored variants, preserve their actual source, parent and changes; verify the child independently using the official engine. Analyze retained functions and new bypasses before treating it as another realization of the same skill. After analysis, use [the reference-library rubric](reference-library.md) to place it provisionally or with actual user/playtest evidence. Its tier is distinct from mechanism necessity and does not inherit from the parent.

## 1. Source identity and initial conditions

Resolve the room ID through `games/maze/world_map.json`, then preserve the complete original level file. Record the engine commit, parser/configuration version, original path, map-byte SHA256, coordinate axes and units. Determine whether the case is the unmodified official room, a reconstruction, a saved state, or a cropped demonstration. Maintain separate provenance for derivatives. Do not silently change walls, terrain, group IDs, omitted groups, or player positions to simplify analysis.

Inspect token definitions, parsing, state creation/reset, and relevant world-transition code. Trace each actor's initial position and elevation to its actual origin. Distinguish a player authored in the room, a player transferred from an adjacent room, and a restored or explicitly specified state. An official room without a player token does not authorize inventing a spawn. A world-map click and a legal door crossing may initialize differently. Reproduce the intended entry context and preserve its state snapshot; ask only if choosing an entry changes the requested mechanism and the context does not identify it.

Record every member of every rigid group, all players/clones when applicable, gems, devices, support, floor, ice, walls, slopes, voids, exits, flags and dynamic state relevant to the case. Check the complete room, including preparation areas outside the visually striking mechanism. A list of centers or a screenshot is insufficient.

## 2. Complete objective and operational rules

State the actual endpoint: gem collection, passage access, a return to a doorway, another state predicate, or a genuine room crossing. Separate official win predicates from the user's analysis objective. A gem-free `isSolved` result does not prove a passage was reached; collecting a gem does not prove a requested return. Record the initial state and entry assumptions alongside the objective.

Use a rule table with **condition -> official transition -> prohibited inference -> code/evidence source**. Read only relevant physics, but cover all physics used by the case: input processing, full rigid movement, directional contact propagation, support/loss/removal, slopes/elevation, ice stopping, devices and room transitions as applicable. Cite source path and function at the pinned commit, plus observed state transitions. Do not infer pulling, free rotation, binding or one-cell ice movement from appearance. Same rigid ID, contact-driven co-motion, and later separation are different relationships.

For same-elevation unit pushes, identify player P, input member I, working member C, target member T and direction d where relevant; verify I=P+d and C+d=T in the ordinary pre-action state. These equations are not a universal observer for sliding, height changes or multi-step movement. Inspect intermediate transitions and the complete footprint with a matching observer for those profiles. Passing through an ice cell does not establish a stop, turn, or pushing stance.

## 3. Replay and key-state extraction

Find or reuse a route with matching map, engine, entry state and complete goal. Replay it through ordinary official actions from the actual initial state. Record the command, profile, input sequence, complete final-state predicate and result. Solver transitions alone are insufficient if the optimized representation omits motion detail. Preserve ordinary replay counterexamples. Do not invent a route when search caps.

Extract key events at changes of function, not every walking step. Include:

- Pre-state: all affected members/elevations/flags, reachable input stances, support, boundaries, blocked destinations and unavailable approaches.
- Action: ordinary input, actual primary input member, propagated contacts and complete-group displacement or removal.
- Post-state: all affected members, player state, newly available stance/stop/route, lost access and remaining work.
- Causal link: which precondition this action changes for the next functional operation, with replay or probe evidence.

Trace the full preparation -> operable interaction -> consequence -> subsequent work -> complete objective. An aligned tool without a reachable stance and legal next action is not delivered. An opening alone does not prove a usable route. Independent approach work, recovery, reconfiguration, and role changes must not disappear when extracting the central interaction.

## 4. Shape and environment functions

Assign functions to input parts, working parts, connectors, openings, spans, braking surfaces, helper protrusions, recesses, boundaries and support areas. Explain the actual constrained move or stance and how a change releases it. Evaluate full footprints, heights, collision clearance, support, arrival and retreat; a center path is insufficient.

Separate inherited function from one realization. Coordinates, direction order, exact silhouettes, group count, route length and a particular parking pose are not automatically invariants. A changed member can affect contact, collision, support and stance access at once; a local ablation cannot isolate one function unless the other effects are controlled. Do not assert global minimality from a small selected-state test.

## 5. Evidence ladder and counterfactuals

| Claim label | Required basis | Limit |
| --- | --- | --- |
| Source rule | Pinned code path/function and relevant state semantics | Applies to the stated engine/version/profile |
| Witness choice | Complete legal replay with the observed event | Establishes one realization, not necessity or unique order |
| Selected state | Ordinary probe/restricted search from the named state | Does not quantify over other histories |
| Necessary in this case | Reachable positive control plus exhaustive compatible restriction search for the same initial state and endpoint | Map-, objective-, restriction- and profile-specific |
| Unconfirmed | Capped, unsupported, failed or absent check | Must not appear as a proved invariant |

Design checks around the claim: freeze a role, exclude actual member contact, forbid preparation, remove a proposed braking relationship, or test the full return goal. For a preparation claim, test a real executable next-event opportunity with a reachable positive control, disallow premature triggering, and include the complete goal as a bypass endpoint. A decorative event counter or an impossible opportunity can make a false dependency appear necessary.

Keep legal completion, actual mechanism use, necessary mechanism use, preparation dependency, unique ordering and human difficulty separate. Exhausted restrictions can support only their stated claim. Caps, unsupported profiles and exceptions remain unknown. Record routes from successful restrictions and revise claims that they disprove. Selected-state freezes cannot establish every first-contact history. An individual direction restriction does not prove a precise sequence or return pose.

## 6. Relation extraction and integration

Give each proposed relation a stable lower-hyphen ID. Record the human focus it serves, functional roles, motion preconditions, action/contact, changed state, downstream effect, source case/event, evidence label, permitted variations and verification obligation. Write a concise mechanism explanation before choosing a new layout. Do not attribute the inferred rationale to the original designer without direct evidence.

For multiple cases, build a comparison table of shared relations, additional functions, incompatible assumptions and independent evidence strength. Roles belong to interactions: a target can become a tool. Combining planar contact with ice requires a compatible observer and renewed whole-goal checks; their separate passes are not a combined certificate. Keep optional variants conditional rather than requiring every case's actors, shape and stage sequence in every new room.

Use goal -> roles and relations -> player stance and actual contact -> rigid geometry/support/clearance -> layout -> complete-goal verification as the generated authoring order. The current mechanism skills default to at least three causally dependent functional stages for complex new rooms. Retain that authoring convention where applicable; it is not an official rule of physics or a universal measure of difficulty. Walking, repeated straight pushes, unrelated obstacles and purposeless returns do not create stages. Explicitly requested compact demonstrations and reproductions retain their own scope.
