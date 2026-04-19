import type { BloodlineDefinition, EnemyDefinition, ModeConfig, QuestDefinition, RankDefinition, Rank, SkillDefinition, SpinConfig } from './types';

export const SAVE_VERSION = 2;
export const MD_REGEN_BASE = 5;

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
    name: '火遁・豪火球之術',
    description: '發射強大火球，造成火屬性傷害並可能引燃目標。',
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
    description: '以閃電凝聚於手，貫穿敵人，造成巨大雷屬性傷害。',
    hpCost: 0,
    mdCost: 30,
    cooldownTurn: 4,
    requiredLevel: 8,
    effects: {
      damageMultiplier: 2.5,
    },
  },
  VOID_SLASH: {
    id: 'VOID_SLASH',
    name: '萬花筒寫輪眼・天照',
    description: '以黑炎焚盡一切，消耗 HP 和 Chakra 換取極致破壞力。',
    hpCost: 20,
    mdCost: 20,
    cooldownTurn: 3,
    requiredLevel: 12,
    effects: {
      damageMultiplier: 3.0,
    },
  },
  IRON_GUARD: {
    id: 'IRON_GUARD',
    name: '八卦六十四掌・防禦',
    description: '以八卦掌封閉經脈，進入守護姿態，回復 15% HP。',
    hpCost: 0,
    mdCost: 20,
    cooldownTurn: 3,
    requiredLevel: 3,
    effects: {
      damageMultiplier: 0,
      healSelfPercent: 0.15,
    },
  },
  MIST_STEP: {
    id: 'MIST_STEP',
    name: '水遁・霧隱術',
    description: '隱身濃霧中發動奇襲，回復 20 Chakra。',
    hpCost: 0,
    mdCost: 25,
    cooldownTurn: 3,
    requiredLevel: 5,
    effects: {
      damageMultiplier: 1.2,
      mdRestore: 20,
    },
  },
};

export const BLOODLINES: Record<string, BloodlineDefinition> = {
  BLAZE: {
    id: 'BLAZE',
    name: '不知火一族（火遁）',
    rarity: 'COMMON',
    description: '擁有強大火遁血統，天生攻擊力提升。',
    passive: { atkMultiplier: 1.1 },
    skillIds: ['BLAZE_SHOT'],
  },
  STORM: {
    id: 'STORM',
    name: '日向一族（白眼）',
    rarity: 'RARE',
    description: '白眼洞察一切弱點，提升暴擊機率。',
    passive: { critChanceBonus: 0.1 },
    skillIds: ['THUNDER_STRIKE'],
  },
  VOID: {
    id: 'VOID',
    name: '宇智波一族（寫輪眼）',
    rarity: 'LEGENDARY',
    description: '寫輪眼賦予極致力量，但以生命力為代價。',
    passive: { atkMultiplier: 1.4, hpMultiplier: 0.8 },
    skillIds: ['VOID_SLASH'],
  },
  IRON: {
    id: 'IRON',
    name: '山中一族（鐵壁防禦）',
    rarity: 'COMMON',
    description: '山中一族的堅韌血脈，提供卓越防禦能力。',
    passive: { defMultiplier: 1.25 },
    skillIds: ['IRON_GUARD'],
  },
  MIST: {
    id: 'MIST',
    name: '霧隱一族（霧步）',
    rarity: 'RARE',
    description: '霧隱忍者的血統，速度與 Chakra 回復俱佳。',
    passive: { spdBonus: 2, mdRegenBonus: 5 },
    skillIds: ['MIST_STEP'],
  },
};

export const SPIN_CONFIG: SpinConfig = {
  priceRyo: 100,
  entries: [
    { bloodlineId: 'BLAZE', baseWeight: 60 },
    { bloodlineId: 'IRON', baseWeight: 60 },
    { bloodlineId: 'STORM', baseWeight: 20 },
    { bloodlineId: 'MIST', baseWeight: 15 },
    { bloodlineId: 'VOID', baseWeight: 5 },
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
    name: '替身木樁',
    description: '忍者學校的訓練用替身木樁。',
    stats: { maxHp: 50, atk: 5, def: 2, spd: 1 },
  },
  FOREST_WOLF: {
    id: 'FOREST_WOLF',
    name: '追蹤忍犬',
    description: '木葉村的追蹤忍犬，速度迅猛。',
    stats: { maxHp: 70, atk: 9, def: 3, spd: 6 },
  },
  BANDIT_CHIEF: {
    id: 'BANDIT_CHIEF',
    name: '音忍刺客',
    description: '大蛇丸麾下的音忍刺客，善於蓄力猛攻。',
    stats: { maxHp: 100, atk: 14, def: 4, spd: 3 },
    specialAbility: 'CHARGE',
    specialAbilityChance: 0.25,
  },
  ELITE_NINJA: {
    id: 'ELITE_NINJA',
    name: '暗部隊員',
    description: '木葉暗部的精銳成員，實力深不可測。',
    stats: { maxHp: 140, atk: 17, def: 6, spd: 7 },
  },
  MOUNTAIN_BEAR: {
    id: 'MOUNTAIN_BEAR',
    name: '巨型土熊',
    description: '受土遁術加持的巨型熊，攻擊力驚人。',
    stats: { maxHp: 200, atk: 20, def: 9, spd: 2 },
  },
  TEMPLE_MONK: {
    id: 'TEMPLE_MONK',
    name: '砂忍精英',
    description: '風之國砂隱村的精英忍者，善於防禦。',
    stats: { maxHp: 160, atk: 22, def: 10, spd: 6 },
    specialAbility: 'GUARD',
    specialAbilityChance: 0.3,
  },
  GUARDIAN: {
    id: 'GUARDIAN',
    name: '四尾人柱力',
    description: '四尾（孫悟空）的人柱力，擁有壓倒性的力量。',
    stats: { maxHp: 350, atk: 28, def: 12, spd: 8 },
    specialAbility: 'GUARD',
    specialAbilityChance: 0.25,
  },
};

