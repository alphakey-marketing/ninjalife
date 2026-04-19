import type { BloodlineDefinition, EnemyDefinition, ModeConfig, QuestDefinition, RankDefinition, SkillDefinition, SpinConfig } from './types';

export const SAVE_VERSION = 2;
export const MD_REGEN_BASE = 5;

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
    requiredLevel: 8,
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
    requiredLevel: 12,
    effects: {
      damageMultiplier: 3.0,
    },
  },
  IRON_GUARD: {
    id: 'IRON_GUARD',
    name: 'Iron Guard',
    description: 'Take a defensive stance to recover 15% HP.',
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
    name: 'Mist Step',
    description: 'Strike from the mist and absorb energy, restoring 20 MD.',
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
  IRON: {
    id: 'IRON',
    name: 'Iron',
    rarity: 'COMMON',
    description: 'The bloodline of iron. Grants superior defense.',
    passive: { defMultiplier: 1.25 },
    skillIds: ['IRON_GUARD'],
  },
  MIST: {
    id: 'MIST',
    name: 'Mist',
    rarity: 'RARE',
    description: 'The bloodline of the mist. Enhances speed and MD recovery.',
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
    name: 'Training Dummy',
    description: 'A wooden dummy used for practice.',
    stats: { maxHp: 50, atk: 5, def: 2, spd: 1 },
  },
  FOREST_WOLF: {
    id: 'FOREST_WOLF',
    name: 'Forest Wolf',
    description: 'A swift predator of the forest.',
    stats: { maxHp: 70, atk: 9, def: 3, spd: 6 },
  },
  BANDIT_CHIEF: {
    id: 'BANDIT_CHIEF',
    name: 'Bandit Chief',
    description: 'A ruthless bandit who charges up powerful strikes.',
    stats: { maxHp: 100, atk: 14, def: 4, spd: 3 },
    specialAbility: 'CHARGE',
    specialAbilityChance: 0.25,
  },
  ELITE_NINJA: {
    id: 'ELITE_NINJA',
    name: 'Elite Ninja',
    description: 'A seasoned ninja warrior.',
    stats: { maxHp: 140, atk: 17, def: 6, spd: 7 },
  },
  MOUNTAIN_BEAR: {
    id: 'MOUNTAIN_BEAR',
    name: 'Mountain Bear',
    description: 'A massive bear with tough hide.',
    stats: { maxHp: 200, atk: 20, def: 9, spd: 2 },
  },
  TEMPLE_MONK: {
    id: 'TEMPLE_MONK',
    name: 'Temple Monk',
    description: 'A disciplined warrior who can guard against attacks.',
    stats: { maxHp: 160, atk: 22, def: 10, spd: 6 },
    specialAbility: 'GUARD',
    specialAbilityChance: 0.3,
  },
  GUARDIAN: {
    id: 'GUARDIAN',
    name: 'Guardian',
    description: 'The powerful guardian boss.',
    stats: { maxHp: 350, atk: 28, def: 12, spd: 8 },
    specialAbility: 'GUARD',
    specialAbilityChance: 0.25,
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
    id: 'WOLF_QUEST',
    name: 'Forest Patrol',
    description: 'Hunt down 3 Forest Wolves threatening the village.',
    type: 'GRIND',
    requiredLevel: 3,
    targetEnemyId: 'FOREST_WOLF',
    targetCount: 3,
    reward: { exp: 100, ryo: 100 },
  },
  {
    id: 'BANDIT_QUEST',
    name: 'Bandit Takedown',
    description: 'Defeat 2 Bandit Chiefs extorting merchants.',
    type: 'ELITE',
    requiredLevel: 6,
    targetEnemyId: 'BANDIT_CHIEF',
    targetCount: 2,
    reward: { exp: 170, ryo: 145 },
  },
  {
    id: 'ELITE_QUEST',
    name: 'Elite Challenge',
    description: 'Defeat an Elite Ninja to prove your worth.',
    type: 'ELITE',
    requiredLevel: 10,
    targetEnemyId: 'ELITE_NINJA',
    targetCount: 1,
    reward: { exp: 260, ryo: 200 },
  },
  {
    id: 'BEAR_QUEST',
    name: 'Mountain Hunt',
    description: 'Clear 3 Mountain Bears blocking the trade route.',
    type: 'GRIND',
    requiredLevel: 14,
    targetEnemyId: 'MOUNTAIN_BEAR',
    targetCount: 3,
    reward: { exp: 360, ryo: 270 },
  },
  {
    id: 'MONK_QUEST',
    name: 'Temple Raid',
    description: 'Defeat 2 Temple Monks guarding a stolen artifact.',
    type: 'ELITE',
    requiredLevel: 18,
    targetEnemyId: 'TEMPLE_MONK',
    targetCount: 2,
    reward: { exp: 460, ryo: 330 },
  },
  {
    id: 'ELITE2_QUEST',
    name: 'Elite Gauntlet',
    description: 'Defeat 3 Elite Ninjas in succession to prove your mastery.',
    type: 'ELITE',
    requiredLevel: 22,
    targetEnemyId: 'ELITE_NINJA',
    targetCount: 3,
    reward: { exp: 560, ryo: 390 },
  },
  {
    id: 'BOSS_QUEST',
    name: 'Guardian Trial',
    description: 'Face the Guardian and prove you deserve to rank up.',
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
