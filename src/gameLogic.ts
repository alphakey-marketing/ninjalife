import { BLOODLINES, EXP_PER_LEVEL, LEVEL_CAP, MODE_CONFIG, SKILLS, SPIN_CONFIG, STAT_POINTS_PER_LEVEL } from './constants';
import type { BattleState, PlayerState, SkillDefinition } from './types';

export function calcPlayerAtk(player: PlayerState): number {
  let atk = player.stats.atk;
  const bloodline = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  if (bloodline?.passive.atkMultiplier) {
    atk *= bloodline.passive.atkMultiplier;
  }
  atk *= player.rankBonus.baseAtkMultiplier;
  if (player.isInMode) {
    atk *= MODE_CONFIG.atkMultiplier;
  }
  return atk;
}

export function calcPlayerDef(player: PlayerState): number {
  let def = player.stats.def;
  if (player.isInMode) {
    def *= MODE_CONFIG.defMultiplier;
  }
  return def;
}

export function calcPlayerMaxHp(player: PlayerState): number {
  let maxHp = player.stats.maxHp;
  const bloodline = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  if (bloodline?.passive.hpMultiplier) {
    maxHp *= bloodline.passive.hpMultiplier;
  }
  return Math.floor(maxHp);
}

export function calcDamage(atk: number, enemyDef: number): number {
  return Math.max(1, Math.floor(atk * 1.0 - enemyDef * 0.5));
}

export function calcEnemyDamage(enemyAtk: number, def: number): number {
  return Math.max(1, Math.floor(enemyAtk * 1.0 - def * 0.5));
}

export function hasCritBonus(player: PlayerState): number {
  const bloodline = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  return bloodline?.passive.critChanceBonus ?? 0;
}

export function performAttack(state: BattleState): BattleState {
  if (state.phase !== 'PLAYER_TURN') return state;

  const atk = calcPlayerAtk(state.player);
  const critChance = hasCritBonus(state.player);
  const isCrit = Math.random() < critChance;
  let damage = calcDamage(atk, state.enemy.definition.stats.def);
  if (isCrit) damage = Math.floor(damage * 1.5);

  const newEnemyHp = Math.max(0, state.enemy.currentHp - damage);
  const log = isCrit
    ? `You land a CRITICAL HIT for ${damage} damage!`
    : `You attack for ${damage} damage.`;

  const newState: BattleState = {
    ...state,
    enemy: { ...state.enemy, currentHp: newEnemyHp },
    battleLog: [...state.battleLog, log],
    phase: newEnemyHp <= 0 ? 'VICTORY' : 'ENEMY_TURN',
  };

  if (newEnemyHp <= 0) {
    return { ...newState, phase: 'VICTORY' };
  }
  return advanceToEnemyTurn(newState);
}

export function performSkill(state: BattleState, skillId: string): BattleState {
  if (state.phase !== 'PLAYER_TURN') return state;

  const skill: SkillDefinition = SKILLS[skillId];
  if (!skill) return state;

  // Check cooldown
  const cdEntry = state.skillCooldowns.find(c => c.skillId === skillId);
  if (cdEntry && cdEntry.remainingTurns > 0) {
    return {
      ...state,
      battleLog: [...state.battleLog, `${skill.name} is on cooldown for ${cdEntry.remainingTurns} more turn(s).`],
    };
  }

  // Check costs
  if (state.player.stats.hp <= skill.hpCost) {
    return { ...state, battleLog: [...state.battleLog, `Not enough HP to use ${skill.name}!`] };
  }
  if (state.player.stats.md < skill.mdCost) {
    return { ...state, battleLog: [...state.battleLog, `Not enough MD to use ${skill.name}!`] };
  }

  const atk = calcPlayerAtk(state.player);
  const damageMultiplier = skill.effects.damageMultiplier ?? 1.0;
  const damage = Math.max(1, Math.floor(calcDamage(atk, state.enemy.definition.stats.def) * damageMultiplier));

  let newEnemyStatusEffects = [...state.enemy.statusEffects];
  let skillLog = `You use ${skill.name} for ${damage} damage!`;

  // Apply burn
  if (skill.effects.burnChance && Math.random() < skill.effects.burnChance) {
    newEnemyStatusEffects.push({
      type: 'BURN',
      damagePerTurn: skill.effects.burnDamagePerTurn ?? 5,
      remainingTurns: skill.effects.burnDuration ?? 3,
    });
    skillLog += ' Enemy is BURNING!';
  }

  const newEnemyHp = Math.max(0, state.enemy.currentHp - damage);

  // Deduct costs
  const newPlayerStats = {
    ...state.player.stats,
    hp: state.player.stats.hp - skill.hpCost,
    md: state.player.stats.md - skill.mdCost,
  };

  // Set cooldown
  const newCooldowns = state.skillCooldowns.filter(c => c.skillId !== skillId);
  newCooldowns.push({ skillId, remainingTurns: skill.cooldownTurn });

  const newState: BattleState = {
    ...state,
    player: { ...state.player, stats: newPlayerStats },
    enemy: { ...state.enemy, currentHp: newEnemyHp, statusEffects: newEnemyStatusEffects },
    skillCooldowns: newCooldowns,
    battleLog: [...state.battleLog, skillLog],
  };

  if (newEnemyHp <= 0) {
    return { ...newState, phase: 'VICTORY' };
  }
  return advanceToEnemyTurn(newState);
}

