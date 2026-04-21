## NinjaLife — Full Roadmap Summary

***

## ✅ Phase 1 — Core Loop (Complete)
The foundational game. Everything runs on top of this.

- Turn-based combat: attack, skills, cooldowns, status effects (BURN)
- 3 bloodlines (BLAZE, STORM, VOID) with SPIN gacha system
- Mode toggle with Chakra drain
- Quest system: GRIND / ELITE / BOSS types
- Rank up: E → D → C with level caps
- Save/load with versioned localStorage
- Naruto theme: 下忍/中忍/上忍, Chinese skill names

***

## ✅ Phase 1.2 — System Deepening (Complete)
- MD (Chakra) regen per turn
- Bloodline mastery system (+% per re-spin)
- 8 gameplay bug fixes (HP recalc, EXP curve, Mode spam, etc.)

***

## ✅ Phase 1.3 — Content & Polish (Complete)
- ClinicScreen (free daily rest + paid rest)
- New E-rank quests
- Tests for rest and quest logic

***

## ✅ Phase 1.4 — Stamina & Enemy AI (Complete)
- Stamina system (MAX 100, costs per quest, real-time recovery every 10min)
- Enemy AI expanded: HEAL, MULTI_HIT, DEBUFF (ATK_DOWN)
- ATK_DOWN status effect on player
- IntroScreen with name entry for new players
- Zone-grouped quest display with `QUEST_ZONES`
- 8 new tests

***

## ✅ Phase 2 — Inventory & Economy (Complete)
- Shop screen (忍具商店) with 7 items: potions, chakra pills, scrolls
- Inventory system with quantity tracking
- Active buff system (ATK/DEF/SPD scrolls, tick down per turn)
- 12 bloodlines (added: Water, Sand, Lightning, Earth, Wind, Shadow, Kaguya)
- 7 new skills in Chinese (水龍彈, 砂瀑防護, 雷遁影分身, etc.)
- Rank D/C quests added
- Real spin odds (calculated %, not raw weight)
- Daily quest timestamps, ONCE quests, spin rarity bonus display
- Save version v3

***

## ✅ Phase 2.0 — Gear System (Complete)
- 9 gear items: 3 weapons, 3 armors, 3 accessories across COMMON/RARE/LEGENDARY
- GearScreen with equip/unequip/shop
- Gear stats feed into all stat calculators
- UNLIMITED repeat type for GRIND/ELITE quests (no daily cap)
- Rank mismatch fix (lower-rank quests accessible after rank-up)
- Stamina real-time recovery tick every 60s
- 82 tests passing
- Save version v5

***

## ✅ Phase 3 — Visual Polish & Feel (Complete)
- **Spin wheel**: 36-tick roulette animation, rarity flash (gold/purple/white)
- **Combat animations**: damage flash on player/enemy hit, skill pulse on activation
- **Buff counters**: `(2t)` remaining turns shown on all active buffs and ATK_DOWN debuff
- **Sell mechanic**: SELL_ITEM / SELL_GEAR at 50% price in Shop and Gear screens
- `playerStatusEffects` properly typed on `BattleState`
- IntroScreen auto-skipped for returning players (`tryAutoLoadState`)
- QuestScreen fully Chinese localized
- 6 new tests (ATK_DOWN lifecycle, gear+buff+Mode stat combos)
- Save version v5 (unchanged)

***

## 📋 Phase 4 — Elemental System & Skill Mastery (Planned)

### 4A — Five Nature Transformations
- 5 elements: 🔥 Fire, 💧 Water, ⚡ Lightning, 🌍 Earth, 🌀 Wind
- Every bloodline gets an `element` field; RARE/LEGENDARY get advanced natures (磁遁/暗遁/骨遁)
- Every enemy gets an `element`, `weakness`, and `resistance`
- Weakness hit: **1.5× damage** / Resistance hit: **0.75× damage**
- Weakness cycle: Fire→Wind→Lightning→Earth→Water→Fire
- Combat log shows `🔥 弱點！+50%` / `💧 耐性… -25%`
- Element icon on enemy nameplate in CombatScreen
- Save version v6

### 4B — Skill Mastery (技術習熟)
- Per-skill use counter: `skillMasteries: Record<string, number>` on PlayerState
- 3 mastery tiers: Base (0) → 改 Kai (20 uses) → 奧義 Ougi (60 uses)
- Each tier upgrades the skill (more damage, reduced cooldown, new effect)
- Example: 雷切 → 雷切流 Nagashi → 紫電 Purple Lightning
- Combat skill buttons show `[改]` / `[奧義]` tier badge
- StatusScreen shows mastery progress bar per skill
- Ougi unlock triggers one-time notification

### 4C — Advanced Nature Exclusive Skills
- SAND → 磁遁・砂鐵之矢 (ignores DEF)
- SHADOW → 影縫い術 (enemy skips next turn)
- KAGUYA → 骨槍・千本桜 (3-hit bone lance)

***

## 📋 Phase 5 — World Map & Open World (Planned)

### 5A — World Map
- 5 zones unlocked by rank: 木葉村郊外 → 風之國沙漠 → 霧隱村海岸 → 火之國神殿 → 雲隱村山脈
- Each zone: 3–5 unique enemies, 1 elite enemy, 1 boss spawn point
- Zone travel costs stamina
- MapScreen with node-path layout, locked zones greyed out

### 5B — World Boss System (大魔王)
- **Client-side timer bosses** using `Date.now()` (same pattern as daily quests/stamina)
- 3 tiers: Zone Boss (30min), World Boss (2hr), Legendary Boss (8hr)
- Multi-phase fights: enrage at 50% HP, signature jutsu at 25% (Legendary only)
- Example bosses: 守門虎將, 傀儡師, 鬼鮫, 九尾分身, 雷神
- Boss availability shown on MapScreen with countdown timer

### 5C — Drop System
- Enemy loot rolls after each battle: Ryo, consumables, gear
- Boss guaranteed drops: RARE/LEGENDARY gear + exclusive scrolls
- **Signature bloodline scrolls** — rare boss drop that grants a specific LEGENDARY bloodline directly (alternative to gacha spinning)
- Kill streak bonus every 10 kills (Ryo burst)
- Save version v7

***

## 📋 Phase 6 — Social & Monetization (Future)

- Village/faction system (Leaf, Sand, Mist — unique passives + exclusive bloodlines)
- Leaderboard by rank/level/bloodline rarity (client-side or simple backend)
- PvP simulation (turn-based outcome sim between two saved builds)
- Achievement system → unlockable titles (「ANBU」,「影」Kage)
- Optional premium currency (Talisman) for cosmetics only — non-pay-to-win
- Season pass with exclusive LEGENDARY bloodlines at the end

***

## At a Glance

| Phase | Status | Key Feature |
|---|---|---|
| 1 → 1.4 | ✅ Done | Core loop, stamina, enemy AI |
| 2 → 2.0 | ✅ Done | Shop, gear, 12 bloodlines |
| 3 | ✅ Done | Spin animation, combat feel, sell |
| **4** | 📋 Next | Elemental system, skill mastery |
| **5** | 📋 Planned | World map, world bosses, drops |
| **6** | 🔮 Future | Social, monetization, PvP |
