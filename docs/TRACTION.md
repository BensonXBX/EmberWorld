# 公开试玩统计 / Early-preview telemetry

**窗口：2026-10-28 21:10:00—2026-10-30 21:42:24（UTC+8）。**

| 指标 | 记录值 | 定义 |
|---|---:|---|
| 参与钱包 | 61 | 窗口内至少有一条符合条件的副本记录，按钱包去重 |
| 副本尝试 | 2,139 | `kind=expedition` 的不同记录 ID；重试属于新的尝试 |
| 通关记录 | 764 | 状态 `won`，且没有“中途开始采集”标记 |

| 日期（UTC+8） | 参与钱包 | 副本尝试 | 通关记录 |
|---|---:|---:|---:|
| 10 月 28 日，21:10 后 | 18 | 109 | 12 |
| 10 月 29 日 | 47 | 1,011 | 264 |
| 10 月 30 日，截至 21:42 | 28 | 1,019 | 488 |

每日钱包数跨日重叠，**不能相加为 93 个玩家**。总计是 61 个不同钱包，也不等于 61 位自然人。当天是部分日，不与完整日直接比较增长率。

## 方法

单次只读查询业务主机现有公开服分析库。使用已生成的副本摘要，不扫描链、不重复计算战斗、不启动采集器。只纳入 `channel=player`、`sandbox=0`、开始时间在窗口内的副本；排除查询时运营／测试名单中出现的钱包。会话记录和副本记录没有相加，防止重复计数。数据库行以记录 ID 更新，网络重发不累计为新副本。

名单是查询时的快照，可能不能识别所有历史手工测试；一个用户可能多个钱包。这里是运营系统记录的早期使用证据，未由第三方审计，也不是营销账户真实性鉴定。

## 完整性与边界

- 所选副本摘要记录无 partial-start 标记，`detail_lost=0`。
- 明细事件计数存在 **12,021 条 dropped events**（有界采集／保留机制），所以不宣称拥有每一条完整行为轨迹。
- 其他状态包括失败、主动返回、中断和进行中；中断不能直接解释为作弊、崩溃或玩家流失。
- JSON 中的 `recorded_simulation_hours` 是各副本记录的游戏模拟时长合计，不是在线墙钟时长；`recorded_kills` 是记录击杀计数，不作为本页核心用户指标。
- 未将访问量、API 请求量、Pass 持有人数、研究号或旧擂台成绩混入世界版使用人数。
- 不发布地址、IP、设备指纹、存档、日志或逐局明细。

原始匿名汇总：[traction-2026-10-30.json](../data/traction-2026-10-30.json)。这是时间点快照，不是持续刷新仪表盘。

### English

61 distinct participating wallets, 2,139 expedition records and 764 complete-start wins were recorded in the stated window. Public, non-sandbox records only; known operator/test addresses at query time were excluded. Wallets are not humans; repeated attempts are not new users. Daily wallet counts overlap. There are 12,021 dropped detail events, so this is not a complete behavioral audit. No retention, revenue or infrastructure-capacity claim is derived from this snapshot. Only aggregates are published.
