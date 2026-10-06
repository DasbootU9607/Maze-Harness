# Skating Cross mechanism logic

Read this extraction first for new authoring. Its source is the complete **user-authored** reference map, not an upstream official level. Consult [the user case](user-case.md), [states](user-states.json), and [checks](user-checks.json) for detailed evidence or physics questions. Maintaining the extraction requires full source analysis. [The original design](user-design.json) is reproduction/regression material; [the empty contract](design-template.json) carries no source geometry.

Distinguish **necessary in the case**, **witness choice**, **selected state**, and **unconfirmed**. Official-engine replay does not change the map's provenance. The full objective is gem collection followed by alive arrival at the declared in-room doorway, not passage into a neighboring room.

## Roles and interactions

### sc-directed-braking

The player and one rigid cross slide on ice. A stationary member immediately beyond a slide's endpoint supplies a brake and hence a usable turn or subsequent input. Passing over a cell does not make it a pushing stance. Stopping relations are directed and retain gem state; do not replace them with undirected walking regions.

**Selected state:** input 133 stops at (3,8) below the right arm (3,7), then input 134 follows the gem row to its wall stop. [Final-chain analysis](user-case.md#connected-final-functional-chain) and [states 133/134](user-states.json) identify the member and ray. **Necessary in the case:** freezing the cross or excluding static multi-cell cross-braked slides prevents the full objective, as established in [checks](user-checks.json). This is not a proof that every arm must brake every solution.

## Movement preconditions

### sc-full-footprint-slide

A reachable input face is only one part of a push. Check the complete rigid footprint, swept clearance, support, and the actual member/terrain pair that ends the whole group's slide. Preserve directed entry, the next pushing side, and retreat after changing pose. All members participate in collision; checking only the center or contacted arm is insufficient.

**Selected states:** at 111 the right arm's next destination (14,4) is a wall; at 117 a different wall (13,8) ends the downward slide; at 124 the left boundary stops the lateral reset. [Motion records and stage states](user-states.json) establish these endpoints using ordinary inputs. The source's exact wall cells and one-cell arms are not universal stopping requirements.

## Structural functions

### sc-arm-functions

The center connects four nonempty contiguous arms in the supported planar profile. Arms can supply input faces, remote collision stops, player brakes, or temporary route occupancy. One member may serve several functions at different poses. Changing an arm changes the whole footprint and may change support, clearance, endpoints, and accessible stops.

**Selected states:** the final chain inputs the lower, left, and upper arms in succession and later brakes on the right arm. [Case chain table](user-case.md#connected-final-functional-chain) provides those roles. **Unconfirmed:** neither global arm minimality nor necessity of each source member was established by deleting it. Variable positive arm lengths are supported, but require fresh full-slide and stop-graph verification; an arm-deleted shape is unsupported by this profile.

## Causal dependencies

### sc-pose-preparation

Preparation changes reachable stops and input faces; the next full-group pose enables another pushing side; final clearance retains a useful brake and the doorway route. Parking/restoration matters when its intermediate pose enables work and later recovery remains possible.

**Necessary in the case:** right docking precedes the first usable down-alignment opportunity, and down alignment precedes clear-ray opportunity, with goal bypasses and positive controls in [checks](user-checks.json). Restoration to lower docking after western parking is history-conditioned; it does not require every solution to visit the western pose. **Witness choice:** centers at inputs 13/22/30/31 and the D/L/R/U order are one route. `rejectedDirectionalOrderClaims` retains alternative-prefix counterexamples. **Selected state:** after collection the frozen cross still permits doorway return; further pushing after the gem is not a source requirement.

## Allowed variations and verification obligations

Preserve genuine directed ice stopping, full-body sliding limits, functional arms, changing pushing sides, connected preparation, a cleared objective ray with a retained turning stop, and the complete return objective. Re-derive walls, floor/ice arrangement, start/doorway, gem, poses, arm lengths, parking, and restoration. The 138-input witness, 23 motions, event coordinates, and compass sequence are not quotas or templates.

Map each chosen relation ID to this map's initial members and boundary/passage/stance cells in `inherited`. Verify full completion, cross/brake necessity, directed frozen stop graphs, actual next inputs, and declared positive/restricted pose dependencies. Use analyzer history for conditioned restoration and retain selected-state scope. [Complex verification](complex-validation.md) preserves the one-cross profile and unknown results for caps, exceptions, or unsupported mechanics.

New physics or an invented mechanism is unnecessary. Mirroring, translation, renaming, one longer arm, or longer slides alone does not establish substantive change. Describe the newly derived stopping/access/preparation realization and limit any effectiveness claim to the actual application evidence.
