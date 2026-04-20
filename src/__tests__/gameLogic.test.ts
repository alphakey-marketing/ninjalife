import { describe, it, expect } from 'vitest';
import {
  applyItemEffect,
  calcDamage,
  calcEnemyDamage,
  calcMdRegen,
  calcPlayerAtk,
  calcPlayerDef,
  calcPlayerMaxHp,
  calcPlayerSpd,
  canRankUp,
  checkLevelUp,
  enemyHasFirstStrike,
  equipBloodline,
  getTodayString,
  hasCritBonus,
  isQuestAvailableForPlayer,
  performAttack,
  performRankUp,
  performRest,
} from '../gameLogic';
import type { BattleState, PlayerState } from '../types';
import { CLINIC_COSTS, EXP_PER_LEVEL, MD_REGEN_BASE, QUESTS } from '../constants';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    name: 'Ninja',
    rank: 'E',
    rankBonus: { baseAtkMultiplier: 1.0, spinRarityBonus: 0 },
    stats: { level: 1, exp: 0, hp: 100, maxHp: 100, atk: 10, def: 5, spd: 5, md: 50, maxMd: 50 },
    statPoints: { unspent: 0, str: 0, vit: 0, foc: 0 },
    ryo: 0,
    ownedBloodlines: [],
    equippedBloodlineId: null,
    unlockedMode: false,
    isInMode: false,
    currentQuestId: null,
    bossDefeatedThisRank: false,
    completedQuestIds: [],
    lastFreeRestDate: '',
    inventory: [],
    activeBuffs: [],
    questResetTimestamps: {},
    ...overrides,
  };
}

function makeBattle(playerOverrides: Partial<PlayerState> = {}): BattleState {
  return {
    player: makePlayer(playerOverrides),
    enemy: {
      definition: {
        id: 'TRAINING_DUMMY',
        name: 'Training Dummy',
        description: '',
        stats: { maxHp: 50, atk: 5, def: 2, spd: 1 },
      },
      currentHp: 50,
      statusEffects: [],
      isGuarding: false,
      chargeReady: false,
    },
    skillCooldowns: [],
    turnNumber: 1,
    battleLog: [],
    phase: 'PLAYER_TURN',
    enemiesDefeated: 0,
    questId: 'GRIND_QUEST',
    modeCooldown: 0,
  };
}

// ── calcDamage / calcEnemyDamage ──────────────────────────────────────────────

describe('calcDamage', () => {
  it('returns at least 1', () => {
    expect(calcDamage(1, 100)).toBe(1);
  });
  it('calculates correctly', () => {
    // atk 10, def 2 → 10 - 1 = 9
    expect(calcDamage(10, 2)).toBe(9);
  });
});

describe('calcEnemyDamage', () => {
  it('returns at least 1', () => {
    expect(calcEnemyDamage(1, 100)).toBe(1);
  });
  it('calculates correctly', () => {
    expect(calcEnemyDamage(10, 4)).toBe(8);
  });
});

// ── calcPlayerAtk ─────────────────────────────────────────────────────────────

describe('calcPlayerAtk', () => {
  it('returns base atk without bloodline', () => {
    expect(calcPlayerAtk(makePlayer())).toBe(10);
  });

  it('applies BLAZE bloodline atkMultiplier', () => {
    const player = makePlayer({
      equippedBloodlineId: 'BLAZE',
      ownedBloodlines: [{ id: 'BLAZE', mastery: 1 }],
    });
    expect(calcPlayerAtk(player)).toBeCloseTo(11, 5); // 10 × 1.1
  });

  it('scales with mastery (+2% per level)', () => {
    const player = makePlayer({
      equippedBloodlineId: 'BLAZE',
      ownedBloodlines: [{ id: 'BLAZE', mastery: 3 }],
    });
    // 10 × (1.1 + 0.04) = 10 × 1.14 = 11.4
    expect(calcPlayerAtk(player)).toBeCloseTo(11.4, 5);
  });

  it('applies rank bonus', () => {
    const player = makePlayer({ rankBonus: { baseAtkMultiplier: 1.1, spinRarityBonus: 0 } });
    expect(calcPlayerAtk(player)).toBeCloseTo(11, 5);
  });
});

