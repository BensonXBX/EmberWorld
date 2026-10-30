<p align="center"><img src="media/logo.svg" alt="EmberWorld" width="360"></p>

# EmberWorld

**Build a tactical brain from circuits. Bring your squad into the world.**

[中文](README.md) · [Play](https://emberworld.net/) · [104-second gameplay](https://github.com/BensonXBX/EmberWorld/raw/refs/heads/main/media/gameplay-104s.mp4) · [X](https://x.com/EmberWorldX) · [Community](https://t.me/EmberWorldXLayer)

![EmberWorld concept artwork](media/hero.png)
*Concept artwork. Actual gameplay and UI are shown below.*

EmberWorld is a pixel action RPG built around the **X Layer / TapeOut circuit ecosystem**. Select from eight heroes, assemble a squad of up to four characters, explore dungeons, fight bosses and improve your equipment, skills, professions, talents and tactics. Actual circuit netlists make tactical choices; native game rules execute combat.

This is the next stage after EMBER Arena: from a side-view fighting arena into exploration and multi-character cooperation with spatial depth. The [previous submission](https://github.com/BensonXBX/ember-tapeout) is preserved separately. This repository presents **new World integration work**, not a relabeling of the old Arena.

> Snapshot: October 30, 2026. A limited public early preview is live. The complete preparation UI is on the research build. This is a selected-source showcase, not the full game or production backend.

## Watch the game

[![Watch 104 seconds of real gameplay](media/demo-poster.jpg)](https://github.com/BensonXBX/EmberWorld/raw/refs/heads/main/media/gameplay-104s.mp4)

Four chapters, four-character battles and boss encounters, with full HUD, original speed and game music. Recorded on an isolated October 28 test build, compressed to 720p for review. Newer October 30 UI is shown separately. This is not CG, real-time production-player footage or a claim of frame-by-frame on-chain gameplay. [Media provenance](docs/MEDIA.md).

## What is new in this competition period?

| Area | Earlier Arena | New World work |
|---|---|---|
| Game structure | Fighting, circuit challenges and PVP | Spatial exploration, squad combat, mobs and bosses |
| Circuits | Arena action pins and combos | World sensors, target selection, support/survival/navigation intent, dynamic skill semantics |
| Progression | Match-focused | Loot/equipment, learned and equipped skills, professions/talents, persistent progress |
| Networking | Rooms and match services | Local simulation, rolling server validation, authoritative rewards and saves |
| UI | Arena lobby/selection | Squad → equipment → skills → profession → talents → circuits → dungeon; desktop/mobile |
| Operations | Match and weekly-board records | Expedition analytics, client health, recovery monitoring and isolated release environments |

The World concept began October 14, before the October 16 event start. Only substantive work completed during the event window is presented as new progress. [Milestones and scope](docs/PROGRESS.md).

## Actual circuit execution, not decorative blockchain labels

![Architecture](media/architecture.svg)

1. The adapter reads health, energy, distance, danger, cooldowns and reachable geometry from the game.
2. Tactical settings and the current loadout compile into a graph of real reference circuits.
3. The browser executes NAND gates and stateful LATCH nodes, independently per character.
4. Outputs become ordinary target, skill and movement requests. Circuits cannot directly grant damage, resources or loot.
5. The server runs authoritative rules and validates matching historical progress before final persistence.

Skills are rebound by **ID and effect**, not fixed keyboard positions. Moving a heal to another slot still selects that heal when its conditions hold. Readiness alone is insufficient: range, resource reserves, danger, active effects and role-specific needs also matter.

The current runtime uses **nine FabX reference circuit types** on X Layer 196: `1, 3, 4, 9, 21, 29, 30, 46, 47`. Reference container: [`0x265e2580cb9c3fc059f2aa3cf20ad30f3f0a653c`](https://www.oklink.com/xlayer/address/0x265e2580cb9c3fc059f2aa3cf20ad30f3f0a653c); reference Circuit IDs match the listed task IDs. [Exact pins, gate counts, recorded block, hashes and source modules](docs/CIRCUITS.md).

**Boundary:** real reference-netlist control works today. Scanning a player's wallet and substituting their owned FabX miner netlists is planned. Reused module instances are not a required NFT count. No ZK proof of circuit execution or proof that every input came from a specific circuit is claimed. Native code still handles sensing, geometry, physics, rendering and settlement.

### Reproduce without a wallet or RPC

```sh
git clone https://github.com/BensonXBX/EmberWorld.git
cd EmberWorld
npm test
npm run demo
```

Node 22+, zero package dependencies. **15 tests pass**, including **2,304 recorded official vectors**, raw netlist hash/decoding consistency, slot-reordering semantics, danger response, readiness, per-character state and target arbitration. The synthetic demo requests `strike` under safe conditions, `heal` at low health and `dodge` under incoming danger. It is not a full-game completion proof.

## Current preparation UI

![Skills and loadouts](media/skills-desktop.png)

| Professions | Talents |
|---|---|
| ![Professions](media/professions-desktop.png) | ![Talents](media/talents-desktop.png) |

| Squad | Equipment |
|---|---|
| ![Squad](media/party-desktop.png) | ![Equipment](media/equipment-desktop.png) |

The screenshots are real browser renders using constructed test saves and the research UI. They are not production-player assets. Each hero supports up to 20 equipped skill slots plus innate attack/guard. The equipment and squad images precede the final same-day split of the profession tab. [Mobile UI](media/skills-mobile.png).

## Recorded early usage

**61 participating wallets · 2,139 expedition attempts · 764 completions**

![Public preview telemetry](media/traction.svg)

Window: October 28, 2026, 21:10 through October 30, 21:42:24 (UTC+8). Public non-sandbox expedition summaries, excluding known operator/test addresses at query time. Wallets are not unique humans; daily counts overlap; retries are not new users. Detail-event collection has recorded omissions. This is early operational evidence, not a retention, revenue, capacity or third-party audit claim. [Method and limitations](docs/TRACTION.md) · [Aggregate JSON](data/traction-2026-10-30.json).

## Users and business model

For action/loot players, the product offers squad builds, progression and boss challenges. For TapeOut/FabX builders, it gives circuit logic an observable application beyond benchmark tables. For strategy creators, it provides a way to compare and share tactics.

The intended loop is explore → collect confirmed progress/loot → improve loadouts and circuits → tackle harder encounters. Pass is a transferable gameplay-access NFT, not equity, asset ownership or yield. Future cosmetics, seasonal content and challenge services are prospective business directions, with specific rules announced when ready. [Gameplay, current access and product model](docs/GAMEPLAY-AND-MODEL.md).

The current public early preview has Pass, capacity and progression limits: normally 5–9 Pass for the first complete dungeon and 10+ for the first chapter range. Full preparation features and more chapters are being tested. Reviewers can inspect the video and runnable code without buying assets; contact the team to arrange full interactive review.

## TapeOut Accelerate fit

- **X Layer use:** recorded FabX netlists in the control path and server-checked Pass eligibility.
- **Reuse:** existing reference processor/circuits, with addresses and IDs; no claim of deploying those processors ourselves.
- **Clear division:** gate-level tactical decisions; conventional UI, geometry, combat and persistence.
- **Substantial new development:** World-specific integration, squad systems, networking and preparation UI are separated from the earlier Arena.
- **User value/business potential:** progression, tactics and access/content services; no claimed sustainable revenue yet.
- **Reviewable delivery:** live early preview, 104-second demo, real test UI, aggregate usage evidence and runnable circuit tests.

[Requirements and submission text](docs/SUBMISSION.md).

## Team and next steps

**Benson:** product/UI, service framework, Web3, circuits, data and deployment. **[@anopened1](https://x.com/anopened1):** game core, combat, characters and environments. Upstream content and integration contributions are kept distinct.

Next: improve long-session mobile/WebView reliability and recovery, validate the complete progression UI, connect player-owned netlists, and make tactics easier to edit and compare. NFT equipment, secondary trading, FAB consumption and seasonal challenges remain staged roadmap items. The current World service is not fully on-chain; earlier Arena DeWeb delivery and the independent DeWeb website are separate deployments.

[Architecture/trust](docs/ARCHITECTURE.md) · [Progress](docs/PROGRESS.md) · [Official development article](https://x.com/EmberWorldX/status/2113620000657527060) · [Rights and publication scope](NOTICE.md)
