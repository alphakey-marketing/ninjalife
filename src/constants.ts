import type { BloodlineDefinition, Element, EnemyDefinition, GearDefinition, ItemDefinition, ModeConfig, QuestDefinition, RankDefinition, Rank, SkillDefinition, SpinConfig, SkillEffectNumbers } from './types';

// Save version history:
// 1 → 2: Added completedQuestIds, freeRestUsedToday
// 2 → 3: Added inventory, activeBuffs, questResetTimestamps; migrated freeRestUsedToday → lastFreeRestDate (YYYY-MM-DD)
// 3 → 4: Added stamina/maxStamina, staminaCost on quests, playerStatusEffects in battle
// 4 → 5: Added gear system (ownedGearIds, equippedGear), lastStaminaRecovery
// 5 → 6: Added skillMasteries on player; element on bloodlines/enemies
// 6 → 7: Replaced lastFreeRestDate with lastFreeRestTimestamp; added lastVitalRecovery for passive HP/Chakra regen
export const SAVE_VERSION = 7;
export const MD_REGEN_BASE = 5;
export const MAX_STAMINA = 100;
export const STAMINA_REST_FREE = 50;
export const STAMINA_RECOVERY_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
export const STAMINA_RECOVERY_AMOUNT = 5; // +5 per interval
/** Passive HP/Chakra regen for broke players: +2 HP and +3 Chakra every 12 minutes */
export const VITAL_REGEN_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes
export const VITAL_HP_REGEN_AMOUNT = 2;
export const VITAL_MD_REGEN_AMOUNT = 3;
/** Free rest cooldown: 20 hours in milliseconds */
export const FREE_REST_COOLDOWN_MS = 20 * 60 * 60 * 1000;

/** Display names for ranks (Naruto theme) */
export const RANK_DISPLAY: Record<Rank, string> = {
  E: '下忍 (Genin)',
  D: '中忍 (Chunin)',
  C: '上忍 (Jonin)',
};

/** Paid rest costs by level bracket */
export const CLINIC_COSTS: { maxLevel: number; cost: number }[] = [
  { maxLevel: 10, cost: 50 },
  { maxLevel: 20, cost: 120 },
  { maxLevel: 30, cost: 250 },
];

export const SKILLS: Record<string, SkillDefinition> = {
  BLAZE_SHOT: {
    id: 'BLAZE_SHOT',
    name: '火遁・豪火球の術',
    description: '強力な火球を放ち、火属性ダメージを与える。目標を炎上状態にする可能性がある。',
    hpCost: 0,
    mdCost: 15,
    cooldownTurn: 2,
    requiredLevel: 1,
    effects: {
      damageMultiplier: 1.5,
      burnChance: 0.4,
      burnDamagePerTurn: 5,
      burnDuration: 3,
    },
  },
  THUNDER_STRIKE: {
    id: 'THUNDER_STRIKE',
    name: '雷切 (Chidori)',
    description: '雷を手に集中させ、敵を貫く。巨大な雷属性ダメージを与える。',
    hpCost: 0,
    mdCost: 35,
    cooldownTurn: 4,
    requiredLevel: 1,
    effects: {
      damageMultiplier: 2.5,
    },
  },
  VOID_SLASH: {
    id: 'VOID_SLASH',
    name: '万花筒写輪眼・天照',
    description: '黒炎で全てを焼き尽くす。HPとChakraを消費して究極のダメージを与える。',
    hpCost: 25,
    mdCost: 20,
    cooldownTurn: 3,
    requiredLevel: 1,
    effects: {
      damageMultiplier: 3.0,
    },
  },
  IRON_GUARD: {
    id: 'IRON_GUARD',
    name: '八卦六十四掌・防御',
    description: '八卦掌で経絡（けいらく）を封じ、防御態勢（ぼうぎょたいせい）に入る。HPを15%回復する。',
    hpCost: 0,
    mdCost: 20,
    cooldownTurn: 3,
    requiredLevel: 1,
    effects: {
      damageMultiplier: 0,
      healSelfPercent: 0.15,
    },
  },
  MIST_STEP: {
    id: 'MIST_STEP',
    name: '水遁・霧隠の術',
    description: '濃霧（のうむ）に隠れて奇襲（きしゅう）を仕掛ける。Chakraを20回復する。',
    hpCost: 0,
    mdCost: 25,
    cooldownTurn: 3,
    requiredLevel: 1,
    effects: {
      damageMultiplier: 1.2,
      mdRestore: 20,
    },
  },
  WATER_DRAGON: {
    id: 'WATER_DRAGON',
    name: '水遁・水龍弾の術',
    description: '水龍を召喚（しょうかん）して敵に衝撃を与える。強力な水属性ダメージを与える。',
    hpCost: 0,
    mdCost: 20,
    cooldownTurn: 3,
    requiredLevel: 1,
    effects: { damageMultiplier: 2.0 },
  },
  SAND_ARMOR: {
    id: 'SAND_ARMOR',
    name: '砂瀑（さばく）の防護盾（ぼうごたて）',
    description: '全身を砂で覆い防護盾（ぼうごたて）を形成する。HPを25%回復する。',
    hpCost: 0,
    mdCost: 25,
    cooldownTurn: 4,
    requiredLevel: 1,
    effects: { damageMultiplier: 0, healSelfPercent: 0.25 },
  },
  LIGHTNING_CLONE: {
    id: 'LIGHTNING_CLONE',
    name: '雷遁・影分身',
    description: '雷で分身を生み出し猛攻を仕掛ける。敵を炎上状態にする可能性がある。',
    hpCost: 0,
    mdCost: 28,
    cooldownTurn: 3,
    requiredLevel: 1,
    effects: { damageMultiplier: 1.8, burnChance: 0.30, burnDamagePerTurn: 6, burnDuration: 3 },
  },
  EARTH_SPIKE: {
    id: 'EARTH_SPIKE',
    name: '土遁・土流壁（どりゅうへき）',
    description: '地底から巨大な土壁（どへき）を隆起させ敵を攻撃する。大ダメージを与える。',
    hpCost: 0,
    mdCost: 35,
    cooldownTurn: 5,
    requiredLevel: 1,
    effects: { damageMultiplier: 2.2 },
  },
  WIND_SLASH: {
    id: 'WIND_SLASH',
    name: '風遁・風刃（ふうじん）の術',
    description: '風の刃で高速斬撃を放つ。速度が極めて速く回避（かいひ）困難だ。',
    hpCost: 0,
    mdCost: 18,
    cooldownTurn: 2,
    requiredLevel: 1,
    effects: { damageMultiplier: 1.6 },
  },
  SHADOW_BIND: {
    id: 'SHADOW_BIND',
    name: '影縫いの術',
    description: '影で敵を縛り付け、Chakraを吸収（きゅうしゅう）する。',
    hpCost: 0,
    mdCost: 20,
    cooldownTurn: 3,
    requiredLevel: 1,
    effects: { damageMultiplier: 1.4, mdRestore: 15 },
  },
  BONE_LANCE: {
    id: 'BONE_LANCE',
    name: '屍骨脈（しこつみゃく）・骨槍（こつやり）',
    description: '自らの骨を槍として敵を貫く。HPを消費して壊滅的なダメージを与える。',
    hpCost: 25,
    mdCost: 25,
    cooldownTurn: 5,
    requiredLevel: 1,
    effects: { damageMultiplier: 2.8 },
  },
  // ── Advanced nature exclusive skills ────────────────────────────────────────
  MAGNETIC_ARROW: {
    id: 'MAGNETIC_ARROW',
    name: '磁遁・砂鉄（さてつ）の矢',
    description: '磁遁血繼限界の奥義。砂鉄の矢を放ち、防御を無視して貫通する。',
    hpCost: 0,
    mdCost: 35,
    cooldownTurn: 5,
    requiredLevel: 12,
    effects: { damageMultiplier: 2.4, ignoreDefense: true },
  },
  SHADOW_STITCH: {
    id: 'SHADOW_STITCH',
    name: '影縫い術・奥義',
    description: '奈良一族の極意。影で敵を縫い付け、次の行動を封じる。',
    hpCost: 0,
    mdCost: 30,
    cooldownTurn: 5,
    requiredLevel: 15,
    effects: { damageMultiplier: 1.6, skipEnemyTurn: true },
  },
  BONE_THOUSAND: {
    id: 'BONE_THOUSAND',
    name: '骨槍・千本桜',
    description: '輝夜一族の奥義。骨を千の槍に変え、3回連続で攻撃する。',
    hpCost: 30,
    mdCost: 40,
    cooldownTurn: 6,
    requiredLevel: 20,
    effects: { damageMultiplier: 1.0, multiHitCount: 3 },
  },
};