// ── calcPlayerDef ─────────────────────────────────────────────────────────────

describe('calcPlayerDef', () => {
  it('returns base def without bloodline', () => {
    expect(calcPlayerDef(makePlayer())).toBe(5);
  });

  it('applies IRON bloodline defMultiplier', () => {
    const player = makePlayer({
      equippedBloodlineId: 'IRON',
      ownedBloodlines: [{ id: 'IRON', mastery: 1 }],
    });
    expect(calcPlayerDef(player)).toBeCloseTo(6.25, 5); // 5 × 1.25
  });
});

// ── calcPlayerMaxHp ───────────────────────────────────────────────────────────

describe('calcPlayerMaxHp', () => {
  it('returns base maxHp without bloodline', () => {
    expect(calcPlayerMaxHp(makePlayer())).toBe(100);
  });

  it('applies VOID hpMultiplier (reduces HP)', () => {
    const player = makePlayer({
      equippedBloodlineId: 'VOID',
      ownedBloodlines: [{ id: 'VOID', mastery: 1 }],
    });
    expect(calcPlayerMaxHp(player)).toBe(80); // 100 × 0.8
  });
});

// ── calcPlayerSpd ─────────────────────────────────────────────────────────────

describe('calcPlayerSpd', () => {
  it('returns base spd without bloodline', () => {
    expect(calcPlayerSpd(makePlayer())).toBe(5);
  });

  it('applies MIST spdBonus', () => {
    const player = makePlayer({
      equippedBloodlineId: 'MIST',
      ownedBloodlines: [{ id: 'MIST', mastery: 1 }],
    });
    expect(calcPlayerSpd(player)).toBe(7); // 5 + 2
  });

  it('scales MIST spdBonus with mastery', () => {
    const player = makePlayer({
      equippedBloodlineId: 'MIST',
      ownedBloodlines: [{ id: 'MIST', mastery: 3 }],
    });
    expect(calcPlayerSpd(player)).toBe(9); // 5 + 2 + 2 (mastery bonus)
  });
});

// ── hasCritBonus ──────────────────────────────────────────────────────────────

describe('hasCritBonus', () => {
  it('returns 0 without bloodline', () => {
    expect(hasCritBonus(makePlayer())).toBe(0);
  });

  it('returns STORM critChanceBonus', () => {
    const player = makePlayer({
      equippedBloodlineId: 'STORM',
      ownedBloodlines: [{ id: 'STORM', mastery: 1 }],
    });
    expect(hasCritBonus(player)).toBeCloseTo(0.1, 5);
  });
});

// ── calcMdRegen ───────────────────────────────────────────────────────────────

describe('calcMdRegen', () => {
  it('returns base regen without bloodline or foc', () => {
    expect(calcMdRegen(makePlayer())).toBe(MD_REGEN_BASE);
  });

  it('increases with FOC stat points', () => {
    const player = makePlayer({ statPoints: { unspent: 0, str: 0, vit: 0, foc: 4 } });
    expect(calcMdRegen(player)).toBe(MD_REGEN_BASE + 2); // +floor(4/2) = +2
  });

  it('includes MIST mdRegenBonus', () => {
    const player = makePlayer({
      equippedBloodlineId: 'MIST',
      ownedBloodlines: [{ id: 'MIST', mastery: 1 }],
    });
    expect(calcMdRegen(player)).toBe(MD_REGEN_BASE + 5); // +5 from MIST
  });
});

// ── enemyHasFirstStrike ────────────────────────────────────────────────────────

