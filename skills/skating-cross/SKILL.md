---
name: skating-cross
description: Design, build, and verify MazeBench ice puzzles in which a rigid cross creates stopping points, enables changing pushing sides, and opens a gem route with a return to the doorway. Derive connected stages from the included user-authored case. For map authoring, not model evaluation.
---

# skating cross

用可移动十字刚体改写冰面上的停点和推动站位。四个臂既参与整组滑行碰撞，也能给玩家提供停靠面；移动会同时打开一些路线、关闭另一些路线。完成目标包括收集宝石后返回指定出口格。

## 构建前必读与默认复杂模式

使用本 skill 构建或迭代关卡前，必须读取 [完整案例与机制分析](references/reference-case.md)，并检查本次要继承的 [关键状态](references/reference-states.json)。先列出必要机制、前置停点、换侧站位、阶段依赖与可变部分，再选择形状、坐标和布局。不能只依据此入口的摘要完成构建。相同版本已实际读过可复用；记录路径、内容指纹与继承关系，读取记录不能代替必要性检查。

本案例是用户在本地编辑器构造的完整参考图。保留原图与来源，称“用户参考案例”，不归为上游官方关卡。用户明确的目标是拿到宝石后返回起点出口，不要求跨入相邻房间。

默认构建至少三个相互依赖的有效功能阶段。布局前读取 [Planning depth](references/planning-depth.md) 和 [合同与验证接口](references/complex-validation.md)，建立精简设计合同。阶段必须改变可停位置、可用推动面、整组滑行约束或目标路线；长距离滑行、同向重复推动、单纯走路和无功能往返不计。明确要求原图复现或紧凑演示时可采用相应模式并如实标注。

## 从目标推导布局

需要新图时自主选择坐标，不要求用户预先给出形状或答案。读取 [Design](references/design.md)：

1. 固定宝石与出口的真实完成条件，确认初始冰面停点图不能完成目标。
2. 从最后一次转向倒推：玩家在哪停下、哪个十字成员提供停靠面、下一输入如何经过宝石，以及拿到宝石后如何返回出口。
3. 建立可达的推动面。用完整轮廓确定滑行终点，指出实际触墙的成员与边界，不能只看中心或接触臂。
4. 倒推前置停放、换侧和恢复。一个姿态可能解锁新推动侧、封闭旧停点；保留后续进入与退出路线。
5. 设置需要准备的初态。四臂可变长、位置可变，保持连接、完整支撑、整组净空与各臂功能；通过官方动作确认。
6. 记录冻结刚体停点图、可执行的下一次推动、完整阻挡位置和解除动作。搜索声称必要的阶段的绕过，普通回放成功反例。

## 规则与证据

- 使用官方 Toolbox、解析器、保存服务、引擎和求解器。同一 M ID 的成员是一组刚体；不添加拉动、自由旋转或逐格制动规则。
- 冰面一次输入可跨多格；经过某格不等于能在那里停下、转向或推动。停点关系有方向性，不能套用非冰面关卡的无向行走区合并。
- 读取 [Verification](references/verification.md)。分开报告合法完成、刚体运动必要性、停靠必要性、前置姿态依赖、局部臂功能和出口恢复。收集宝石不等于完成返回目标。
- 当前脚本支持一个平面十字刚体、一名玩家、一颗宝石，以及地面/冰面/固定墙，四臂长度可变。混合高度、多组传力、斜坡、机关、真实跨房间须使用兼容观察器；当前 profile 返回 unsupported/unknown。
- 耗尽搜索才支持“此限制下无解”；上限、异常和未支持输入是 unknown。选定状态结论不得扩大到所有历史，禁止某方向也不证明唯一顺序。保留并回放反例。
- 按 [Composition](references/composition.md) 与其他机制结合，重新验证组合后的目标与停点。

## 构建与交付

以 [reference-design.json](references/reference-design.json) 学习合同格式，再编写自己的 `title`、完整 16×16 `cells`、目标和空间关系。新布局必须更新姿态、阶段与证据，不能沿用参考图的搜索结论。

```text
node scripts/build.cjs --repo ENGINE --spec SPEC.json --out NEW_BUILD_OUTPUT
node scripts/verify.cjs --repo ENGINE --spec SPEC.json --out NEW_CHECK_OUTPUT --cap 300000
```

输出使用新目录，保留已有地图。交付 Play/Edit 链接、Build JSON、完整回放路线、关键姿态/停点/推动站位、作用说明与有范围的检查结果。浏览器实际游玩和保存导出需另行检查。

保持引擎代码和用户案例不变。本 skill 用于作者构造关卡，不启动被评测模型、付费评测或远程发布。输入数不是人的难度分数。