export const BLOODLINES: Record<string, BloodlineDefinition> = {
  BLAZE: {
    id: 'BLAZE',
    name: '不知火（しらぬい）一族（火遁）',
    rarity: 'COMMON',
    description: '強力な火遁の血を持ち、生まれながらに攻撃力が高い。',
    element: 'FIRE',
    passive: { atkMultiplier: 1.1 },
    skillIds: ['BLAZE_SHOT'],
  },
  STORM: {
    id: 'STORM',
    name: '日向（ひゅうが）一族（白眼）',
    rarity: 'RARE',
    description: '白眼（びゃくがん）で全ての弱点を見抜き、クリティカル率が上昇する。',
    element: 'LIGHTNING',
    passive: { critChanceBonus: 0.1 },
    skillIds: ['THUNDER_STRIKE'],
  },
  VOID: {
    id: 'VOID',
    name: 'うちは一族（写輪眼）',
    rarity: 'LEGENDARY',
    description: '写輪眼（しゃりんがん）が究極の力を与えるが、生命力を代償とする。',
    element: 'FIRE',
    passive: { atkMultiplier: 1.4, hpMultiplier: 0.8 },
    skillIds: ['VOID_SLASH'],
  },
  IRON: {
    id: 'IRON',
    name: '山中（やまなか）一族（鉄壁の守り）',
    rarity: 'COMMON',
    description: '山中一族の強靭（きょうじん）な血脈、卓越した防御能力を持つ。',
    element: 'EARTH',
    passive: { defMultiplier: 1.25 },
    skillIds: ['IRON_GUARD'],
  },
  MIST: {
    id: 'MIST',
    name: '霧隠（きりがくれ）一族（霧歩き）',
    rarity: 'RARE',
    description: '霧隠の忍の血統、速度とChakra回復が共に優れる。',
    element: 'WATER',
    passive: { spdBonus: 2, mdRegenBonus: 5 },
    skillIds: ['MIST_STEP'],
  },
  WATER: {
    id: 'WATER',
    name: '水の国（みずのくに）一族（水遁）',
    rarity: 'COMMON',
    description: '水の国の血統、Chakra回復能力が優れている。',
    element: 'WATER',
    passive: { mdRegenBonus: 8 },
    skillIds: ['WATER_DRAGON'],
  },
  SAND: {
    id: 'SAND',
    name: '砂の国（すなのくに）一族（防御）',
    rarity: 'RARE',
    description: '砂隠村（すなかくれむら）の防御血統、鉄壁の守護者だ。',
    element: 'EARTH',
    advancedNature: '砂遁',
    passive: { defMultiplier: 1.3, spdBonus: 1 },
    skillIds: ['SAND_ARMOR', 'MAGNETIC_ARROW'],
  },
  LIGHTNING_BL: {
    id: 'LIGHTNING_BL',
    name: '雲隠（くもがくれ）一族（雷遁）',
    rarity: 'RARE',
    description: '雲隠村の雷遁血統、攻撃力とクリティカルが共に高い。',
    element: 'LIGHTNING',
    passive: { atkMultiplier: 1.2, critChanceBonus: 0.05 },
    skillIds: ['LIGHTNING_CLONE'],
  },
  EARTH: {
    id: 'EARTH',
    name: '岩隠（いわがくれ）一族（土遁）',
    rarity: 'COMMON',
    description: '岩隠村の土遁血統、生命力が強靭（きょうじん）だ。',
    element: 'EARTH',
    passive: { hpMultiplier: 1.2 },
    skillIds: ['EARTH_SPIKE'],
  },
  WIND: {
    id: 'WIND',
    name: '風の国（かぜのくに）一族（風遁）',
    rarity: 'COMMON',
    description: '風の国の風遁血統、速度が群を抜く。',
    element: 'WIND',
    passive: { spdBonus: 3 },
    skillIds: ['WIND_SLASH'],
  },
  SHADOW: {
    id: 'SHADOW',
    name: '奈良（なら）一族（影術）',
    rarity: 'RARE',
    description: '奈良一族の影術（かげじゅつ）血統、知略と攻撃を兼ね備える。',
    element: 'LIGHTNING',
    advancedNature: '影遁',
    passive: { atkMultiplier: 1.15, critChanceBonus: 0.08 },
    skillIds: ['SHADOW_BIND', 'SHADOW_STITCH'],
  },
  KAGUYA: {
    id: 'KAGUYA',
    name: '輝夜（かぐや）一族（屍骨脈）',
    rarity: 'LEGENDARY',
    description: '輝夜一族の屍骨脈（しこつみゃく）の血統、骨を武器とし攻撃力が高いが生命力を代償とする。',
    element: 'WATER',
    advancedNature: '屍骨脈',
    passive: { atkMultiplier: 1.45, hpMultiplier: 0.85 },
    skillIds: ['BONE_LANCE', 'BONE_THOUSAND'],
  },
};