describe('enemyHasFirstStrike', () => {
  it('returns false when enemy SPD is equal', () => {
    expect(enemyHasFirstStrike(makePlayer({ stats: { ...makePlayer().stats, spd: 5 } }), 5)).toBe(false);
  });

  it('returns false when enemy SPD is 2 ahead', () => {
    expect(enemyHasFirstStrike(makePlayer(), 7)).toBe(false);
  });

  it('returns true when enemy SPD is 3 or more ahead', () => {
    expect(enemyHasFirstStrike(makePlayer(), 8)).toBe(true);
  });
});

// ── EXP_PER_LEVEL ─────────────────────────────────────────────────────────────

describe('EXP_PER_LEVEL (exponential curve)', () => {
  it('LV1 requires 100 EXP', () => {
    expect(EXP_PER_LEVEL(1)).toBe(100);
  });

  it('is strictly increasing', () => {
    for (let lv = 1; lv < 29; lv++) {
      expect(EXP_PER_LEVEL(lv + 1)).toBeGreaterThan(EXP_PER_LEVEL(lv));
    }
  });

  it('LV30 requirement is within a reasonable range (< 10000)', () => {
    expect(EXP_PER_LEVEL(29)).toBeLessThan(10000);
  });
});

// ── checkLevelUp ──────────────────────────────────────────────────────────────

describe('checkLevelUp', () => {
  it('does not level up when EXP is below threshold', () => {
    const player = makePlayer({ stats: { ...makePlayer().stats, exp: 50 } });
    expect(checkLevelUp(player).stats.level).toBe(1);
  });

  it('levels up when EXP meets threshold', () => {
    const player = makePlayer({ stats: { ...makePlayer().stats, exp: 100 } });
    const result = checkLevelUp(player);
    expect(result.stats.level).toBe(2);
    expect(result.stats.exp).toBe(0); // EXP carries over
  });

  it('awards stat points on level up', () => {
    const player = makePlayer({ stats: { ...makePlayer().stats, exp: 100 } });
    const result = checkLevelUp(player);
    expect(result.statPoints.unspent).toBe(3);
  });

  it('does not exceed rank level cap', () => {
    const player = makePlayer({ stats: { ...makePlayer().stats, level: 30, exp: 99999 } });
    expect(checkLevelUp(player).stats.level).toBe(30);
  });

  it('handles multi-level-up from excess EXP', () => {
    // Give enough EXP to go from LV1 to LV3
    const expNeeded = EXP_PER_LEVEL(1) + EXP_PER_LEVEL(2);
    const player = makePlayer({ stats: { ...makePlayer().stats, exp: expNeeded } });
    const result = checkLevelUp(player);
    expect(result.stats.level).toBe(3);
  });
});

// ── performRankUp ─────────────────────────────────────────────────────────────

describe('performRankUp', () => {
  it('advances rank from E to D', () => {
    const player = makePlayer({ rank: 'E', stats: { ...makePlayer().stats, level: 30 }, bossDefeatedThisRank: true });
    expect(performRankUp(player).rank).toBe('D');
  });

  it('resets level to 1', () => {
    const player = makePlayer({ rank: 'E', stats: { ...makePlayer().stats, level: 30 } });
    expect(performRankUp(player).stats.level).toBe(1);
  });

  it('retains owned bloodlines', () => {
    const player = makePlayer({
      rank: 'E',
      ownedBloodlines: [{ id: 'BLAZE', mastery: 2 }],
      equippedBloodlineId: 'BLAZE',
    });
    const result = performRankUp(player);
    expect(result.ownedBloodlines).toHaveLength(1);
    expect(result.ownedBloodlines[0].mastery).toBe(2);
  });

  it('clamps starting HP to effective max when Void bloodline is equipped', () => {
    const player = makePlayer({
      rank: 'E',
      equippedBloodlineId: 'VOID',
      ownedBloodlines: [{ id: 'VOID', mastery: 1 }],
    });
    const result = performRankUp(player);
    // Void hpMultiplier 0.8 → 100 × 0.8 = 80
    expect(result.stats.hp).toBe(80);
  });

  it('returns unchanged player when already rank C', () => {
    const player = makePlayer({ rank: 'C' });
    expect(performRankUp(player).rank).toBe('C');
  });
});