export const QUESTS: QuestDefinition[] = [
  {
    id: 'GRIND_QUEST',
    name: '忍者學校訓練',
    description: '擊敗 5 個替身木樁，奠定忍者基礎。',
    type: 'GRIND',
    requiredLevel: 1,
    targetEnemyId: 'TRAINING_DUMMY',
    targetCount: 5,
    reward: { exp: 50, ryo: 80 },
  },
  {
    id: 'WOLF_QUEST',
    name: '木葉巡邏任務',
    description: '清除 3 隻威脅村莊的追蹤忍犬。',
    type: 'GRIND',
    requiredLevel: 3,
    targetEnemyId: 'FOREST_WOLF',
    targetCount: 3,
    reward: { exp: 100, ryo: 100 },
  },
  {
    id: 'BANDIT_QUEST',
    name: '音忍討伐令',
    description: '擊退 2 名勒索商人的音忍刺客。',
    type: 'ELITE',
    requiredLevel: 6,
    targetEnemyId: 'BANDIT_CHIEF',
    targetCount: 2,
    reward: { exp: 170, ryo: 145 },
  },
  {
    id: 'ELITE_QUEST',
    name: '暗部考驗',
    description: '擊敗一名暗部隊員，證明你的實力。',
    type: 'ELITE',
    requiredLevel: 10,
    targetEnemyId: 'ELITE_NINJA',
    targetCount: 1,
    reward: { exp: 260, ryo: 200 },
  },
  {
    id: 'BEAR_QUEST',
    name: '土熊清剿作戰',
    description: '清除 3 隻封鎖商路的巨型土熊。',
    type: 'GRIND',
    requiredLevel: 14,
    targetEnemyId: 'MOUNTAIN_BEAR',
    targetCount: 3,
    reward: { exp: 360, ryo: 270 },
  },
  {
    id: 'CHUNIN_QUEST',
    name: '中忍考試預選',
    description: '擊敗 2 名暗部隊員，通過中忍考試預選。',
    type: 'ELITE',
    requiredLevel: 15,
    targetEnemyId: 'ELITE_NINJA',
    targetCount: 2,
    reward: { exp: 420, ryo: 290 },
  },
  {
    id: 'MONK_QUEST',
    name: '砂忍奇襲',
    description: '擊退 2 名守護被盜文物的砂忍精英。',
    type: 'ELITE',
    requiredLevel: 18,
    targetEnemyId: 'TEMPLE_MONK',
    targetCount: 2,
    reward: { exp: 460, ryo: 330 },
  },
  {
    id: 'ELITE2_QUEST',
    name: '暗部精英連戰',
    description: '連續擊敗 3 名暗部隊員，展示你的極限。',
    type: 'ELITE',
    requiredLevel: 22,
    targetEnemyId: 'ELITE_NINJA',
    targetCount: 3,
    reward: { exp: 560, ryo: 390 },
  },
  {
    id: 'BOSS_QUEST',
    name: '四尾覺醒之戰',
    description: '迎戰四尾人柱力，證明你已足夠強大晉升忍者等級。',
    type: 'BOSS',
    requiredLevel: 25,
    targetEnemyId: 'GUARDIAN',
    targetCount: 1,
    reward: { exp: 700, ryo: 500, rankExp: 1 },
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
    requiredLevelCap: 30,
    requiredBossClear: true,
    bonus: { baseAtkMultiplier: 1.1, spinRarityBonus: 0.05 },
  },
  {
    rank: 'C',
    nextRank: undefined,
    requiredLevelCap: 30,
    requiredBossClear: true,
    bonus: { baseAtkMultiplier: 1.2, spinRarityBonus: 0.1 },
  },
];

// Exponential EXP curve: 100 × 1.15^(level-1)
export const EXP_PER_LEVEL = (level: number): number => Math.floor(100 * Math.pow(1.15, level - 1));
export const LEVEL_CAP = 30;
export const STAT_POINTS_PER_LEVEL = 3;
export const ATK_PER_STR = 2;
export const HP_PER_VIT = 20;
export const MD_PER_FOC = 10;