export const SPIN_CONFIG: SpinConfig = {
  priceRyo: 100,
  entries: [
    { bloodlineId: 'BLAZE', baseWeight: 50 },
    { bloodlineId: 'IRON', baseWeight: 50 },
    { bloodlineId: 'WATER', baseWeight: 50 },
    { bloodlineId: 'EARTH', baseWeight: 45 },
    { bloodlineId: 'WIND', baseWeight: 45 },
    { bloodlineId: 'STORM', baseWeight: 20 },
    { bloodlineId: 'MIST', baseWeight: 18 },
    { bloodlineId: 'SAND', baseWeight: 18 },
    { bloodlineId: 'LIGHTNING_BL', baseWeight: 15 },
    { bloodlineId: 'SHADOW', baseWeight: 15 },
    { bloodlineId: 'VOID', baseWeight: 5 },
    { bloodlineId: 'KAGUYA', baseWeight: 4 },
  ],
};

export const MODE_CONFIG: ModeConfig = {
  requiredLevel: 10,
  requireAnyBloodline: true,
  atkMultiplier: 1.5,
  defMultiplier: 1.2,
  instantHealPercent: 0.2,
  mdCostPerTurn: 10,
};

export const ENEMIES: Record<string, EnemyDefinition> = {
  TRAINING_DUMMY: {
    id: 'TRAINING_DUMMY',
    name: '練習（れんしゅう）木人（もくじん）',
    description: '忍者学校の訓練用の木人。',
    stats: { maxHp: 50, atk: 5, def: 2, spd: 1 },
  },
  FOREST_WOLF: {
    id: 'FOREST_WOLF',
    name: '追跡（ついせき）忍犬（にんけん）',
    description: '木ノ葉村の追跡忍犬、速度が非常に速い。',
    stats: { maxHp: 70, atk: 9, def: 3, spd: 6 },
    element: 'EARTH',
    specialAbility: 'MULTI_HIT',
    specialAbilityChance: 0.30,
  },
  BANDIT_CHIEF: {
    id: 'BANDIT_CHIEF',
    name: '音忍（おとにん）の刺客（しかく）',
    description: '大蛇丸（おろちまる）配下の音忍の刺客、溜め攻撃を得意とする。',
    stats: { maxHp: 100, atk: 14, def: 4, spd: 3 },
    element: 'LIGHTNING',
    specialAbility: 'CHARGE',
    specialAbilityChance: 0.25,
  },
  ELITE_NINJA: {
    id: 'ELITE_NINJA',
    name: '暗部（あんぶ）隊員（たいいん）',
    description: '木ノ葉暗部の精鋭（せいえい）、実力は計り知れない。',
    stats: { maxHp: 140, atk: 17, def: 6, spd: 7 },
    element: 'FIRE',
    specialAbility: 'DEBUFF',
    specialAbilityChance: 0.25,
  },
  MOUNTAIN_BEAR: {
    id: 'MOUNTAIN_BEAR',
    name: '大岩熊（おおいわぐま）',
    description: '土遁術で強化された巨大な熊、攻撃力が驚異的（きょういてき）だ。',
    stats: { maxHp: 200, atk: 20, def: 9, spd: 2 },
    element: 'EARTH',
  },
  TEMPLE_MONK: {
    id: 'TEMPLE_MONK',
    name: '砂忍（すなにん）精鋭（せいえい）',
    description: '風の国・砂隠村の精鋭忍者、防御を得意とする。',
    stats: { maxHp: 160, atk: 22, def: 10, spd: 6 },
    element: 'WATER',
    specialAbility: 'HEAL',
    specialAbilityChance: 0.30,
  },
  GUARDIAN: {
    id: 'GUARDIAN',
    name: '四尾（よんび）の人柱力（じんちゅうりき）',
    description: '四尾（孫悟空）の人柱力、圧倒的な力を持つ。',
    stats: { maxHp: 350, atk: 28, def: 12, spd: 8 },
    element: 'FIRE',
    specialAbility: 'GUARD',
    specialAbilityChance: 0.25,
  },
  JONIN_VETERAN: {
    id: 'JONIN_VETERAN',
    name: '上忍（じょうにん）老兵（ろうへい）',
    description: '経験豊富な上忍、実戦能力が極めて高い。',
    stats: { maxHp: 320, atk: 34, def: 14, spd: 9 },
    element: 'EARTH',
  },
  SAND_PUPPETEER: {
    id: 'SAND_PUPPETEER',
    name: '砂の傀儡師（くぐつし）',
    description: '風の国の傀儡師（くぐつし）、防御と反撃を得意とする。',
    stats: { maxHp: 270, atk: 30, def: 22, spd: 6 },
    element: 'WIND',
    specialAbility: 'GUARD',
    specialAbilityChance: 0.35,
  },
  ROGUE_SHINOBI: {
    id: 'ROGUE_SHINOBI',
    name: '抜け忍（ぬけにん）',
    description: '村を離れた危険な抜け忍（ぬけにん）、実力が高く手段を選ばない。',
    stats: { maxHp: 400, atk: 40, def: 16, spd: 11 },
    element: 'LIGHTNING',
    specialAbility: 'DEBUFF',
    specialAbilityChance: 0.25,
  },
  AKATSUKI_MEMBER: {
    id: 'AKATSUKI_MEMBER',
    name: '暁（あかつき）の構成員（こうせいいん）',
    description: '謎の組織「暁」の構成員、その強大さに絶望を感じる。',
    stats: { maxHp: 550, atk: 52, def: 20, spd: 13 },
    element: 'FIRE',
    specialAbility: 'GUARD',
    specialAbilityChance: 0.2,
  },
  ANBU_CAPTAIN: {
    id: 'ANBU_CAPTAIN',
    name: '暗部（あんぶ）隊長（たいちょう）',
    description: '木ノ葉暗部の精鋭隊長、素早く攻守に優れる。',
    stats: { maxHp: 500, atk: 48, def: 26, spd: 14 },
    element: 'FIRE',
  },
  LEGENDARY_NINJA: {
    id: 'LEGENDARY_NINJA',
    name: '伝説（でんせつ）の忍者',
    description: '歴史に名を刻んだ伝説の忍者、速度と力は誰にも及ばない。',
    stats: { maxHp: 450, atk: 55, def: 20, spd: 19 },
    element: 'WIND',
    specialAbility: 'MULTI_HIT',
    specialAbilityChance: 0.35,
  },
  CURSED_SEAL_USER: {
    id: 'CURSED_SEAL_USER',
    name: '呪印（じゅいん）使い',
    description: '大蛇丸に呪印の力を与えられた忍者、溜め攻撃が極めて致命的だ。',
    stats: { maxHp: 600, atk: 60, def: 22, spd: 16 },
    element: 'LIGHTNING',
    specialAbility: 'CHARGE',
    specialAbilityChance: 0.30,
  },
  PAIN_AVATAR: {
    id: 'PAIN_AVATAR',
    name: '天道（てんどう）・六道仙人（ろくどうせんにん）',
    description: 'ペインの天道の体、引力（いんりょく）の術を操り、ほぼ防ぎようがない。',
    stats: { maxHp: 900, atk: 70, def: 32, spd: 20 },
    element: 'WATER',
    specialAbility: 'GUARD',
    specialAbilityChance: 0.25,
  },
};