export function toggleMode(state: BattleState): BattleState {
  if (state.phase !== 'PLAYER_TURN') return state;

  const player = state.player;
  if (!player.unlockedMode) {
    return { ...state, battleLog: [...state.battleLog, 'You have not unlocked Mode yet!'] };
  }

  if (player.isInMode) {
    // Deactivate
    const newState = {
      ...state,
      player: { ...player, isInMode: false },
      battleLog: [...state.battleLog, 'You deactivate Mode.'],
    };
    return advanceToEnemyTurn(newState);
  } else {
    // Activate - heal 20% HP
    const healAmount = Math.floor(calcPlayerMaxHp(player) * MODE_CONFIG.instantHealPercent);
    const newHp = Math.min(calcPlayerMaxHp({ ...player, isInMode: true }), player.stats.hp + healAmount);
    const newState = {
      ...state,
      player: {
        ...player,
        isInMode: true,
        stats: { ...player.stats, hp: newHp },
      },
      battleLog: [...state.battleLog, `You activate Mode! ATK↑ DEF↑ Healed ${healAmount} HP. MD drains each turn.`],
    };
    return advanceToEnemyTurn(newState);
  }
}

function advanceToEnemyTurn(state: BattleState): BattleState {
  // Process mode MD drain
  let newPlayer = { ...state.player };
  if (newPlayer.isInMode) {
    const newMd = newPlayer.stats.md - MODE_CONFIG.mdCostPerTurn;
    if (newMd <= 0) {
      newPlayer = { ...newPlayer, isInMode: false, stats: { ...newPlayer.stats, md: 0 } };
      state = { ...state, battleLog: [...state.battleLog, 'Mode deactivated! Out of MD.'] };
    } else {
      newPlayer = { ...newPlayer, stats: { ...newPlayer.stats, md: newMd } };
    }
  }

  return performEnemyTurn({ ...state, player: newPlayer, phase: 'ENEMY_TURN' });
}

export function performEnemyTurn(state: BattleState): BattleState {
  if (state.phase !== 'ENEMY_TURN') return state;

  let newLog = [...state.battleLog];
  let newPlayer = { ...state.player };
  let newEnemy = { ...state.enemy };

  // Process burn on enemy
  const burnEffect = newEnemy.statusEffects.find(e => e.type === 'BURN');
  if (burnEffect) {
    newEnemy = {
      ...newEnemy,
      currentHp: Math.max(0, newEnemy.currentHp - burnEffect.damagePerTurn),
      statusEffects: newEnemy.statusEffects
        .map(e => e.type === 'BURN' ? { ...e, remainingTurns: e.remainingTurns - 1 } : e)
        .filter(e => e.remainingTurns > 0),
    };
    newLog.push(`Enemy burns for ${burnEffect.damagePerTurn} damage!`);
    if (newEnemy.currentHp <= 0) {
      return { ...state, enemy: newEnemy, battleLog: newLog, phase: 'VICTORY' };
    }
  }

  // Enemy attacks player
  const def = calcPlayerDef(newPlayer);
  const damage = calcEnemyDamage(newEnemy.definition.stats.atk, def);
  const newHp = Math.max(0, newPlayer.stats.hp - damage);
  newLog.push(`${newEnemy.definition.name} attacks you for ${damage} damage.`);
  newPlayer = { ...newPlayer, stats: { ...newPlayer.stats, hp: newHp } };

  // Reduce cooldowns
  const newCooldowns = state.skillCooldowns.map(c => ({
    ...c,
    remainingTurns: Math.max(0, c.remainingTurns - 1),
  }));

  if (newHp <= 0) {
    return {
      ...state,
      player: newPlayer,
      enemy: newEnemy,
      battleLog: newLog,
      skillCooldowns: newCooldowns,
      phase: 'DEFEAT',
      turnNumber: state.turnNumber + 1,
    };
  }

  return {
    ...state,
    player: newPlayer,
    enemy: newEnemy,
    battleLog: newLog,
    skillCooldowns: newCooldowns,
    phase: 'PLAYER_TURN',
    turnNumber: state.turnNumber + 1,
  };
}

export function checkLevelUp(player: PlayerState): PlayerState {
  let p = { ...player };
  while (p.stats.level < LEVEL_CAP) {
    const needed = EXP_PER_LEVEL(p.stats.level);
    if (p.stats.exp >= needed) {
      p = {
        ...p,
        stats: { ...p.stats, level: p.stats.level + 1, exp: p.stats.exp - needed },
        statPoints: { ...p.statPoints, unspent: p.statPoints.unspent + STAT_POINTS_PER_LEVEL },
      };
      // Check mode unlock
      if (p.stats.level >= MODE_CONFIG.requiredLevel && p.equippedBloodlineId) {
        p = { ...p, unlockedMode: true };
      }
    } else {
      break;
    }
  }
  return p;
}

