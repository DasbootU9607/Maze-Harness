# 复杂房间合同与可执行验收

布局前必读本文、[完整官方案例](official-case.md)、[planning-depth](planning-depth.md)。默认至少三个关联的功能阶段是用户要求。旧脚本/fixtures 保留原 profile，用于基础机制和回归；不接受其通过代替本接口。

## 最小输入与实际调用

以 [official-design.json](official-design.json) 为可运行结构示例，写 `title,cells,contract`，可附 `witness`。合同声明 `mode:complex`，profile 为 `planar-hook-depth-v2`。单个 16×16 房间、一个 z0 玩家、地面/墙/空洞、2–5 个 M0–M4 刚体；宝石目标恰一个宝石，无宝石任务显式 reach 坐标。官方整组合法离场可声明 allowRemoval，禁止人工删除；其他层、斜坡、冰、房间切换和多人未支持。

`members` 列出全部坐标和高度，`roles` 覆盖全部组，`necessaryRoles` 逐组冻结。`spatial` 声明具体边界、空洞、支撑、阻挡和需保留空间；阶段冻结可达区由回放输出。`inherited/changes` 把原功能对应到新几何。`readReceipt` 记录本次先读 official-case.md 的指纹/路径；脚本核对版本，真实阅读与时序仍由作者记录和人审确认。

事件只支持 move（组和可选方向/直接推）、remove（官方离场）、independent-tool、contact、offset、all-motion。contact 使用当前配置中的 P/I/C/T、成员方向接触及两组完整单位平移；side 要求侧偏，rear 要求 T 位于玩家后方。共同移动不是事件判据。delivery 是玩家站位、完整工具/目标、下一普通合法动作的联合机会，不用工具中心或静态对齐作判据。

`stages` 声明事件、实际空间冲突、作用及可选 after 事件；`dependencies` 指定 prepare/before（事件机会或 goal），可用 after 限定历史后阶段。每个阶段须有依赖关系。脚本运行禁止准备 A 的首次有效 B 机会或目标前缀，与禁止 B 边的正向对照；整图冻结无解不代替前缀。传力模式的复杂合同声明独立准备、传力和接触后工作；边界模式声明前置准备、错位、依赖的后续移动及 matched boundaryControls。

transport 另需 `opposingDirections` 与 `reuse`：每个两向排除的终点是声明的真实进度事件（例如任何可用接触）或目标；reuse 记录 first/return/before、冲突和具体进度。历史状态搜索检验有序复用是否能被绕过，不能以第一次前向推代替下一工作区进度。若有序关系不成立，必须修正合同/结构，保留绕过，不强加原 witness 顺序。

`selectedPost` 只从指定 witness 输入时刻冻结组，scope 明确为选定状态；`postContactGroups` 则检验任意首次接触历史后的特定组必要性。默认所有模式搜索任意成功路径在第一次关键机制之后只走路；耗尽排除此类退化完成路径，不能推断每个可达事件状态都有解。

`boundaryControls` 在普通 prefix 到达的同一玩家可达站位比较 blocked 推动，删除声明墙后须能推动对应组、取得禁止准备的完整目标绕过；输出新增/丢失行走位置以限制副作用解释。不得据此宣称全局形状唯一性。

```text
node scripts/build-complex.cjs --repo ENGINE --spec YOUR_SPEC.json --out NEW_DRAFT_OUTPUT
node scripts/verify-complex.cjs --repo ENGINE --spec YOUR_SPEC.json --out NEW_REPORT_OUTPUT --cap 1000000
```

所有绕过路径均普通回放并检查自身限制；普通/搜索动作逐步比较。官方 solver 为完整目标正向对照。限制分析按推后状态的冻结行走连通区合并，搜索节点显式克隆历史并纳入 key，避免官方 A* 快照丢掉附加字段。cap 是物体配置/历史节点上限，与官方动作状态上限分开统计；未知、异常、不支持合同写 unknown。通过表示合同及图的结构条件已验证，不证明人的难度。

## 拒绝退化与人审范围

复杂模式必须耗尽：初态冻结行走、各必要角色冻结、机制绕过、对应依赖前缀、至多一推即走路、全部物体推动只使用一个指南针方向的过程（即使移动簇因接触发生变化）、首次机制后只走路、传力模式无独立准备的预对接机会。相关事件后的冻结行走区域沿 witness 逐次保存，不以 witness 长度排除短解。相反方向和复用证据缺失无法通过。

文本指导形状功能和官方逻辑迁移；脚本强制合同、物理、声明依赖、真实接触、退化搜索和 unknown 策略；作者是否读懂案例、阶段冲突是否有设计价值、所有必要功能是否如实声明、局部形变是否有合理功能对应及提示可读性仍需人审。自测不是独立作者实验，输入长度不是难度。
