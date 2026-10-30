# 媒体来源与版本 / Media provenance

当前主 Demo：**169.5 秒，约 2 分 50 秒**。在原四章战斗基础上加入完整备战成长操作；统一游戏配乐、动画片头片尾、段落标题和短淡入淡出。

| 时间 | 内容 |
|---|---|
| 00:00–00:04 | 动画片头 |
| 00:04–00:12 | 小队概览、角色切换 |
| 00:12–00:22 | 装备属性对比、实际穿戴 |
| 00:22–00:32 | 职业分支与转职确认 |
| 00:32–00:44 | 职业技能学习、携带与被动分类 |
| 00:44–00:54 | 专属天赋加点、通用修习 |
| 00:54–01:03 | 电路战术选敌与保存 |
| 01:03–01:09 | 世界地图与章节选择 |
| 01:09–01:33 | 雾川四人战斗与首领 |
| 01:33–01:57 | 熔岩城四人战斗与首领 |
| 01:57–02:21 | 冰霜城四人战斗与首领 |
| 02:21–02:45 | 风之城四人战斗与首领交锋 |
| 02:45–02:49.5 | 动画收尾 |

| 文件 | 来源与用途 | 准确口径 |
|---|---|---|
| `hero.png` | 10 月 23 日品牌海报 | 概念宣传图，非游戏实时渲染 |
| `logo.svg` | 项目品牌标识 | 品牌素材 |
| `gameplay-170s.mp4` | 本次完整玩法 Demo | 10 月 30 日真实配置操作＋10 月 28 日原速战斗；两个独立测试存档 |
| `demo-full-poster.jpg` | 本次 Demo 片头 | 新主播放入口 |
| `gameplay-104s.mp4` / `demo-poster.jpg` | 保留的早期四章战斗版 | 技术 v143 / 10 月 28 日集成版，非最新备战 UI |
| `skills/professions/talents-desktop.png` | 10 月 30 日 class-tabs.1 界面验证 | 对应 07 研究版，真实浏览器渲染、构造测试存档 |
| `skills-mobile.png` | 同批英文手机视口验证 | 模拟手机视口，不是实体手机长期性能证明 |
| `party/equipment-desktop.png` | 同日较早配装验证 | 随后职业独立成分页；新视频包含独立职业分页 |
| `architecture.svg` | 原生架构图 | 实现说明，非游戏画面 |
| `traction.svg` | 匿名统计图 | 公开服窗口快照，口径见统计文档 |

新增操作段来自与 07 研究版对应的本地集成代码，真实点击、原生处理并保存到独立内存测试存档。角色等级、装备、货币与 Pass 资格是演示夹具，不连接生产钱包、不改真实玩家数据。采集保留原始截屏时间间隔；配置界面以低帧率采集，输出为 30 fps，未用生成动画伪造操作结果。

战斗段保留四人实机与完整 HUD，原速播放；没有补造首领击破、修改伤害或刷出额外敌人。风之城展示首领交锋，不声称击破。两个日期的素材不能称为同一次连续通关；公开试玩范围也不等于视频测试内容，见 [玩法与开放范围](GAMEPLAY-AND-MODEL.md)。

配乐采用游戏曲目《赤獠炉心》，全片连续，续接处使用 4 秒交叉淡化，保留战斗打击声。标题与短淡入淡出仅用于编辑呈现。GitHub 提供 720P H.264/AAC 压缩版；1080P 母版与原始素材留在团队素材库。没有随视频公开游戏源码、服务器文件或存档。

### English

The main demo is **169.5 seconds (about 2:50)**. It combines real October 30 preparation operations—party, equipment, professions, skills, talents, circuit tactics and map selection—with the original-speed October 28 four-chapter combat recording. Separate constructed test saves were used. UI captures retain measured screenshot timing and are encoded at 30 fps; they do not represent a 30 fps UI capture or a device performance benchmark.

The full game screen is preserved. Native combat sound is mixed with one game music track, with a four-second crossfade at its continuation. Animated titles and short fades are editorial effects. The final Wind City encounter is not presented as a boss victory. This is neither CG nor production-player footage, and the public preview does not expose all demonstrated test content. The review copy is 720p; the 1080p master remains in the team's media library.
