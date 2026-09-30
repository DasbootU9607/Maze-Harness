# Planning through a changing workspace

Use this guidance for requests for difficult, thoughtful, multi-stage transport. These design lessons are inferred from the reconstructed GxF and official engine behavior; they are not an account obtained from the original author or a human difficulty calibration.

## What GxF adds

The [fresh GxF analysis](gxf-case.md#movement-in-opposing-directions) has 219 inputs, 42 push inputs, and 21 compressed push runs. The stronger evidence is directional: the tool and M1 each need U, D, L, and R somewhere on a successful route; M2 needs L and R. Each direction was excluded in a separate exhausted search. M2's vertical directions are avoidable.

Thus the tool cannot simply advance toward delivery while each helper is cleared once in one direction. Space and pushing faces have to be used in changing arrangements. This does not prove the witness's exact parking places or order, and the original 43-push witness remains valid.

## Build purposeful temporary work

Start at the operable delivery state, then design backward. For each stage, record the current full tool pose, helper poses, reachable player region, blocked next move, and the change that enables it.

Choose a complication that follows from those constraints:

- **Temporary parking with recovery:** the tool or helper leaves a useful lane, making room for another motion, and can later be pushed out. Reserve a real recovery face and a way to reach it.
- **A helper with successive roles:** the same object first releases tool clearance, then needs another placement to release player circulation or a later tool translation. Repeated use must do new work.
- **A deliberate retreat:** a move away from the destination allows a stance change or another object to cross the shared workspace. Explain the newly available action, not just the increased distance.
- **Competing space needs:** a bay or aisle is needed by different objects or by the player at different times. The arrangement after one operation must permit the next arrangement.

Use only the complications the room needs. A useful initial target is several connected preparation, rearrangement, and delivery stages with at least one temporary move that must be resolved later. A row of independent blockers moved once each is a weak response to a request for deep planning. Show the conflict that requires the extra work, and revise the layout if a bypass eliminates it.

Do not confuse tool alignment with delivery. GxF's recorded tool aligns after input 208, while the player only reaches its input stance after 210. Check the complete footprint, support, next pushing face, and circulation after every substantial arrangement change. A parking pocket without a reachable exit face is a trap, not a planning stage.

## Test the claimed depth

1. Verify the full objective through ordinary engine moves. Explain functional stages after omitting walking and compressing repeated same-direction group pushes. This is a witness summary, not a lower bound on decisions.
2. Run the normal helper, tool, use-event, and delivery checks in [verification](verification.md). A helper that can stay frozen is not a necessary helper under that goal.
3. If claiming a required retreat or repeated directional use, exclude each opposing direction separately. Exhaustion in both establishes movement both ways, not a unique reversal count, exact return cell, or order.
4. For a claimed prerequisite to first delivery or first use, test that endpoint with the prerequisite forbidden and include the goal as a possible bypass. Use a positive control. An exact delivery pose is narrower than all possible usable poses; disclose that scope.
5. Recheck the whole room after adding an exit, wall, helper, or neighboring module. A new pushing face can silently bypass the transport problem. Declare direct tool-to-target use versus a relay, and use evidence that matches that contract.

Match the endpoint to real progress. After an initial retreat, a forward push can simply return the tool to its starting pose. Testing the first forward push would not test entry to the next workspace. The authored [Borrowed Bay example](borrowed-bay.md) uses an explicit position threshold and the gem as a bypass; its scoped checker illustrates this distinction, coupled wall controls, and post-contact checks for a three-group room.

Record each dependency and its evidence, plus complete counterexample routes and capped searches. Do not rank rooms by input count or expanded states. Human review should ask whether players anticipated future pushing faces, used recoverable parking, and changed their plan when a useful current arrangement conflicted with a later need. Without those observations, claim verified planning constraints and intended difficulty, not proven player difficulty.
