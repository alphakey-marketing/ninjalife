export type Rarity = 'COMMON' | 'RARE' | 'LEGENDARY';
export type QuestType = 'GRIND' | 'ELITE' | 'BOSS';
export type Rank = 'E' | 'D' | 'C';
export type ActionType = 'ATTACK' | 'SKILL' | 'TOGGLE_MODE' | 'RUN';
export type Screen = 'HUB' | 'QUEST' | 'COMBAT' | 'SPIN' | 'STATUS';

export interface PlayerStats {
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  md: number;
  maxMd: number;
}

export interface StatPoints {
  unspent: number;
  str: number;
  vit: number;
  foc: number;
}

export interface OwnedBloodline {
  id: string;
  mastery: number;
}

export interface PlayerState {
  name: string;
  rank: Rank;
  rankBonus: {
    baseAtkMultiplier: number;
    spinRarityBonus: number;
  };
  stats: PlayerStats;
  statPoints: StatPoints;
  ryo: number;
  ownedBloodlines: OwnedBloodline[];
  equippedBloodlineId: string | null;
  unlockedMode: boolean;
  isInMode: boolean;
  currentQuestId: string | null;
  bossDefeatedThisRank: boolean;
}

export interface SkillEffectNumbers {
  damageMultiplier?: number;
  hpCost?: number;
  mdCost?: number;
  burnChance?: number;
  burnDamagePerTurn?: number;
  burnDuration?: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  hpCost: number;
  mdCost: number;
  cooldownTurn: number;
  requiredLevel: number;
  effects: SkillEffectNumbers;
}

export interface BloodlineDefinition {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  passive: {
    atkMultiplier?: number;
    hpMultiplier?: number;
    critChanceBonus?: number;
  };
  skillIds: string[];
}

export interface SpinEntry {
  bloodlineId: string;
  baseWeight: number;
}

export interface SpinConfig {
  priceRyo: number;
  entries: SpinEntry[];
}

export interface ModeConfig {
  requiredLevel: number;
  requireAnyBloodline: boolean;
  atkMultiplier: number;
  defMultiplier: number;
  instantHealPercent: number;
  mdCostPerTurn: number;
}

export interface QuestReward {
  exp: number;
  ryo: number;
  rankExp?: number;
}

export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  requiredLevel: number;
  targetEnemyId: string;
  targetCount: number;
  reward: QuestReward;
}

export interface EnemyStats {
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  description: string;
  stats: EnemyStats;
}

export interface RankDefinition {
  rank: Rank;
  nextRank?: Rank;
  requiredLevelCap: number;
  requiredBossClear: boolean;
  bonus: {
    baseAtkMultiplier: number;
    spinRarityBonus: number;
  };
}

export interface SkillCooldownState {
  skillId: string;
  remainingTurns: number;
}

export interface StatusEffect {
  type: 'BURN';
  damagePerTurn: number;
  remainingTurns: number;
}

export interface BattleState {
  player: PlayerState;
  enemy: {
    definition: EnemyDefinition;
    currentHp: number;
    statusEffects: StatusEffect[];
  };
  skillCooldowns: SkillCooldownState[];
  turnNumber: number;
  battleLog: string[];
  phase: 'PLAYER_TURN' | 'ENEMY_TURN' | 'VICTORY' | 'DEFEAT' | 'QUEST_COMPLETE';
  enemiesDefeated: number;
  questId: string;
  modeCooldown: number;
}
