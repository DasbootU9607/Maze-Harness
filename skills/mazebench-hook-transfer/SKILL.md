---
name: mazebench-hook-transfer
description: Design, build, and structurally verify MazeBench shape-dependent contact puzzles. Default to independent transport, usable docking, true member contact, and continued passage work, with full GxE case evidence. For authoring, not model evaluation.
---

# Hook Transfer

Use a rigid tool's shape and relative position to solve a pushing, stance, reachability, or movement-constraint problem. Rear and lateral contact are useful relationships; ordinary straight chain pushing alone does not establish shape-dependent function.

## 构建前必读与默认复杂模式

使用本 skill 构建或迭代关卡前，必须读取 [官方案例与机制分析](references/official-case.md)，并检查其中用于本次构建的关键状态和空间关系。先列出本次设计继承的必要机制、前置条件、阶段依赖与可变部分，再进入形状选择、坐标布局和地图生成。不能只依据 SKILL.md 中的抽象摘要完成构建。默认按多步推理要求构建，不能仅靠一次错位、一次释放或一次接触后只走路通关。

由本 skill 流程负责读取对应内部案例；只读取当前使用的案例，不默认加载另外两个。相同版本已实际读过可复用，文件名/链接/摘要不算已读。构建记录注明路径、内容指纹和继承关系；读取记录不能代替机制必要性和绕过检查。

默认采用复杂房间模式，布局前还必须读取 [planning-depth](references/planning-depth.md) 和 [复杂合同及验证接口](references/complex-validation.md)。先建立精简设计合同，再布局。至少三个相互依赖的有效功能阶段；走路、同向重复推、独立障碍各移开一次和无作用往返不计。合同须覆盖全部成员与高度、固定边界/空洞/支撑、各阶段可达区、完整阻挡目的地/站位、解除动作、需恢复的空间、关键输入/接触与后续工作。每个变化注明原功能由新图何处承担。

复杂模式使用 `scripts/build-complex.cjs` 和 `scripts/verify-complex.cjs`。它与旧基础 profile 分开；旧 `build.cjs`/`verify.cjs` 和固定 fixtures 继续验证原有范围，通过不能作为默认复杂房间验收。明确要求局部演示/复现时可用旧流程，并标注其分类。复杂模式证据缺失、未支持输入或搜索上限为 unknown，不能通过。


## Design from the goal

Choose the geometry unless the user specifies it. Read [Design](references/design.md) when deriving a new tool:

1. Choose the useful target change and explain how it advances the actual objective.
2. Establish a real restriction on direct operation. Check alternate target members, pushing directions, and approaches.
3. Derive player stance P, input member I, working member C, target contact T, and direction d. Require `I=P+d` and `C+d=T` at the actual elevations.
4. Connect I and C with supported rigid geometry and complete movement clearance. Test the contact through official moves.
5. For active docking, choose a separated start and feasible independent transport. Preparation must change relative positions; walking to an already usable tool does not establish it. Preserve access to P after docking.
6. Plan continued work after contact. Define the intended event, solve and replay, then search for bypasses and revise the actual failing relationship.

For default complex authoring, read [Planning depth](references/planning-depth.md). Design access before and after use together. A tool or helper may occupy space temporarily, but its later movement must remain possible. A longer transport distance alone is not a new planning stage.

## Rules and verification

- Use the official Toolbox, parser, save services, engine, and solver. Same M ID means one rigid group; distinct groups interact through contact. Do not invent pulling, attraction, permanent attachment, or object rotation.
- Prefer planar geometry unless height serves a specific function. Multi-object relays, mixed-height contact, sliding, and repeated tool reuse need compatible observations and checks.
- Read [Verification](references/verification.md). Separate legal completion, useful contact, contact necessity, preparation necessity, and the local function of a shape part. Joint movement alone proves none of the stronger claims.
- `contact-events.cjs` observes direct same-elevation unit translations for rear or lateral contact. `verify-contact.cjs` is narrower: it checks active lateral transfer onto a plate with two groups. It is not a universal hook verifier. Other outcomes require a matching scoped checker.
- Capped searches are unknown. Preserve and replay successful bypasses. Removing a part can change support, stance access, and clearance as well as contact; do not claim global shape minimality from a local edit.
- Use [Composition](references/composition.md) when integrating other mechanisms, and recheck the complete room.

## Build and deliver

Default new authoring uses the complex contract and entrypoints in [Complex validation](references/complex-validation.md). Use [official-design.json](references/official-design.json) as a runnable schema example, then author the new geometry and its own evidence:

```text
node scripts/build-complex.cjs --repo ENGINE --spec SPEC.json --out NEW_BUILD_OUTPUT
node scripts/verify-complex.cjs --repo ENGINE --spec SPEC.json --out NEW_CHECK_OUTPUT --cap 1000000
```

Use the following basic workflow only for an explicitly requested compact mechanism demonstration or a supported legacy profile. Label that result accordingly; a basic pass does not certify default complex authoring.


Author `title`, a complete 16-by-16 `cells` array, and a `contract` with the intended roles and effects. The agent chooses coordinates; the user need not provide a map. Run:

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_OUTPUT
```

Then apply the checker matching the contract, as documented in [Verification](references/verification.md). Deliver Play/Edit links, Build JSON, a replayed route, contact states, dependency evidence, and unresolved limitations.

Preserve existing drafts and engine code. This is map authoring: do not launch evaluated models, paid evaluations, or remote publication. Solver correctness and human difficulty are separate questions.
