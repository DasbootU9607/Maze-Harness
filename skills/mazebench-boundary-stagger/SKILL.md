---
name: mazebench-boundary-stagger
description: Design, build, and structurally verify MazeBench boundary and offset puzzles. Default to connected preparation and dependent route opening, with full HxH case evidence. Choose shapes and coordinates autonomously. For authoring, not model evaluation.
---

# Boundary Stagger

Build mechanisms where changing the relative placement of independent rigid groups releases a move, pushing position, or walking route constrained by a fixed boundary. A visible opening or two moved objects alone does not establish this mechanism.

## 构建前必读与默认复杂模式

使用本 skill 构建或迭代关卡前，必须读取 [官方案例与机制分析](references/official-case.md)，并检查其中用于本次构建的关键状态和空间关系。先列出本次设计继承的必要机制、前置条件、阶段依赖与可变部分，再进入形状选择、坐标布局和地图生成。不能只依据 SKILL.md 中的抽象摘要完成构建。默认按多步推理要求构建，不能仅靠一次错位、一次释放或一次接触后只走路通关。

由本 skill 流程负责读取对应内部案例；只读取当前使用的案例，不默认加载另外两个。相同版本已实际读过可复用，文件名/链接/摘要不算已读。构建记录注明路径、内容指纹和继承关系；读取记录不能代替机制必要性和绕过检查。

默认采用复杂房间模式，布局前还必须读取 [planning-depth](references/planning-depth.md) 和 [复杂合同及验证接口](references/complex-validation.md)。先建立精简设计合同，再布局。至少三个相互依赖的有效功能阶段；走路、同向重复推、独立障碍各移开一次和无作用往返不计。合同须覆盖全部成员与高度、固定边界/空洞/支撑、各阶段可达区、完整阻挡目的地/站位、解除动作、需恢复的空间、关键输入/接触与后续工作。每个变化注明原功能由新图何处承担。

复杂模式使用 `scripts/build-complex.cjs` 和 `scripts/verify-complex.cjs`。它与旧基础 profile 分开；旧 `build.cjs`/`verify.cjs` 和固定 fixtures 继续验证原有范围，通过不能作为默认复杂房间验收。明确要求局部演示/复现时可用旧流程，并标注其分类。复杂模式证据缺失、未支持输入或搜索上限为 unknown，不能通过。


## Design from the goal

Choose shapes, roles, boundaries, player start, and gem position from the requested goal. Unspecified geometry is a design choice. Respect explicit user constraints.

1. Identify the connected route or pushing position to unlock. Check the initial walking region with objects frozen.
2. Identify the exact blocked destination or inaccessible pushing face. Account for every member of the rigid group and every group added by contact propagation.
3. Choose the independent displacement that changes this restriction. State what contact, occupied cell, or clearance it removes before choosing a silhouette.
4. Connect functional shape parts and reserve real circulation between pushing faces. A prong, recess, stem, or crossbar needs a concrete role.
5. Construct a reachable initial state. Temporary parking must retain a later extraction face; reverse planning does not grant pulling.
6. Solve, replay, and test the stated dependency and boundary role. Repair the actual obstruction or bypass rather than adding unrelated obstacles.

Read [Design](references/design.md) for geometry and failure diagnosis. For default complex authoring, read [Planning depth](references/planning-depth.md): connect preparation, the dependent operation, and later clearance or restoration. A longer approach does not add planning by itself.

## Rules and scope

- Use the official Toolbox, parser, save services, engine, and solver. Same M ID means one rigid group; separate IDs interact through current contact. Do not invent pulling, object rotation, binding, or diagonal squeezing.
- The legacy basic checker supports one 16-by-16 room, two independent M0-M4 groups, one player and gem, floor/wall terrain, and z=0 motion. It rejects void, extra layers, other mechanics, extra groups, and room transitions. Adapt and validate a checker before claiming broader coverage.
- Keep feasibility, use of a mechanism, full-goal necessity, and preparation order separate. A successful witness proves only that route. Exhausted restrictions prove only their specified exclusions; capped searches are unknown.
- Link the boundary to the cross-group dependency. The legacy basic contract requires the same wall intervention to admit a blocked group push and allow the full goal without a declared preparation. Wall removal may also change walking access; disclose that effect.
- For composition, use [the interface guide](references/composition.md) and revalidate the combined map. Companion skills are optional; this package runs independently.

## Build and deliver

Default new authoring uses the complex contract and entrypoints in [Complex validation](references/complex-validation.md). Use [official-design.json](references/official-design.json) as a runnable schema example, then author the new geometry and its own evidence:

```text
node scripts/build-complex.cjs --repo ENGINE --spec SPEC.json --out NEW_BUILD_OUTPUT
node scripts/verify-complex.cjs --repo ENGINE --spec SPEC.json --out NEW_CHECK_OUTPUT --cap 1000000
```

Use the following basic workflow only for an explicitly requested compact mechanism demonstration or a supported legacy profile. Label that result accordingly; a basic pass does not certify default complex authoring.


Read [Usage and contracts](references/usage.md), author a complete cells specification, and run from this skill directory:

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_OUTPUT
node scripts/verify.cjs --repo ENGINE --out NEW_OUTPUT --cap 300000
```

The builder creates a fresh local draft. Deliver Play/Edit links, Build JSON, a mechanism explanation, a replayed route, and scoped dependency evidence. For key moves, show player/group poses, contacts or blocked destinations, relative offsets, and changed walking regions.

Preserve existing maps and engine code. Do not launch evaluated models, paid evaluations, or remote publication as part of this authoring skill. Report intended difficulty separately from any human playtest findings.