export const QUESTS: QuestDefinition[] = [
  {
    id: 'GRIND_QUEST',
    name: '忍者学校（にんじゃがっこう）の訓練（くんれん）',
    description: '練習木人を5体倒して忍者の基礎を築け。',
    type: 'GRIND',
    requiredLevel: 1,
    requiredRank: 'E',
    targetEnemyId: 'TRAINING_DUMMY',
    targetCount: 5,
    reward: { exp: 50, ryo: 100 },
    repeatType: 'UNLIMITED',
    staminaCost: 5,
  },
  {
    id: 'WOLF_QUEST',
    name: '木ノ葉（このは）の巡回（じゅんかい）任務',
    description: '村を脅かす追跡忍犬を3匹倒せ。',
    type: 'GRIND',
    requiredLevel: 3,
    requiredRank: 'E',
    targetEnemyId: 'FOREST_WOLF',
    targetCount: 3,
    reward: { exp: 100, ryo: 120 },
    repeatType: 'UNLIMITED',
    staminaCost: 5,
  },
  {
    id: 'BANDIT_QUEST',
    name: '音忍（おとにん）討伐令（とうばつれい）',
    description: '商人を脅かす音忍の刺客を2名倒せ。',
    type: 'ELITE',
    requiredLevel: 6,
    requiredRank: 'E',
    targetEnemyId: 'BANDIT_CHIEF',
    targetCount: 2,
    reward: { exp: 170, ryo: 145 },
    repeatType: 'UNLIMITED',
    staminaCost: 8,
  },
  {
    id: 'ELITE_QUEST',
    name: '暗部（あんぶ）の試練（しれん）',
    description: '暗部隊員を1名倒して実力を証明せよ。',
    type: 'ELITE',
    requiredLevel: 10,
    requiredRank: 'E',
    targetEnemyId: 'ELITE_NINJA',
    targetCount: 1,
    reward: { exp: 260, ryo: 200 },
    repeatType: 'UNLIMITED',
    staminaCost: 8,
  },
  {
    id: 'BEAR_QUEST',
    name: '大岩熊（おおいわぐま）討伐（とうばつ）作戦',
    description: '商路を封鎖する大岩熊を3匹倒せ。',
    type: 'GRIND',
    requiredLevel: 14,
    requiredRank: 'E',
    targetEnemyId: 'MOUNTAIN_BEAR',
    targetCount: 3,
    reward: { exp: 360, ryo: 270 },
    repeatType: 'UNLIMITED',
    staminaCost: 8,
  },
  {
    id: 'CHUNIN_QUEST',
    name: '中忍（ちゅうにん）試験（しけん）予選（よせん）',
    description: '暗部隊員を2名倒して中忍試験予選を通過せよ。',
    type: 'ELITE',
    requiredLevel: 15,
    requiredRank: 'E',
    targetEnemyId: 'ELITE_NINJA',
    targetCount: 2,
    reward: { exp: 420, ryo: 290 },
    repeatType: 'UNLIMITED',
    staminaCost: 10,
  },
  {
    id: 'MONK_QUEST',
    name: '砂忍（すなにん）奇襲（きしゅう）',
    description: '盗まれた文物（ぶんぶつ）を守る砂忍精鋭を2名倒せ。',
    type: 'ELITE',
    requiredLevel: 18,
    requiredRank: 'E',
    targetEnemyId: 'TEMPLE_MONK',
    targetCount: 2,
    reward: { exp: 460, ryo: 330 },
    repeatType: 'UNLIMITED',
    staminaCost: 10,
  },
  {
    id: 'ELITE2_QUEST',
    name: '暗部（あんぶ）精鋭（せいえい）連戦（れんせん）',
    description: '暗部隊員を3名連続で倒して限界を示せ。',
    type: 'ELITE',
    requiredLevel: 22,
    requiredRank: 'E',
    targetEnemyId: 'ELITE_NINJA',
    targetCount: 3,
    reward: { exp: 560, ryo: 390 },
    repeatType: 'UNLIMITED',
    staminaCost: 12,
  },
  {
    id: 'BOSS_QUEST',
    name: '四尾（よんび）覚醒（かくせい）の戦い',
    description: '四尾の人柱力と戦い、ランクアップに十分な強さを証明せよ。',
    type: 'BOSS',
    requiredLevel: 25,
    requiredRank: 'E',
    targetEnemyId: 'GUARDIAN',
    targetCount: 1,
    reward: { exp: 700, ryo: 500, rankExp: 1 },
    repeatType: 'ONCE',
    staminaCost: 15,
  },
  // ── Rank D quests ─────────────────────────────────────────────────────────
  {
    id: 'D_PATROL_QUEST',
    name: '中忍（ちゅうにん）巡回（じゅんかい）任務',
    description: '上忍老兵を5名倒して中忍巡回任務を完了せよ。',
    type: 'GRIND',
    requiredLevel: 31,
    requiredRank: 'D',
    targetEnemyId: 'JONIN_VETERAN',
    targetCount: 5,
    reward: { exp: 800, ryo: 500 },
    repeatType: 'UNLIMITED',
    staminaCost: 8,
  },
  {
    id: 'D_PUPPET_QUEST',
    name: '傀儡師（くぐつし）討伐令（とうばつれい）',
    description: '砂の傀儡師を2名倒して脅威（きょうい）を排除せよ。',
    type: 'ELITE',
    requiredLevel: 36,
    requiredRank: 'D',
    targetEnemyId: 'SAND_PUPPETEER',
    targetCount: 2,
    reward: { exp: 1200, ryo: 750 },
    repeatType: 'UNLIMITED',
    staminaCost: 10,
  },
  {
    id: 'D_ROGUE_QUEST',
    name: '抜け忍（ぬけにん）追跡令（ついせきれい）',
    description: '抜け忍を追跡して2名倒し、村の安全を守れ。',
    type: 'ELITE',
    requiredLevel: 42,
    requiredRank: 'D',
    targetEnemyId: 'ROGUE_SHINOBI',
    targetCount: 2,
    reward: { exp: 1500, ryo: 900 },
    repeatType: 'UNLIMITED',
    staminaCost: 12,
  },
  {
    id: 'D_BOSS_QUEST',
    name: '暁（あかつき）との戦い',
    description: '暁の構成員と戦い、限界を突破して上忍に昇進せよ。',
    type: 'BOSS',
    requiredLevel: 46,
    requiredRank: 'D',
    targetEnemyId: 'AKATSUKI_MEMBER',
    targetCount: 1,
    reward: { exp: 2500, ryo: 1500, rankExp: 1 },
    repeatType: 'ONCE',
    staminaCost: 20,
  },
  // ── Rank C quests ─────────────────────────────────────────────────────────
  {
    id: 'C_ANBU_QUEST',
    name: '暗部（あんぶ）精鋭（せいえい）討伐（とうばつ）',
    description: '暗部隊長を5名倒して上忍の実力を証明せよ。',
    type: 'GRIND',
    requiredLevel: 51,
    requiredRank: 'C',
    targetEnemyId: 'ANBU_CAPTAIN',
    targetCount: 5,
    reward: { exp: 2000, ryo: 1000 },
    repeatType: 'UNLIMITED',
    staminaCost: 12,
  },
  {
    id: 'C_LEGEND_QUEST',
    name: '伝説（でんせつ）の忍者への挑戦（ちょうせん）',
    description: '伝説の忍者2名に挑戦して前人の限界を超えろ。',
    type: 'ELITE',
    requiredLevel: 58,
    requiredRank: 'C',
    targetEnemyId: 'LEGENDARY_NINJA',
    targetCount: 2,
    reward: { exp: 2800, ryo: 1400 },
    repeatType: 'UNLIMITED',
    staminaCost: 15,
  },
  {
    id: 'C_CURSED_QUEST',
    name: '呪印（じゅいん）使い討伐（とうばつ）',
    description: '呪印使いを2名討伐して邪悪な力を封印せよ。',
    type: 'ELITE',
    requiredLevel: 65,
    requiredRank: 'C',
    targetEnemyId: 'CURSED_SEAL_USER',
    targetCount: 2,
    reward: { exp: 3200, ryo: 1600 },
    repeatType: 'UNLIMITED',
    staminaCost: 18,
  },
  {
    id: 'C_BOSS_QUEST',
    name: '天道（てんどう）・六道仙人（ろくどうせんにん）との戦い',
    description: '天道ペインと戦い、真の伝説の忍者になれ。',
    type: 'BOSS',
    requiredLevel: 70,
    requiredRank: 'C',
    targetEnemyId: 'PAIN_AVATAR',
    targetCount: 1,
    reward: { exp: 5000, ryo: 3000, rankExp: 1 },
    repeatType: 'ONCE',
    staminaCost: 25,
  },
];