// ── canRankUp ─────────────────────────────────────────────────────────────────

describe('canRankUp', () => {
  it('returns false when not level 30', () => {
    const p = makePlayer({ rank: 'E', bossDefeatedThisRank: true, stats: { ...makePlayer().stats, level: 29 } });
    expect(canRankUp(p)).toBe(false);
  });

  it('returns false when boss not cleared', () => {
    const p = makePlayer({ rank: 'E', bossDefeatedThisRank: false, stats: { ...makePlayer().stats, level: 30 } });
    expect(canRankUp(p)).toBe(false);
  });

  it('returns true when conditions met', () => {
    const p = makePlayer({ rank: 'E', bossDefeatedThisRank: true, stats: { ...makePlayer().stats, level: 30 } });
    expect(canRankUp(p)).toBe(true);
  });

  it('returns false at rank C (max rank)', () => {
    const p = makePlayer({ rank: 'C', bossDefeatedThisRank: true, stats: { ...makePlayer().stats, level: 30 } });
    expect(canRankUp(p)).toBe(false);
  });
});

// ── equipBloodline ────────────────────────────────────────────────────────────

describe('equipBloodline', () => {
  it('equips a bloodline the player owns', () => {
    const player = makePlayer({ ownedBloodlines: [{ id: 'BLAZE', mastery: 1 }] });
    const result = equipBloodline(player, 'BLAZE');
    expect(result.equippedBloodlineId).toBe('BLAZE');
  });

  it('does not equip a bloodline the player does not own', () => {
    const result = equipBloodline(makePlayer(), 'BLAZE');
    expect(result.equippedBloodlineId).toBeNull();
  });

  it('does not bake HP multiplier into stats.maxHp', () => {
    const player = makePlayer({ ownedBloodlines: [{ id: 'VOID', mastery: 1 }] });
    const result = equipBloodline(player, 'VOID');
    // stats.maxHp stays 100; effective max is 80 via calcPlayerMaxHp
    expect(result.stats.maxHp).toBe(100);
    expect(calcPlayerMaxHp(result)).toBe(80);
  });
});

// ── performAttack ─────────────────────────────────────────────────────────────

describe('performAttack', () => {
  it('deals positive damage', () => {
    const battle = makeBattle();
    const result = performAttack(battle);
    expect(result.enemy.currentHp).toBeLessThan(50);
  });

  it('transitions to VICTORY when enemy HP reaches 0', () => {
    const battle = makeBattle({ stats: { ...makePlayer().stats, atk: 9999 } });
    const result = performAttack(battle);
    expect(result.phase).toBe('VICTORY');
    expect(result.enemy.currentHp).toBe(0);
  });

  it('halves damage against a guarding enemy', () => {
    const battle = { ...makeBattle(), enemy: { ...makeBattle().enemy, isGuarding: true } };
    const normal = performAttack(makeBattle());
    const guarded = performAttack(battle);
    const normalDmg = 50 - normal.enemy.currentHp;
    const guardedDmg = 50 - guarded.enemy.currentHp;
    // Guarded should be ≤ half of normal (floor may shift by 1)
    expect(guardedDmg).toBeLessThanOrEqual(Math.ceil(normalDmg / 2));
  });

  it('does nothing outside of PLAYER_TURN phase', () => {
    const battle = { ...makeBattle(), phase: 'ENEMY_TURN' as const };
    expect(performAttack(battle)).toBe(battle);
  });
});

// ── performRest ───────────────────────────────────────────────────────────────

