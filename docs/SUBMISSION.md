# TapeOut Accelerate · 参赛材料对照

本页基于 2026-10-30 读取的[官方活动页](https://web3.okx.com/zh-hans/xlayer/build-x-series)、[报名表](https://forms.gle/EoDNbxQ65dev1wFd9)及[官方直播征集](https://x.com/OKXWallet_CN/status/2116039863304929414)。规则以主办方最新页面为准。

| 评审关心的问题 | 回答 | 仓库证据 |
|---|---|---|
| 所有功能都必须在电路里吗？ | 不需要；本项目明确划分电路决策与常规引擎／界面／服务 | [架构](ARCHITECTURE.md)、[真实执行链路](CIRCUITS.md) |
| 是否自行部署处理器？ | 复用 X Layer 现有 FabX 参考电路，不声称自行部署参考容器 | [processor、Circuit ID 与固定块](CIRCUITS.md) |
| 链在哪里真正参与？ | 读取 X Layer 参考网表；服务端核验 X Layer Pass；实际网表在浏览器执行 | [网表数据](../data/reference-boards.json)、[运行源码](../src/circuits/circuit.mjs) |
| 已有项目的新内容是什么？ | 从擂台进入世界版，新增专用电路适配、四人协作、成长界面、网络核验与运营体系 | [时间线](PROGRESS.md)、旧仓库独立保留 |
| 用户为何持续使用？ | 构筑、刷宝、战术调整、首领挑战与可分享的电路策略 | [玩法与产品](GAMEPLAY-AND-MODEL.md) |
| 商业潜力是什么？ | Pass 玩法授权、后续外观／内容／活动服务；不把尚未开放机制当收入 | [商业模式与边界](GAMEPLAY-AND-MODEL.md) |
| 有实际用户反馈吗？ | 截止 10 月 30 日的公开服匿名汇总 | [统计](TRACTION.md)及可下载 JSON |
| 能否验证而非只看概念？ | 104 秒实机＋离线门级测试＋测试版截图 | [Demo](../media/gameplay-104s.mp4)、`npm test`、`npm run demo` |

## 建议表单内容

**Project / Team name:** EmberWorld（余烬世界）

**X:** https://x.com/EmberWorldX

**GitHub:** https://github.com/BensonXBX/EmberWorld

**Website:** https://emberworld.net/

**Demo video:** https://github.com/BensonXBX/EmberWorld/raw/refs/heads/main/media/gameplay-104s.mp4

Demo 104 秒，小于表单 3 分钟上限；如果表单审阅环境不允许直接播放 GitHub MP4，可下载观看，或由团队提供相同文件的平台视频链接。不可改填超过 3 分钟的长合集。

**Elevator pitch（中文）**

EmberWorld 是以 X Layer / TapeOut 电路为战术大脑的像素动作 RPG。玩家组建最多四人的英雄小队，在副本中协作、刷宝和挑战首领。真实 FabX NAND/LATCH 网表读取血量、危险、距离与技能状态，输出目标、技能与行动意图；浏览器本地推演，服务器核验规则并保存最终进度。我们已开放有限范围的早鸟试玩，并在测试版实现装备、技能、职业、天赋与电路的一体化备战。本期提交重点是世界版新增的电路适配、多人角色协作、网络架构与完整成长界面；仓库提供可运行的网表验证、实机视频和匿名玩家统计。

**Elevator pitch (English)**

EmberWorld turns X Layer / TapeOut circuits into tactical brains for a pixel action RPG. Players build squads of up to four heroes, explore dungeons, collect loot and fight bosses. Actual FabX NAND/LATCH netlists consume health, danger, distance and skill-state observations and output target, skill and movement intent. The browser simulates locally while an authoritative server validates rules and persists progress. A limited public early preview is live; the research build integrates equipment, skills, professions, talents and circuit tactics into one preparation flow. This submission focuses on new World-specific circuit integration, multi-character control, networking and progression UI, with runnable circuit tests, real gameplay footage and aggregate player evidence.

**Team background（中英摘要）**

Benson 负责产品与界面、服务框架、Web3、电路及运营数据；技术合作伙伴 @anopened1 负责游戏本体、战斗、角色与场景。团队此前交付了《余烬擂台》与 DeWeb 游戏探索，本期继续建设独立的《余烬世界》。

Benson leads product/UI, service architecture, Web3, circuits and operations. Technical collaborator @anopened1 contributes the game core, combat, characters and environments. The team previously delivered the EMBER Arena and DeWeb game experiments; this entry presents the substantial new World work, with upstream and integration contributions separated.

## 表单中需由团队确认的资料

姓名、国籍、准确团队人数、个人 Telegram handle、联系邮箱与最终提交意愿由团队提供。群链接不是个人 Telegram handle。仓库不公开私人联系方式或代填国籍。Logo 按表单要求另提供 24×24 PNG。

活动页面显示截止 12 月 7 日 23:59 UTC；10 月 30 日官方帖另邀请 11 月 3 日前报名争取首期直播。这是最终提交与早期直播报名两个时间点，不应混淆。
