export type Rarity = 'COMMON' | 'RARE' | 'LEGENDARY';
export type QuestType = 'GRIND' | 'ELITE' | 'BOSS';
export type Rank = 'E' | 'D' | 'C';
export type ActionType = 'ATTACK' | 'SKILL' | 'TOGGLE_MODE' | 'RUN';
export type Screen = 'HUB' | 'QUEST' | 'COMBAT' | 'SPIN' | 'STATUS' | 'CLINIC' | 'SHOP';
export type QuestRepeatType = 'DAILY' | 'ONCE';
export type ItemType = 'POTION' | 'CHAKRA_PILL' | 'SCROLL';

export interface ItemEffect {
  hpRestore?: number;
  hpRestorePercent?: number;
  mdRestore?: number;
  mdRestorePercent?: number;
  atkMultiplier?: number;
  defMultiplier?: number;
  spdBonus?: number;
  buffDuration?: number;
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  price: number;
  effect: ItemEffect;
  usableInCombat: boolean;
  usableOutOfCombat: boolean;
}

export interface InventoryItem { itemId: string; quantity: number; }
export interface ActiveBuff { itemId: string; remainingTurns: number; atkMultiplier?: number; defMultiplier?: number; spdBonus?: number; }

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
  completedQuestIds: string[];
  lastFreeRestDate: string;
  inventory: InventoryItem[];
  activeBuffs: ActiveBuff[];
  questResetTimestamps: Record<string, number>;
}

export interface SkillEffectNumbers {
  damageMultiplier?: number;
  hpCost?: number;
  mdCost?: number;
  burnChance?: number;
  burnDamagePerTurn?: number;
  burnDuration?: number;
  healSelfPercent?: number;
  mdRestore?: number;
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
    defMultiplier?: number;
    spdBonus?: number;
    mdRegenBonus?: number;
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
  requiredRank: Rank;
  targetEnemyId: string;
  targetCount: number;
  reward: QuestReward;
  repeatType: QuestRepeatType;
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
  specialAbility?: 'GUARD' | 'CHARGE';
  specialAbilityChance?: number;
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
    isGuarding: boolean;
    chargeReady: boolean;
  };
  skillCooldowns: SkillCooldownState[];
  turnNumber: number;
  battleLog: string[];
  phase: 'PLAYER_TURN' | 'ENEMY_TURN' | 'VICTORY' | 'DEFEAT' | 'QUEST_COMPLETE';
  enemiesDefeated: number;
  questId: string;
  modeCooldown: number;
}