describe('performRest (FREE)', () => {
  it('restores 50% HP and Chakra on free rest', () => {
    const player = makePlayer({ stats: { ...makePlayer().stats, hp: 40, md: 10 } });
    const { player: result, success } = performRest(player, 'FREE');
    expect(success).toBe(true);
    expect(result.stats.hp).toBe(Math.min(100, 40 + Math.floor(100 * 0.5)));
    expect(result.stats.md).toBe(Math.min(50, 10 + Math.floor(50 * 0.5)));
  });

  it('marks lastFreeRestDate after use', () => {
    const player = makePlayer();
    const { player: result } = performRest(player, 'FREE');
    expect(result.lastFreeRestDate).toBe(getTodayString());
    expect(result.lastFreeRestDate).not.toBe('');
  });

  it('fails when free rest already used today', () => {
    const player = makePlayer({ lastFreeRestDate: getTodayString() });
    const { success, player: unchanged } = performRest(player, 'FREE');
    expect(success).toBe(false);
    expect(unchanged).toBe(player);
  });

  it('does not exceed max HP or Chakra', () => {
    const player = makePlayer({ stats: { ...makePlayer().stats, hp: 90, md: 45 } });
    const { player: result } = performRest(player, 'FREE');
    expect(result.stats.hp).toBeLessThanOrEqual(100);
    expect(result.stats.md).toBeLessThanOrEqual(50);
  });
});

describe('performRest (PAY)', () => {
  it('fully restores HP and Chakra', () => {
    const player = makePlayer({ ryo: 200, stats: { ...makePlayer().stats, hp: 20, md: 5 } });
    const { player: result, success } = performRest(player, 'PAY');
    expect(success).toBe(true);
    expect(result.stats.hp).toBe(100); // full maxHp
    expect(result.stats.md).toBe(50);  // full maxMd
  });

  it('deducts the correct Ryo cost for LV1-10', () => {
    const cost = CLINIC_COSTS.find(b => 1 <= b.maxLevel)!.cost;
    const player = makePlayer({ ryo: cost, stats: { ...makePlayer().stats, level: 1 } });
    const { player: result } = performRest(player, 'PAY');
    expect(result.ryo).toBe(0);
  });

  it('fails when player has insufficient Ryo', () => {
    const player = makePlayer({ ryo: 0 });
    const { success, player: unchanged } = performRest(player, 'PAY');
    expect(success).toBe(false);
    expect(unchanged).toBe(player);
  });
});

// ── New quests ────────────────────────────────────────────────────────────────

describe('New quests (phase 1.3)', () => {
  it('CHUNIN_QUEST exists with correct properties', () => {
    const quest = QUESTS.find(q => q.id === 'CHUNIN_QUEST');
    expect(quest).toBeDefined();
    expect(quest!.requiredLevel).toBe(15);
    expect(quest!.targetCount).toBe(2);
    expect(quest!.targetEnemyId).toBe('ELITE_NINJA');
    expect(quest!.reward.exp).toBe(420);
    expect(quest!.reward.ryo).toBe(290);
  });

  it('BOSS_QUEST (四尾覺醒之戰) exists with correct properties', () => {
    const quest = QUESTS.find(q => q.id === 'BOSS_QUEST');
    expect(quest).toBeDefined();
    expect(quest!.type).toBe('BOSS');
    expect(quest!.requiredLevel).toBe(25);
    expect(quest!.targetEnemyId).toBe('GUARDIAN');
    expect(quest!.reward.exp).toBe(700);
    expect(quest!.reward.ryo).toBe(500);
  });
});

// ── isQuestAvailableForPlayer ─────────────────────────────────────────────────