export const RANKS: RankDefinition[] = [
  {
    rank: 'E',
    nextRank: 'D',
    requiredLevelCap: 30,
    requiredBossClear: true,
    bonus: { baseAtkMultiplier: 1.0, spinRarityBonus: 0 },
  },
  {
    rank: 'D',
    nextRank: 'C',
    requiredLevelCap: 50,
    requiredBossClear: true,
    bonus: { baseAtkMultiplier: 1.1, spinRarityBonus: 0.05 },
  },
  {
    rank: 'C',
    nextRank: undefined,
    requiredLevelCap: 75,
    requiredBossClear: true,
    bonus: { baseAtkMultiplier: 1.2, spinRarityBonus: 0.1 },
  },
];

export function getLevelCapForRank(rank: Rank): number {
  return RANKS.find(r => r.rank === rank)?.requiredLevelCap ?? 30;
}

// Exponential EXP curve: 100 × 1.15^(level-1)
export const EXP_PER_LEVEL = (level: number): number => Math.floor(100 * Math.pow(1.15, level - 1));
export const LEVEL_CAP = 30;
export const STAT_POINTS_PER_LEVEL = 3;
export const ATK_PER_STR = 2;
export const HP_PER_VIT = 20;
export const MD_PER_FOC = 10;

export const RARE_BLOODLINE_IDS = ['STORM', 'MIST', 'VOID', 'SAND', 'LIGHTNING_BL', 'SHADOW', 'KAGUYA'];