export function applyStatPoint(player: PlayerState, stat: 'str' | 'vit' | 'foc'): PlayerState {
  if (player.statPoints.unspent <= 0) return player;

  let newStats = { ...player.stats };
  const newStatPoints = {
    ...player.statPoints,
    unspent: player.statPoints.unspent - 1,
    [stat]: player.statPoints[stat] + 1,
  };

  if (stat === 'str') {
    newStats = { ...newStats, atk: newStats.atk + 2 };
  } else if (stat === 'vit') {
    newStats = { ...newStats, maxHp: newStats.maxHp + 20, hp: newStats.hp + 20 };
  } else if (stat === 'foc') {
    newStats = { ...newStats, maxMd: newStats.maxMd + 10, md: Math.min(newStats.md + 10, newStats.maxMd + 10) };
  }

  return { ...player, stats: newStats, statPoints: newStatPoints };
}

export function performSpin(player: PlayerState): { player: PlayerState; result: string; bloodlineId: string } {
  if (player.ryo < SPIN_CONFIG.priceRyo) {
    return { player, result: 'Not enough Ryo!', bloodlineId: '' };
  }

  const rarityBonus = player.rankBonus.spinRarityBonus;
  const entries = SPIN_CONFIG.entries.map(e => {
    let weight = e.baseWeight;
    // Add rank bonus to STORM and VOID
    if (e.bloodlineId === 'STORM' || e.bloodlineId === 'VOID') {
      weight += rarityBonus * 100;
    }
    return { ...e, weight };
  });

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let rand = Math.random() * totalWeight;
  let chosenId = entries[entries.length - 1].bloodlineId;
  for (const entry of entries) {
    rand -= entry.weight;
    if (rand <= 0) {
      chosenId = entry.bloodlineId;
      break;
    }
  }

  const existing = player.ownedBloodlines.find(b => b.id === chosenId);
  let newOwnedBloodlines = [...player.ownedBloodlines];
  let resultMsg = '';

  if (existing) {
    newOwnedBloodlines = newOwnedBloodlines.map(b =>
      b.id === chosenId ? { ...b, mastery: b.mastery + 1 } : b
    );
    resultMsg = `Duplicate! ${BLOODLINES[chosenId].name} mastery +1`;
  } else {
    newOwnedBloodlines.push({ id: chosenId, mastery: 1 });
    resultMsg = `NEW BLOODLINE: ${BLOODLINES[chosenId].name}!`;
  }

  return {
    player: {
      ...player,
      ryo: player.ryo - SPIN_CONFIG.priceRyo,
      ownedBloodlines: newOwnedBloodlines,
    },
    result: resultMsg,
    bloodlineId: chosenId,
  };
}

export function canRankUp(player: PlayerState): boolean {
  return player.stats.level >= LEVEL_CAP && player.bossDefeatedThisRank && player.rank !== 'C';
}

export function performRankUp(player: PlayerState): PlayerState {
  const nextRankMap: Record<string, 'D' | 'C'> = { E: 'D', D: 'C' };
  const nextRank = nextRankMap[player.rank];
  if (!nextRank) return player;

  const rankBonusMap = {
    D: { baseAtkMultiplier: 1.1, spinRarityBonus: 0.05 },
    C: { baseAtkMultiplier: 1.2, spinRarityBonus: 0.1 },
  };

  const newRankBonus = rankBonusMap[nextRank];

  // Reset level and stats, keep bloodlines and rank bonuses
  return {
    ...player,
    rank: nextRank,
    rankBonus: newRankBonus,
    stats: {
      level: 1,
      exp: 0,
      hp: 100,
      maxHp: 100,
      atk: 10,
      def: 5,
      spd: 5,
      md: 50,
      maxMd: 50,
    },
    statPoints: { unspent: 0, str: 0, vit: 0, foc: 0 },
    isInMode: false,
    unlockedMode: false,
    bossDefeatedThisRank: false,
    currentQuestId: null,
  };
}

export function equipBloodline(player: PlayerState, bloodlineId: string): PlayerState {
  const owned = player.ownedBloodlines.find(b => b.id === bloodlineId);
  if (!owned) return player;
  
  // Recalculate HP with new bloodline
  const newPlayer = { ...player, equippedBloodlineId: bloodlineId };
  const newMaxHp = calcPlayerMaxHp(newPlayer);
  const oldMaxHp = calcPlayerMaxHp(player);
  const hpDiff = newMaxHp - oldMaxHp;
  
  return {
    ...newPlayer,
    stats: {
      ...newPlayer.stats,
      maxHp: newMaxHp,
      hp: Math.min(newPlayer.stats.hp + hpDiff, newMaxHp),
    },
  };
}
