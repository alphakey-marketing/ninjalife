import { BLOODLINES, CLINIC_COSTS, EXP_PER_LEVEL, getLevelCapForRank, ITEMS, MD_REGEN_BASE, MODE_CONFIG, SKILLS, SPIN_CONFIG, STAT_POINTS_PER_LEVEL } from './constants';
import type { ActiveBuff, BattleState, InventoryItem, PlayerState, QuestDefinition, SkillDefinition } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isQuestAvailableForPlayer(quest: QuestDefinition, player: PlayerState): boolean {
  if (quest.repeatType === 'ONCE') {
    return !player.completedQuestIds.includes(quest.id);
  }
  // DAILY
  const ts = player.questResetTimestamps?.[quest.id];
  if (!ts) return true;
  const questDate = new Date(ts).toISOString().slice(0, 10);
  return questDate !== getTodayString();
}

function getEquippedMastery(player: PlayerState): number {
  if (!player.equippedBloodlineId) return 0;
  return player.ownedBloodlines.find(b => b.id === player.equippedBloodlineId)?.mastery ?? 0;
}

/** Each mastery level above 1 grants +2% to the base passive multiplier / bonus. */
function masteryOffset(mastery: number): number {
  return Math.max(0, mastery - 1) * 0.02;
}

// ── Player stat calculators ───────────────────────────────────────────────────

export function calcPlayerAtk(player: PlayerState): number {
  let atk = player.stats.atk;
  const bloodline = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  if (bloodline?.passive.atkMultiplier) {
    const mastery = getEquippedMastery(player);
    atk *= bloodline.passive.atkMultiplier + masteryOffset(mastery);
  }
  atk *= player.rankBonus.baseAtkMultiplier;
  if (player.isInMode) {
    atk *= MODE_CONFIG.atkMultiplier;
  }
  for (const buff of (player.activeBuffs ?? [])) {
    if (buff.atkMultiplier) atk *= buff.atkMultiplier;
  }
  return atk;
}

