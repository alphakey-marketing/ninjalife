import type { BloodlineDefinition, EnemyDefinition, ModeConfig, QuestDefinition, RankDefinition, SkillDefinition, SpinConfig } from './types';

export const SKILLS: Record<string, SkillDefinition> = {
  BLAZE_SHOT: {
    id: 'BLAZE_SHOT',
    name: 'Blaze Shot',
    description: 'Fire a blazing projectile. Deals fire damage and may inflict Burn.',
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
    name: 'Thunder Strike',
    description: 'Summon lightning for massive damage.',
    hpCost: 0,
    mdCost: 30,
    cooldownTurn: 4,
    requiredLevel: 5,
    effects: {
      damageMultiplier: 2.5,
    },
  },
  VOID_SLASH: {
    id: 'VOID_SLASH',
    name: 'Void Slash',
    description: 'A devastating strike that costs both HP and MD for extreme damage.',
    hpCost: 20,
    mdCost: 20,
    cooldownTurn: 3,
    requiredLevel: 8,
    effects: {
      damageMultiplier: 3.0,
    },
  },
};

export const BLOODLINES: Record<string, BloodlineDefinition> = {
  BLAZE: {
    id: 'BLAZE',
    name: 'Blaze',
    rarity: 'COMMON',
    description: 'The bloodline of fire. Grants enhanced attack power.',
    passive: { atkMultiplier: 1.1 },
    skillIds: ['BLAZE_SHOT'],
  },
  STORM: {
    id: 'STORM',
    name: 'Storm',
    rarity: 'RARE',
    description: 'The bloodline of storms. Grants critical strike chance.',
    passive: { critChanceBonus: 0.1 },
    skillIds: ['THUNDER_STRIKE'],
  },
  VOID: {
    id: 'VOID',
    name: 'Void',
    rarity: 'LEGENDARY',
    description: 'The bloodline of the void. Extreme power at extreme cost.',
    passive: { atkMultiplier: 1.4, hpMultiplier: 0.8 },
    skillIds: ['VOID_SLASH'],
  },
};

export const SPIN_CONFIG: SpinConfig = {
  priceRyo: 100,
  entries: [
    { bloodlineId: 'BLAZE', baseWeight: 75 },
    { bloodlineId: 'STORM', baseWeight: 20 },
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
    name: 'Training Dummy',
    description: 'A wooden dummy used for practice.',
    stats: { maxHp: 50, atk: 5, def: 2, spd: 1 },
  },
  ELITE_NINJA: {
    id: 'ELITE_NINJA',
    name: 'Elite Ninja',
    description: 'A seasoned ninja warrior.',
    stats: { maxHp: 120, atk: 15, def: 5, spd: 5 },
  },
  GUARDIAN: {
    id: 'GUARDIAN',
    name: 'Guardian',
    description: 'The powerful guardian boss.',
    stats: { maxHp: 300, atk: 25, def: 10, spd: 8 },
  },
};

export const QUESTS: QuestDefinition[] = [
  {
    id: 'GRIND_QUEST',
    name: 'Basic Training',
    description: 'Defeat 5 Training Dummies to build your foundation.',
    type: 'GRIND',
    requiredLevel: 1,
    targetEnemyId: 'TRAINING_DUMMY',
    targetCount: 5,
    reward: { exp: 50, ryo: 80 },
  },
  {
    id: 'ELITE_QUEST',
    name: 'Elite Challenge',
    description: 'Defeat an Elite Ninja to prove your worth.',
    type: 'ELITE',
    requiredLevel: 5,
    targetEnemyId: 'ELITE_NINJA',
    targetCount: 1,
    reward: { exp: 120, ryo: 150 },
  },
  {
    id: 'BOSS_QUEST',
    name: 'Guardian Trial',
    description: 'Face the Guardian and prove you deserve to rank up.',
    type: 'BOSS',
    requiredLevel: 10,
    targetEnemyId: 'GUARDIAN',
    targetCount: 1,
    reward: { exp: 300, ryo: 300, rankExp: 1 },
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

export const EXP_PER_LEVEL = (level: number): number => 200 + level * 80 - Math.floor(level * level * 1.5);
export const LEVEL_CAP = 30;
export const STAT_POINTS_PER_LEVEL = 3;
export const ATK_PER_STR = 2;
export const HP_PER_VIT = 20;
export const MD_PER_FOC = 10;