describe('isQuestAvailableForPlayer', () => {
  const onceQuest = QUESTS.find(q => q.repeatType === 'ONCE')!;
  const dailyQuest = QUESTS.find(q => q.repeatType === 'DAILY')!;

  it('ONCE quest is available when not completed', () => {
    const player = makePlayer();
    expect(isQuestAvailableForPlayer(onceQuest, player)).toBe(true);
  });

  it('ONCE quest is unavailable when completed', () => {
    const player = makePlayer({ completedQuestIds: [onceQuest.id] });
    expect(isQuestAvailableForPlayer(onceQuest, player)).toBe(false);
  });

  it('DAILY quest is available when never done', () => {
    const player = makePlayer();
    expect(isQuestAvailableForPlayer(dailyQuest, player)).toBe(true);
  });

  it('DAILY quest is unavailable when done today', () => {
    const player = makePlayer({ questResetTimestamps: { [dailyQuest.id]: Date.now() } });
    expect(isQuestAvailableForPlayer(dailyQuest, player)).toBe(false);
  });

  it('DAILY quest is available when done on a different date', () => {
    // yesterday = 24h ago
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    const player = makePlayer({ questResetTimestamps: { [dailyQuest.id]: yesterday } });
    expect(isQuestAvailableForPlayer(dailyQuest, player)).toBe(true);
  });
});

// ── applyItemEffect ───────────────────────────────────────────────────────────

describe('applyItemEffect', () => {
  it('restores HP with SMALL_POTION', () => {
    const player = makePlayer({
      stats: { ...makePlayer().stats, hp: 30 },
      inventory: [{ itemId: 'SMALL_POTION', quantity: 1 }],
    });
    const { player: result, success } = applyItemEffect(player, 'SMALL_POTION');
    expect(success).toBe(true);
    expect(result.stats.hp).toBe(60); // 30 + 30
  });

  it('removes item from inventory after use', () => {
    const player = makePlayer({
      inventory: [{ itemId: 'SMALL_POTION', quantity: 1 }],
    });
    const { player: result } = applyItemEffect(player, 'SMALL_POTION');
    expect(result.inventory.find(i => i.itemId === 'SMALL_POTION')).toBeUndefined();
  });

  it('decrements quantity when multiple in inventory', () => {
    const player = makePlayer({
      inventory: [{ itemId: 'SMALL_POTION', quantity: 3 }],
    });
    const { player: result } = applyItemEffect(player, 'SMALL_POTION');
    expect(result.inventory.find(i => i.itemId === 'SMALL_POTION')?.quantity).toBe(2);
  });

  it('restores Chakra with CHAKRA_PILL', () => {
    const player = makePlayer({
      stats: { ...makePlayer().stats, md: 0 },
      inventory: [{ itemId: 'CHAKRA_PILL', quantity: 1 }],
    });
    const { player: result, success } = applyItemEffect(player, 'CHAKRA_PILL');
    expect(success).toBe(true);
    expect(result.stats.md).toBe(25);
  });

  it('fails when item not in inventory', () => {
    const player = makePlayer();
    const { success } = applyItemEffect(player, 'SMALL_POTION');
    expect(success).toBe(false);
  });

  it('fails for combat-only items (ATK_SCROLL)', () => {
    const player = makePlayer({
      inventory: [{ itemId: 'ATK_SCROLL', quantity: 1 }],
    });
    const { success } = applyItemEffect(player, 'ATK_SCROLL');
    expect(success).toBe(false);
  });
});

// ── calcPlayerAtk with activeBuffs ────────────────────────────────────────────

describe('calcPlayerAtk with activeBuffs', () => {
  it('applies atkMultiplier from active buff', () => {
    const player = makePlayer({
      activeBuffs: [{ itemId: 'ATK_SCROLL', remainingTurns: 5, atkMultiplier: 1.2 }],
    });
    // base 10 * 1.0 (rank) * 1.2 (buff) = 12
    expect(calcPlayerAtk(player)).toBeCloseTo(12, 5);
  });

  it('stacks multiple buffs', () => {
    const player = makePlayer({
      activeBuffs: [
        { itemId: 'ATK_SCROLL', remainingTurns: 5, atkMultiplier: 1.2 },
        { itemId: 'ATK_SCROLL', remainingTurns: 3, atkMultiplier: 1.1 },
      ],
    });
    // 10 * 1.2 * 1.1 = 13.2
    expect(calcPlayerAtk(player)).toBeCloseTo(13.2, 5);
  });
});

// ── getTodayString ────────────────────────────────────────────────────────────

describe('getTodayString', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    expect(getTodayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