export const ITEMS: Record<string, ItemDefinition> = {
  SMALL_POTION: { id: 'SMALL_POTION', name: '小型薬（こがたやく）', description: 'HPを30回復する', type: 'POTION', price: 80, effect: { hpRestore: 30 }, usableInCombat: true, usableOutOfCombat: true },
  LARGE_POTION: { id: 'LARGE_POTION', name: '大型薬（おおがたやく）', description: 'HPを40%回復する', type: 'POTION', price: 200, effect: { hpRestorePercent: 0.4 }, usableInCombat: true, usableOutOfCombat: true },
  CHAKRA_PILL: { id: 'CHAKRA_PILL', name: 'Chakra丸（まる）', description: 'Chakraを25回復する', type: 'CHAKRA_PILL', price: 100, effect: { mdRestore: 25 }, usableInCombat: true, usableOutOfCombat: true },
  CHAKRA_PILL_L: { id: 'CHAKRA_PILL_L', name: '大型Chakra丸（おおがたChakraまる）', description: 'Chakraを50%回復する', type: 'CHAKRA_PILL', price: 250, effect: { mdRestorePercent: 0.5 }, usableInCombat: true, usableOutOfCombat: true },
  ATK_SCROLL: { id: 'ATK_SCROLL', name: '攻撃（こうげき）強化の巻物（まきもの）', description: '戦闘中ATK+20%、5ターン持続', type: 'SCROLL', price: 350, effect: { atkMultiplier: 1.2, buffDuration: 5 }, usableInCombat: true, usableOutOfCombat: false },
  DEF_SCROLL: { id: 'DEF_SCROLL', name: '防御（ぼうぎょ）強化の巻物（まきもの）', description: '戦闘中DEF+25%、5ターン持続', type: 'SCROLL', price: 300, effect: { defMultiplier: 1.25, buffDuration: 5 }, usableInCombat: true, usableOutOfCombat: false },
  SPD_SCROLL: { id: 'SPD_SCROLL', name: '速度（そくど）強化の巻物（まきもの）', description: '戦闘中SPD+3、5ターン持続', type: 'SCROLL', price: 280, effect: { spdBonus: 3, buffDuration: 5 }, usableInCombat: true, usableOutOfCombat: false },
  STAMINA_PILL: { id: 'STAMINA_PILL', name: 'スタミナ丸（まる）', description: 'スタミナを30回復する', type: 'POTION', price: 120, effect: { staminaRestore: 30 }, usableInCombat: false, usableOutOfCombat: true },
};