export function calcPlayerDef(player: PlayerState): number {
  let def = player.stats.def;
  const bloodline = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  if (bloodline?.passive.defMultiplier) {
    const mastery = getEquippedMastery(player);
    def *= bloodline.passive.defMultiplier + masteryOffset(mastery);
  }
  if (player.isInMode) {
    def *= MODE_CONFIG.defMultiplier;
  }
  for (const buff of (player.activeBuffs ?? [])) {
    if (buff.defMultiplier) def *= buff.defMultiplier;
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

export function calcPlayerSpd(player: PlayerState): number {
  let spd = player.stats.spd;
  const bloodline = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  if (bloodline?.passive.spdBonus) {
    const mastery = getEquippedMastery(player);
    // +1 bonus SPD per mastery level for SPD bloodlines
    spd += bloodline.passive.spdBonus + Math.max(0, mastery - 1);
  }
  for (const buff of (player.activeBuffs ?? [])) {
    if (buff.spdBonus) spd += buff.spdBonus;
  }
  return spd;
}

export function calcMdRegen(player: PlayerState): number {
  const mastery = getEquippedMastery(player);
  const bloodline = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  const bloodlineBonus = bloodline?.passive.mdRegenBonus ?? 0;
  // Mastery scales regen for bloodlines that have mdRegenBonus
  const masteryScaling = bloodlineBonus > 0 ? Math.max(0, mastery - 1) : 0;
  return MD_REGEN_BASE + Math.floor(player.statPoints.foc / 2) + bloodlineBonus + masteryScaling;
}

export function calcDamage(atk: number, enemyDef: number): number {
  return Math.max(1, Math.floor(atk * 1.0 - enemyDef * 0.5));
}

export function calcEnemyDamage(enemyAtk: number, def: number): number {
  return Math.max(1, Math.floor(enemyAtk * 1.0 - def * 0.5));
}

export function hasCritBonus(player: PlayerState): number {
  const bloodline = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  if (!bloodline?.passive.critChanceBonus) return 0;
  const mastery = getEquippedMastery(player);
  return bloodline.passive.critChanceBonus + masteryOffset(mastery);
}

/**
 * Returns true when the enemy should get a free pre-emptive attack at battle
 * start (enemy SPD exceeds player effective SPD by 3 or more).
 */
export function enemyHasFirstStrike(player: PlayerState, enemySpd: number): boolean {
  return enemySpd >= calcPlayerSpd(player) + 3;
}

// ── Battle actions ────────────────────────────────────────────────────────────

export function performAttack(state: BattleState): BattleState {
  if (state.phase !== 'PLAYER_TURN') return state;

  const atk = calcPlayerAtk(state.player);
  const critChance = hasCritBonus(state.player);
  const isCrit = Math.random() < critChance;
  let damage = calcDamage(atk, state.enemy.definition.stats.def);
  if (isCrit) damage = Math.floor(damage * 1.5);

  // Enemy guard halves incoming damage
  if (state.enemy.isGuarding) {
    damage = Math.floor(damage * 0.5);
  }

  const newEnemyHp = Math.max(0, state.enemy.currentHp - damage);
  const guardNote = state.enemy.isGuarding ? ' (Guarded!)' : '';
  const log = isCrit
    ? `You land a CRITICAL HIT for ${damage} damage!${guardNote}`
    : `You attack for ${damage} damage.${guardNote}`;

  const newState: BattleState = {
    ...state,
    enemy: { ...state.enemy, currentHp: newEnemyHp, isGuarding: false },
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

  // Check level requirement
  if (state.player.stats.level < skill.requiredLevel) {
    return {
      ...state,
      battleLog: [...state.battleLog, `Requires Level ${skill.requiredLevel} to use ${skill.name}!`],
    };
  }

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

  // Deduct costs first
  let newPlayerStats = {
    ...state.player.stats,
    hp: state.player.stats.hp - skill.hpCost,
    md: state.player.stats.md - skill.mdCost,
  };

  let skillLog = `You use ${skill.name}!`;
  let newEnemyHp = state.enemy.currentHp;
  const newEnemyStatusEffects = [...state.enemy.statusEffects];
  let newIsGuarding = state.enemy.isGuarding;

  // Deal damage (damageMultiplier > 0 means an offensive skill)
  if (damageMultiplier > 0) {
    let damage = Math.max(1, Math.floor(calcDamage(atk, state.enemy.definition.stats.def) * damageMultiplier));
    // Enemy guard halves incoming damage
    if (state.enemy.isGuarding) {
      damage = Math.floor(damage * 0.5);
      newIsGuarding = false;
    }
    skillLog = `You use ${skill.name} for ${damage} damage!`;
    if (state.enemy.isGuarding) skillLog += ' (Guarded!)';
    newEnemyHp = Math.max(0, state.enemy.currentHp - damage);

    // Apply burn
    if (skill.effects.burnChance && Math.random() < skill.effects.burnChance) {
      newEnemyStatusEffects.push({
        type: 'BURN',
        damagePerTurn: skill.effects.burnDamagePerTurn ?? 5,
        remainingTurns: skill.effects.burnDuration ?? 3,
      });
      skillLog += ' Enemy is BURNING!';
    }
  }

  // Self-heal
  if (skill.effects.healSelfPercent) {
    const healAmount = Math.floor(calcPlayerMaxHp(state.player) * skill.effects.healSelfPercent);
    newPlayerStats = { ...newPlayerStats, hp: Math.min(calcPlayerMaxHp(state.player), newPlayerStats.hp + healAmount) };
    skillLog += ` Healed ${healAmount} HP.`;
  }

  // MD restore
  if (skill.effects.mdRestore) {
    newPlayerStats = { ...newPlayerStats, md: Math.min(newPlayerStats.maxMd, newPlayerStats.md + skill.effects.mdRestore) };
    skillLog += ` Restored ${skill.effects.mdRestore} MD.`;
  }

  // Set cooldown
  const newCooldowns = state.skillCooldowns.filter(c => c.skillId !== skillId);
  newCooldowns.push({ skillId, remainingTurns: skill.cooldownTurn });

  const newState: BattleState = {
    ...state,
    player: { ...state.player, stats: newPlayerStats },
    enemy: { ...state.enemy, currentHp: newEnemyHp, statusEffects: newEnemyStatusEffects, isGuarding: newIsGuarding },
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
    // Deactivate – impose 5-turn re-activation cooldown to prevent heal spam
    const newState = {
      ...state,
      player: { ...player, isInMode: false },
      modeCooldown: 5,
      battleLog: [...state.battleLog, 'You deactivate Mode. (Cooldown: 5 turns)'],
    };
    return advanceToEnemyTurn(newState);
  } else {
    // Block re-activation if cooldown is still running
    if (state.modeCooldown > 0) {
      return {
        ...state,
        battleLog: [...state.battleLog, `Mode is on cooldown for ${state.modeCooldown} more turn(s)!`],
      };
    }
    // Activate - heal 20% HP once
    const effectiveMaxHp = calcPlayerMaxHp(player);
    const healAmount = Math.floor(effectiveMaxHp * MODE_CONFIG.instantHealPercent);
    const newHp = Math.min(effectiveMaxHp, player.stats.hp + healAmount);
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
  // Reduce Mode re-activation cooldown
  let s = state.modeCooldown > 0 ? { ...state, modeCooldown: state.modeCooldown - 1 } : state;

  // Decrement active buffs and remove expired ones
  const updatedBuffs = (s.player.activeBuffs ?? [])
    .map((b: ActiveBuff) => ({ ...b, remainingTurns: b.remainingTurns - 1 }))
    .filter((b: ActiveBuff) => b.remainingTurns > 0);
  s = { ...s, player: { ...s.player, activeBuffs: updatedBuffs } };

  // Process mode MD drain
  let newPlayer = { ...s.player };
  if (newPlayer.isInMode) {
    const newMd = newPlayer.stats.md - MODE_CONFIG.mdCostPerTurn;
    if (newMd <= 0) {
      newPlayer = { ...newPlayer, isInMode: false, stats: { ...newPlayer.stats, md: 0 } };
      s = { ...s, battleLog: [...s.battleLog, 'Mode deactivated! Out of MD.'], modeCooldown: 5 };
    } else {
      newPlayer = { ...newPlayer, stats: { ...newPlayer.stats, md: newMd } };
    }
  }

  return performEnemyTurn({ ...s, player: newPlayer, phase: 'ENEMY_TURN' });
}

export function performEnemyTurn(state: BattleState): BattleState {
  if (state.phase !== 'ENEMY_TURN') return state;

  const newLog = [...state.battleLog];
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

  // Enemy special ability check
  const enemyDef = newEnemy.definition;
  let nextIsGuarding = false;
  let nextChargeReady = false;

  if (newEnemy.chargeReady) {
    // Stored charge – deal 2× damage
    const def = calcPlayerDef(newPlayer);
    const damage = calcEnemyDamage(enemyDef.stats.atk * 2, def);
    const newHp = Math.max(0, newPlayer.stats.hp - damage);
    newLog.push(`⚡ ${enemyDef.name} unleashes a CHARGED attack for ${damage} damage!`);
    newPlayer = { ...newPlayer, stats: { ...newPlayer.stats, hp: newHp } };
  } else if (enemyDef.specialAbility && Math.random() < (enemyDef.specialAbilityChance ?? 0)) {
    if (enemyDef.specialAbility === 'GUARD') {
      // Guard this turn – also reduces incoming damage (handled in performAttack/performSkill)
      nextIsGuarding = true;
      newLog.push(`🛡 ${enemyDef.name} braces for impact! (Guard active)`);
      // Guard skips the normal attack
    } else if (enemyDef.specialAbility === 'CHARGE') {
      // Charge up – skip normal attack this turn, deal 2× next turn
      nextChargeReady = true;
      newLog.push(`⚡ ${enemyDef.name} is charging up a powerful attack!`);
    }
  } else {
    // Normal attack
    const def = calcPlayerDef(newPlayer);
    const damage = calcEnemyDamage(enemyDef.stats.atk, def);
    const newHp = Math.max(0, newPlayer.stats.hp - damage);
    newLog.push(`${enemyDef.name} attacks you for ${damage} damage.`);
    newPlayer = { ...newPlayer, stats: { ...newPlayer.stats, hp: newHp } };
  }

  // Reduce skill cooldowns
  const newCooldowns = state.skillCooldowns.map(c => ({
    ...c,
    remainingTurns: Math.max(0, c.remainingTurns - 1),
  }));

  // MD regen for player (only when not draining via Mode)
  if (!newPlayer.isInMode) {
    const mdRegen = calcMdRegen(newPlayer);
    newPlayer = {
      ...newPlayer,
      stats: { ...newPlayer.stats, md: Math.min(newPlayer.stats.maxMd, newPlayer.stats.md + mdRegen) },
    };
  }

  if (newPlayer.stats.hp <= 0) {
    return {
      ...state,
      player: newPlayer,
      enemy: { ...newEnemy, isGuarding: nextIsGuarding, chargeReady: nextChargeReady },
      battleLog: newLog,
      skillCooldowns: newCooldowns,
      phase: 'DEFEAT',
      turnNumber: state.turnNumber + 1,
    };
  }

  return {
    ...state,
    player: newPlayer,
    enemy: { ...newEnemy, isGuarding: nextIsGuarding, chargeReady: nextChargeReady },
    battleLog: newLog,
    skillCooldowns: newCooldowns,
    phase: 'PLAYER_TURN',
    turnNumber: state.turnNumber + 1,
  };
}

// ── Progression ───────────────────────────────────────────────────────────────

export function checkLevelUp(player: PlayerState): PlayerState {
  let p = { ...player };
  while (p.stats.level < getLevelCapForRank(p.rank)) {
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
  const rareIds = ['STORM', 'MIST', 'VOID', 'SAND', 'LIGHTNING_BL', 'SHADOW', 'KAGUYA'];
  const entries = SPIN_CONFIG.entries.map(e => {
    let weight = e.baseWeight;
    if (rareIds.includes(e.bloodlineId)) {
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
    resultMsg = `重複！${BLOODLINES[chosenId].name} 熟練度 +1`;
  } else {
    newOwnedBloodlines.push({ id: chosenId, mastery: 1 });
    resultMsg = `新血繼限界：${BLOODLINES[chosenId].name}！`;
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
  return player.stats.level >= getLevelCapForRank(player.rank) && player.bossDefeatedThisRank && player.rank !== 'C';
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

  // Reset level and base stats; retain bloodlines and rank bonuses.
  const resetPlayer: PlayerState = {
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
    activeBuffs: [],
  };

  // Clamp starting HP to the effective max (e.g. Void reduces max HP).
  const effectiveMaxHp = calcPlayerMaxHp(resetPlayer);
  return {
    ...resetPlayer,
    stats: { ...resetPlayer.stats, hp: effectiveMaxHp },
  };
}

export function equipBloodline(player: PlayerState, bloodlineId: string): PlayerState {
  const owned = player.ownedBloodlines.find(b => b.id === bloodlineId);
  if (!owned) return player;

  // Keep stats.maxHp as the BASE value – calcPlayerMaxHp() applies the bloodline
  // multiplier on top, so we must NOT bake the multiplier into stats.maxHp.
  const newPlayer = { ...player, equippedBloodlineId: bloodlineId };
  const newEffectiveMaxHp = calcPlayerMaxHp(newPlayer);

  return {
    ...newPlayer,
    stats: {
      ...newPlayer.stats,
      hp: Math.min(newPlayer.stats.hp, newEffectiveMaxHp),
    },
  };
}

// ── Clinic rest ───────────────────────────────────────────────────────────────

export function performRest(
  player: PlayerState,
  type: 'FREE' | 'PAY',
): { player: PlayerState; success: boolean; message: string } {
  const maxHp = calcPlayerMaxHp(player);

  if (type === 'FREE') {
    if (player.lastFreeRestDate === getTodayString()) {
      return { player, success: false, message: '今日已使用免費休息！明日再來。' };
    }
    const newHp = Math.min(maxHp, player.stats.hp + Math.floor(maxHp * 0.5));
    const newMd = Math.min(player.stats.maxMd, player.stats.md + Math.floor(player.stats.maxMd * 0.5));
    return {
      player: {
        ...player,
        stats: { ...player.stats, hp: newHp, md: newMd },
        lastFreeRestDate: getTodayString(),
      },
      success: true,
      message: '休息完成！HP 和 Chakra 各回復 50%。',
    };
  }

  // PAY: full restore
  const bracket = CLINIC_COSTS.find(b => player.stats.level <= b.maxLevel) ?? CLINIC_COSTS[CLINIC_COSTS.length - 1];
  const cost = bracket.cost;
  if (player.ryo < cost) {
    return { player, success: false, message: `Ryo 不足！需要 ${cost} Ryo。` };
  }
  return {
    player: {
      ...player,
      stats: { ...player.stats, hp: maxHp, md: player.stats.maxMd },
      ryo: player.ryo - cost,
    },
    success: true,
    message: `治療完成！HP 和 Chakra 全回復！（消耗 ${cost} Ryo）`,
  };
}

// ── Item helpers ──────────────────────────────────────────────────────────────

function deductInventoryItem(inventory: InventoryItem[], itemId: string): InventoryItem[] {
  return inventory
    .map(i => i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i)
    .filter(i => i.quantity > 0);
}

export function performUseItemInBattle(state: BattleState, itemId: string): BattleState {
  const invItem = state.player.inventory?.find(i => i.itemId === itemId);
  if (!invItem || invItem.quantity <= 0) {
    return { ...state, battleLog: [...state.battleLog, '沒有該道具！'] };
  }

  const item = ITEMS[itemId];
  if (!item) {
    return { ...state, battleLog: [...state.battleLog, '未知道具！'] };
  }

  let newStats = { ...state.player.stats };
  let log = `你使用了 ${item.name}！`;
  const newActiveBuffs = [...(state.player.activeBuffs ?? [])];

  const maxHp = calcPlayerMaxHp(state.player);

  if (item.effect.hpRestore) {
    const heal = item.effect.hpRestore;
    newStats = { ...newStats, hp: Math.min(maxHp, newStats.hp + heal) };
    log += ` 回復 ${heal} HP。`;
  }
  if (item.effect.hpRestorePercent) {
    const heal = Math.floor(maxHp * item.effect.hpRestorePercent);
    newStats = { ...newStats, hp: Math.min(maxHp, newStats.hp + heal) };
    log += ` 回復 ${heal} HP。`;
  }
  if (item.effect.mdRestore) {
    const restore = item.effect.mdRestore;
    newStats = { ...newStats, md: Math.min(newStats.maxMd, newStats.md + restore) };
    log += ` 回復 ${restore} Chakra。`;
  }
  if (item.effect.mdRestorePercent) {
    const restore = Math.floor(newStats.maxMd * item.effect.mdRestorePercent);
    newStats = { ...newStats, md: Math.min(newStats.maxMd, newStats.md + restore) };
    log += ` 回復 ${restore} Chakra。`;
  }
  if (item.effect.buffDuration) {
    const buff: ActiveBuff = {
      itemId,
      remainingTurns: item.effect.buffDuration,
      atkMultiplier: item.effect.atkMultiplier,
      defMultiplier: item.effect.defMultiplier,
      spdBonus: item.effect.spdBonus,
    };
    newActiveBuffs.push(buff);
    log += ` 獲得強化效果（${item.effect.buffDuration}回合）。`;
  }

  const newInventory = deductInventoryItem(state.player.inventory ?? [], itemId);
  const newPlayer: PlayerState = {
    ...state.player,
    stats: newStats,
    inventory: newInventory,
    activeBuffs: newActiveBuffs,
  };

  const newState: BattleState = {
    ...state,
    player: newPlayer,
    battleLog: [...state.battleLog, log],
  };

  return advanceToEnemyTurn(newState);
}

export function applyItemEffect(
  player: PlayerState,
  itemId: string,
): { player: PlayerState; message: string; success: boolean } {
  const invItem = player.inventory?.find(i => i.itemId === itemId);
  if (!invItem || invItem.quantity <= 0) {
    return { player, message: '沒有該道具！', success: false };
  }

  const item = ITEMS[itemId];
  if (!item || !item.usableOutOfCombat) {
    return { player, message: '此道具不能在戰鬥外使用！', success: false };
  }

  let newStats = { ...player.stats };
  let msg = `你使用了 ${item.name}！`;

  const maxHp = calcPlayerMaxHp(player);

  if (item.effect.hpRestore) {
    const heal = item.effect.hpRestore;
    newStats = { ...newStats, hp: Math.min(maxHp, newStats.hp + heal) };
    msg += ` 回復 ${heal} HP。`;
  }
  if (item.effect.hpRestorePercent) {
    const heal = Math.floor(maxHp * item.effect.hpRestorePercent);
    newStats = { ...newStats, hp: Math.min(maxHp, newStats.hp + heal) };
    msg += ` 回復 ${heal} HP。`;
  }
  if (item.effect.mdRestore) {
    const restore = item.effect.mdRestore;
    newStats = { ...newStats, md: Math.min(newStats.maxMd, newStats.md + restore) };
    msg += ` 回復 ${restore} Chakra。`;
  }
  if (item.effect.mdRestorePercent) {
    const restore = Math.floor(newStats.maxMd * item.effect.mdRestorePercent);
    newStats = { ...newStats, md: Math.min(newStats.maxMd, newStats.md + restore) };
    msg += ` 回復 ${restore} Chakra。`;
  }

  const newInventory = deductInventoryItem(player.inventory ?? [], itemId);

  return {
    player: { ...player, stats: newStats, inventory: newInventory },
    message: msg,
    success: true,
  };
}
