# Verification and limits

Run the implemented reference helper from the skill directory:

    node scripts/verify-reference.cjs --repo ENGINE --out NEW_OUTPUT

The output directory must not already exist. The helper checks the engine commit and bytes, official Git blob/map hash, complete parsed initial-state hash, cells, case reading receipt and supported profile. It executes all 177 ordinary inputs, checks a live player at (15,10,0), verifies the witnessed turning/bridge event, and saves complete selected states.

Three local controls run on explicitly derived snapshots: remove M0 from the occupied gate after step 34; remove the floor from the occupied gate after step 55; swap the blue/floor order before step 100 and apply RR. The positive ordinary actions remain runnable. These controls test local occupancy and actor-order consequences. They do not establish whole-room necessity, unique preparation order, all first-contact histories, shortest paths or human difficulty. Removed/swapped snapshots are never labeled additional official rooms.

The reference design includes source bytes, all actors, the complete terrain, a full goal, stable relation IDs, actual witness events and the original route. The full problem was initially searched with a 300000-state and 30000-ms bound; it timed out, then a browser demonstration supplied the accepted effective route. Recording metadata does not authenticate a human or calibrate difficulty. The private transcript is not distributed.

The profile official-bridge-convoy-v1 is a reference regression, not a generalized authoring verifier. The empty new-map template deliberately has no geometry, events, stages, dependencies or witness. Unsupported combined mechanics must remain unknown until a compatible observer is implemented. No new map was generated or checked in this task.

Package fingerprints refer to the current cells, contract and case document. Reading receipts establish version consistency only. Refresh these after case/contract changes; do not alter historical evidence to suggest unchanged checks were rerun.