export const QUEST_ZONES: { zone: string; emoji: string; questIds: string[] }[] = [
  { zone: '木ノ葉（このは）忍者学校', emoji: '🏫', questIds: ['GRIND_QUEST', 'WOLF_QUEST'] },
  { zone: '音忍（おとにん）の境界（きょうかい）', emoji: '🎵', questIds: ['BANDIT_QUEST'] },
  { zone: '木ノ葉（このは）暗部（あんぶ）道場（どうじょう）', emoji: '🌿', questIds: ['ELITE_QUEST', 'CHUNIN_QUEST', 'ELITE2_QUEST'] },
  { zone: '山中（さんちゅう）の道', emoji: '🏔️', questIds: ['BEAR_QUEST', 'MONK_QUEST'] },
  { zone: '最終（さいしゅう）試練（しれん）', emoji: '🌀', questIds: ['BOSS_QUEST'] },
  { zone: '中忍（ちゅうにん）領域（りょういき）', emoji: '🏯', questIds: ['D_PATROL_QUEST', 'D_PUPPET_QUEST', 'D_ROGUE_QUEST', 'D_BOSS_QUEST'] },
  { zone: '上忍（じょうにん）領域（りょういき）', emoji: '⚔️', questIds: ['C_ANBU_QUEST', 'C_LEGEND_QUEST', 'C_CURSED_QUEST', 'C_BOSS_QUEST'] },
];

export const GEAR: Record<string, GearDefinition> = {
  STARTER_SWORD: {
    id: 'STARTER_SWORD',
    name: '木ノ葉（このは）標準刀（ひょうじゅんとう）',
    description: '木ノ葉村下忍の標準装備、基本攻撃力を高める。',
    slot: 'WEAPON',
    rarity: 'COMMON',
    price: 200,
    stats: { atkBonus: 5 },
  },
  WIND_BLADE: {
    id: 'WIND_BLADE',
    name: '追風刃（ついかぜじん）',
    description: '風遁Chakraで強化された刀、攻撃力が大幅に上昇する。',
    slot: 'WEAPON',
    rarity: 'RARE',
    price: 600,
    stats: { atkBonus: 14 },
  },
  THUNDER_FANG: {
    id: 'THUNDER_FANG',
    name: '雷牙（らいが）',
    description: '雷遁で鍛えられた伝説の武器、攻撃力が非常に高い。',
    slot: 'WEAPON',
    rarity: 'LEGENDARY',
    price: 2000,
    stats: { atkBonus: 28 },
  },
  TRAINING_ROBE: {
    id: 'TRAINING_ROBE',
    name: '訓練（くんれん）道着（どうぎ）',
    description: '標準忍者道着、基本防御を提供する。',
    slot: 'ARMOR',
    rarity: 'COMMON',
    price: 200,
    stats: { defBonus: 5 },
  },
  ANBU_ARMOR: {
    id: 'ANBU_ARMOR',
    name: '暗部（あんぶ）の鎧（よろい）',
    description: '木ノ葉暗部の精鍛（せいたん）の鎧、攻守に優れている。',
    slot: 'ARMOR',
    rarity: 'RARE',
    price: 800,
    stats: { defBonus: 12, hpBonus: 30 },
  },
  SAGE_COAT: {
    id: 'SAGE_COAT',
    name: '仙人（せんにん）の外套（がいとう）',
    description: '伝説の仙人の鎧、毎ターン自動的に少量HPを回復する。',
    slot: 'ARMOR',
    rarity: 'LEGENDARY',
    price: 2500,
    stats: { defBonus: 20, hpBonus: 60, hpRegenPerTurn: 3 },
  },
  CHAKRA_BEAD: {
    id: 'CHAKRA_BEAD',
    name: 'Chakra数珠（じゅず）',
    description: 'Chakraに満ちた数珠、戦闘中Chakra回復を加速させる。',
    slot: 'ACCESSORY',
    rarity: 'COMMON',
    price: 300,
    stats: { mdRegenBonus: 8 },
  },
  SPEED_SEAL: {
    id: 'SPEED_SEAL',
    name: '速度（そくど）の封印（ふういん）',
    description: '皮膚（ひふ）に刻まれた速度封印、移動速度を大幅に上昇させる。',
    slot: 'ACCESSORY',
    rarity: 'RARE',
    price: 700,
    stats: { spdBonus: 4 },
  },
  LIFE_CHARM: {
    id: 'LIFE_CHARM',
    name: '命（いのち）の護符（ごふ）',
    description: '生命力に満ちた護符、毎ターン受動的にHPを回復する。',
    slot: 'ACCESSORY',
    rarity: 'LEGENDARY',
    price: 1800,
    stats: { hpRegenPerTurn: 5, hpBonus: 40 },
  },
};

export const GEAR_SHOP_IDS: string[] = [
  'STARTER_SWORD', 'WIND_BLADE', 'THUNDER_FANG',
  'TRAINING_ROBE', 'ANBU_ARMOR', 'SAGE_COAT',
  'CHAKRA_BEAD', 'SPEED_SEAL', 'LIFE_CHARM',
];

export interface SkillTierDefinition {
  name: string;
  description: string;
  effects: SkillEffectNumbers;
  mdCost?: number;
  hpCost?: number;
  cooldownTurn?: number;
}

