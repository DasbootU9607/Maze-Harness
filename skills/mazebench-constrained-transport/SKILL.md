---
name: mazebench-constrained-transport
description: Design, build, and structurally verify MazeBench tool transport puzzles. Default to shared workspace changes, purposeful recovery, repeated helper roles, and usable delivery, with full GxF case evidence. For authoring, not model evaluation.
---

# Constrained Tool Transport

Build puzzles where a tool has a concrete purpose and reaching an operable working position is itself a puzzle. Plan the complete rigid footprint, helper configurations, and reachable pushing faces. A path for the tool's center or several objects moving together is insufficient.

## 构建前必读与默认复杂模式

使用本 skill 构建或迭代关卡前，必须读取 [官方案例与机制分析](references/official-case.md)，并检查其中用于本次构建的关键状态和空间关系。先列出本次设计继承的必要机制、前置条件、阶段依赖与可变部分，再进入形状选择、坐标布局和地图生成。不能只依据 SKILL.md 中的抽象摘要完成构建。默认按多步推理要求构建，不能仅靠一次错位、一次释放或一次接触后只走路通关。

由本 skill 流程负责读取对应内部案例；只读取当前使用的案例，不默认加载另外两个。相同版本已实际读过可复用，文件名/链接/摘要不算已读。构建记录注明路径、内容指纹和继承关系；读取记录不能代替机制必要性和绕过检查。

默认采用复杂房间模式，布局前还必须读取 [planning-depth](references/planning-depth.md) 和 [复杂合同及验证接口](references/complex-validation.md)。先建立精简设计合同，再布局。至少三个相互依赖的有效功能阶段；走路、同向重复推、独立障碍各移开一次和无作用往返不计。合同须覆盖全部成员与高度、固定边界/空洞/支撑、各阶段可达区、完整阻挡目的地/站位、解除动作、需恢复的空间、关键输入/接触与后续工作。每个变化注明原功能由新图何处承担。

复杂模式使用 `scripts/build-complex.cjs` 和 `scripts/verify-complex.cjs`。它与旧基础 profile 分开；旧 `build.cjs`/`verify.cjs` 和固定 fixtures 继续验证原有范围，通过不能作为默认复杂房间验收。明确要求局部演示/复现时可用旧流程，并标注其分类。复杂模式证据缺失、未支持输入或搜索上限为 unknown，不能通过。


## Work backward from use

The user supplies a goal and necessary constraints. Choose the tool, helpers, route, parking areas, player start, and gem position. Unspecified shapes and coordinates are design variables.

1. Define the useful target change and how it enables the objective. Check the tool-use relationship before adding transport restrictions.
2. Define operable delivery: the full tool footprint and elevation, the player's reachable pushing cell, and a legal input direction.
3. Derive transport stages from every member's destination, support, propagated contacts, and access to the next pushing face. Preserve circulation between stages.
4. Give each helper a causal role. Identify the blocked tool move, parking area, or stance that the helper releases. Independent repositioning must do useful work.
5. Construct an unprepared but solvable start. Include retreat, temporary parking, or helper reuse when it follows from the shared-space constraints.
6. Solve and replay the full task, record delivery and actual contact, and test claimed helper, tool-use, and preparation dependencies. Revise geometry from counterexamples.

Read [Design and composition](references/design.md) for stage interfaces and failure diagnosis. For default complex authoring, read [Planning depth](references/planning-depth.md): make useful configurations change across stages, with a concrete reason for temporary moves and recovery. Avoid a row of unrelated blockers removed once each.

## Rules and scope

- Use the official Toolbox, parser, save services, engine, and solver. Same M ID means one rigid group. Do not invent pulling, rotation, snapping, or permanent attachment; camera rotation does not rotate objects.
- Let the official engine determine complete footprints, contact propagation, and support. Void `+` differs from floor `.`. A supported overhang does not establish arbitrary spans or elevations.
- The legacy basic checker covers one enclosed 16-by-16 planar room, one player and gem, floor/wall/void cells, and 3-5 independent groups from M0-M4. A delivered tool directly pushes one target at the same elevation. Layers, slopes, ice, gates, clones, and room transitions are unsupported.
- A complete route, observed tool use, necessary tool use, and necessary preparation are distinct claims. Freezing a helper does not prove a unique order or exact parking pose. Capped and unsupported checks are not passes.
- Optionally combine boundary staggering for clearance released by offsets and hook transfer for useful contact geometry. The skills have separate responsibilities and no script dependency on each other. Revalidate the combined layout.

## Build and deliver

Default new authoring uses the complex contract and entrypoints in [Complex validation](references/complex-validation.md). Use [official-design.json](references/official-design.json) as a runnable schema example, then author the new geometry and its own evidence:

```text
node scripts/build-complex.cjs --repo ENGINE --spec SPEC.json --out NEW_BUILD_OUTPUT
node scripts/verify-complex.cjs --repo ENGINE --spec SPEC.json --out NEW_CHECK_OUTPUT --cap 1000000
```

Use the following basic workflow only for an explicitly requested compact mechanism demonstration or a supported legacy profile. Label that result accordingly; a basic pass does not certify default complex authoring.


Read [Specification and verification](references/verification.md), author custom `cells` and a matching `contract`, and use fresh outputs:

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_OUTPUT
node scripts/verify.cjs --repo ENGINE --out NEW_OUTPUT --cap 1000000
```

Deliver Play/Edit links, Build JSON, a concise mechanism explanation, a verified route, role assignments, the usable delivery state, and scoped restriction evidence. Report which passages and pushing faces survive each stage.

Preserve existing maps, artifacts, and engine code. Do not launch benchmark models, paid evaluations, or remote publication as part of this skill. Input count is not a human-difficulty score.