export const SKILL_TIERS: Record<string, { kai?: SkillTierDefinition; ougi?: SkillTierDefinition }> = {
  BLAZE_SHOT: {
    kai: {
      name: '火遁・豪火球 改',
      description: '改良版豪火球の術。炎の持続時間が延長される。',
      effects: { damageMultiplier: 1.5, burnChance: 0.4, burnDamagePerTurn: 5, burnDuration: 5 },
    },
    ougi: {
      name: '火遁・真空波',
      description: '奥義：爆炎の波動を放ち、圧倒的な火属性ダメージを与える。',
      effects: { damageMultiplier: 2.8, burnChance: 0.6, burnDamagePerTurn: 8, burnDuration: 4 },
    },
  },
  THUNDER_STRIKE: {
    kai: {
      name: '雷切流',
      description: '雷切の改良型。速度低下効果が付与される。',
      effects: { damageMultiplier: 2.5, spdDebuff: true },
    },
    ougi: {
      name: '紫電',
      description: '奥義：紫の稲妻で敵を貫き、麻痺を与える。',
      effects: { damageMultiplier: 3.5, skipEnemyTurn: true },
      mdCost: 40,
    },
  },
  VOID_SLASH: {
    kai: {
      name: '天照 改',
      description: '天照の改良型。HP消費が軽減される。',
      effects: { damageMultiplier: 3.0 },
      hpCost: 10,
      mdCost: 20,
    },
    ougi: {
      name: '須佐能乎',
      description: '奥義：完全体須佐能乎を発動。次の敵の攻撃を30%反射する。',
      effects: { damageMultiplier: 4.0, reflectDamagePercent: 0.3 },
      hpCost: 25,
      mdCost: 30,
    },
  },
  IRON_GUARD: {
    kai: {
      name: '八卦六十四掌・改',
      description: '改良版八卦掌。回復量が増加する。',
      effects: { damageMultiplier: 0, healSelfPercent: 0.25 },
    },
    ougi: {
      name: '八卦空掌',
      description: '奥義：次の敵の攻撃を完全に反射する。',
      effects: { damageMultiplier: 0, healSelfPercent: 0.25, reflectDamagePercent: 0.5 },
    },
  },
  MIST_STEP: {
    kai: {
      name: '水遁・霧隠し 改',
      description: '改良版霧隠し。Chakra回復量が増加する。',
      effects: { damageMultiplier: 1.4, mdRestore: 30 },
    },
    ougi: {
      name: '幻霧殺',
      description: '奥義：霧の幻惑で敵の次の行動を封じる。',
      effects: { damageMultiplier: 2.0, mdRestore: 20, skipEnemyTurn: true },
    },
  },
  WATER_DRAGON: {
    kai: {
      name: '水遁・水龍弾 改',
      description: '水龍の力が増大し、より多くのダメージを与える。',
      effects: { damageMultiplier: 2.5 },
    },
    ougi: {
      name: '水遁・大爆流',
      description: '奥義：巨大な水流で敵を押し流す。',
      effects: { damageMultiplier: 3.5 },
    },
  },
  SAND_ARMOR: {
    kai: {
      name: '砂瀑（さばく）の防護盾 改',
      description: '改良版砂防護。回復量が増加する。',
      effects: { damageMultiplier: 0, healSelfPercent: 0.35 },
    },
    ougi: {
      name: '絶対防御',
      description: '奥義：砂で完全に身を包み、次のダメージを50%軽減しつつ回復する。',
      effects: { damageMultiplier: 0, healSelfPercent: 0.4, reflectDamagePercent: 0.2 },
    },
  },
  LIGHTNING_CLONE: {
    kai: {
      name: '雷遁・影分身 改',
      description: '分身の雷力が増強。燃焼確率が上昇する。',
      effects: { damageMultiplier: 2.2, burnChance: 0.45, burnDamagePerTurn: 8, burnDuration: 3 },
    },
    ougi: {
      name: '雷神の術',
      description: '奥義：雷の化身となり、圧倒的な電撃を放つ。',
      effects: { damageMultiplier: 3.2, burnChance: 0.6, burnDamagePerTurn: 10, burnDuration: 4 },
    },
  },
  EARTH_SPIKE: {
    kai: {
      name: '土遁・土流壁 改',
      description: '改良版土流壁。より強力な衝撃を与える。',
      effects: { damageMultiplier: 2.8 },
    },
    ougi: {
      name: '土遁・岩石激流',
      description: '奥義：大地を操り岩石の津波を起こす。',
      effects: { damageMultiplier: 3.8 },
      mdCost: 40,
    },
  },
  WIND_SLASH: {
    kai: {
      name: '風遁・風刃（ふうじん）の術 改',
      description: '改良版風刃の術。切れ味が増し、ダメージが向上する。',
      effects: { damageMultiplier: 2.0 },
    },
    ougi: {
      name: '風遁・真空波',
      description: '奥義：真空の刃で敵を切り裂く。',
      effects: { damageMultiplier: 3.0 },
    },
  },
  SHADOW_BIND: {
    kai: {
      name: '影縫い術 改',
      description: '影縫いの精度が上昇。Chakra吸収量が増える。',
      effects: { damageMultiplier: 1.8, mdRestore: 25 },
    },
    ougi: {
      name: '影真似の術・完全体',
      description: '奥義：完全な影模倣で敵を完全拘束する。',
      effects: { damageMultiplier: 2.4, mdRestore: 20, skipEnemyTurn: true },
    },
  },
  BONE_LANCE: {
    kai: {
      name: '屍骨脈（しこつみゃく）・骨槍（こつやり） 改',
      description: '骨槍の貫通力が向上する。HP消費が軽減される。',
      effects: { damageMultiplier: 2.8 },
      hpCost: 12,
      mdCost: 25,
    },
    ougi: {
      name: '屍骨脈・舞',
      description: '奥義：屍骨脈の究極奥義。骨を全身から放出し圧倒的ダメージを与える。',
      effects: { damageMultiplier: 4.0 },
      hpCost: 20,
      mdCost: 35,
    },
  },
};

export const ELEMENT_EMOJI: Record<Element, string> = {
  FIRE: '🔥', WATER: '💧', LIGHTNING: '⚡', EARTH: '🌍', WIND: '🌀',
};
