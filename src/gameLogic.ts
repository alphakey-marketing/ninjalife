import { BLOODLINES, CLINIC_COSTS, EXP_PER_LEVEL, FREE_REST_COOLDOWN_MS, GEAR, getLevelCapForRank, ITEMS, MAX_STAMINA, MD_REGEN_BASE, MODE_CONFIG, RARE_BLOODLINE_IDS, SKILL_TIERS, SKILLS, SPIN_CONFIG, STAT_POINTS_PER_LEVEL, ENEMY_DROP_TABLES } from './constants';
import type { ActiveBuff, BattleDrop, BattleState, InventoryItem, PlayerState, QuestDefinition, SkillDefinition, WorldBossDefinition } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isQuestAvailableForPlayer(quest: QuestDefinition, player: PlayerState): boolean {
  if (quest.repeatType === 'ONCE') {
    return !player.completedQuestIds.includes(quest.id);
  }
  if (quest.repeatType === 'UNLIMITED') {
    return true; // only stamina-limited
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

function getEquippedGearStats(player: PlayerState) {
  const eg = player.equippedGear;
  if (!eg) return { atkBonus: 0, defBonus: 0, hpBonus: 0, spdBonus: 0, mdRegenBonus: 0, hpRegenPerTurn: 0 };
  const slots: (string | null)[] = [eg.weapon, eg.armor, eg.accessory];
  let atkBonus = 0, defBonus = 0, hpBonus = 0, spdBonus = 0, mdRegenBonus = 0, hpRegenPerTurn = 0;
  for (const id of slots) {
    if (!id) continue;
    const g = GEAR[id];
    if (!g) continue;
    atkBonus += g.stats.atkBonus ?? 0;
    defBonus += g.stats.defBonus ?? 0;
    hpBonus += g.stats.hpBonus ?? 0;
    spdBonus += g.stats.spdBonus ?? 0;
    mdRegenBonus += g.stats.mdRegenBonus ?? 0;
    hpRegenPerTurn += g.stats.hpRegenPerTurn ?? 0;
  }
  return { atkBonus, defBonus, hpBonus, spdBonus, mdRegenBonus, hpRegenPerTurn };
}

/** Each mastery level above 1 grants +2% to the base passive multiplier / bonus. */
function masteryOffset(mastery: number): number {
  return Math.max(0, mastery - 1) * 0.02;
}

// ── Player stat calculators ───────────────────────────────────────────────────

export function calcPlayerAtk(player: PlayerState): number {
  const gearStats = getEquippedGearStats(player);
  let atk = player.stats.atk + gearStats.atkBonus;
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
  const gearStats = getEquippedGearStats(player);
  let def = player.stats.def + gearStats.defBonus;
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
  const gearStats = getEquippedGearStats(player);
  let maxHp = player.stats.maxHp + gearStats.hpBonus;
  const bloodline = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  if (bloodline?.passive.hpMultiplier) {
    maxHp *= bloodline.passive.hpMultiplier;
  }
  return Math.floor(maxHp);
}

export function calcPlayerSpd(player: PlayerState): number {
  const gearStats = getEquippedGearStats(player);
  let spd = player.stats.spd + gearStats.spdBonus;
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
  const gearStats = getEquippedGearStats(player);
  const mastery = getEquippedMastery(player);
  const bloodline = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  const bloodlineBonus = bloodline?.passive.mdRegenBonus ?? 0;
  // Mastery scales regen for bloodlines that have mdRegenBonus
  const masteryScaling = bloodlineBonus > 0 ? Math.max(0, mastery - 1) : 0;
  return MD_REGEN_BASE + Math.floor(player.statPoints.foc / 2) + bloodlineBonus + masteryScaling + gearStats.mdRegenBonus;
}

export function calcDamage(atk: number, enemyDef: number): number {
  return Math.max(1, Math.floor(atk * 1.0 - enemyDef * 0.5));
}

// FIRE → WIND → LIGHTNING → EARTH → WATER → FIRE (arrow means "beats")
const BEATS: Record<string, string> = {
  FIRE: 'WIND',
  WIND: 'LIGHTNING',
  LIGHTNING: 'EARTH',
  EARTH: 'WATER',
  WATER: 'FIRE',
};

export function calcElementalMultiplier(playerElement: string | undefined, enemyElement: string | undefined): number {
  if (!playerElement || !enemyElement) return 1.0;
  if (BEATS[playerElement] === enemyElement) return 1.5;   // player beats enemy → enemy is weak
  if (BEATS[enemyElement] === playerElement) return 0.75;  // enemy beats player → enemy resists
  return 1.0;
}

export function getSkillMasteryLevel(useCount: number): 1 | 2 | 3 {
  if (useCount >= 60) return 3;
  if (useCount >= 20) return 2;
  return 1;
}

export function getEffectiveSkill(skillId: string, masteryLevel: 1 | 2 | 3): SkillDefinition {
  const base = SKILLS[skillId];
  if (!base) return base;
  const tiers = SKILL_TIERS[skillId];
  if (!tiers) return base;

  if (masteryLevel === 3 && tiers.ougi) {
    return {
      ...base,
      name: tiers.ougi.name,
      description: tiers.ougi.description,
      effects: tiers.ougi.effects,
      mdCost: tiers.ougi.mdCost ?? base.mdCost,
      hpCost: tiers.ougi.hpCost ?? base.hpCost,
      cooldownTurn: tiers.ougi.cooldownTurn ?? base.cooldownTurn,
    };
  }
  if (masteryLevel >= 2 && tiers.kai) {
    return {
      ...base,
      name: tiers.kai.name,
      description: tiers.kai.description,
      effects: tiers.kai.effects,
      mdCost: tiers.kai.mdCost ?? base.mdCost,
      hpCost: tiers.kai.hpCost ?? base.hpCost,
      cooldownTurn: tiers.kai.cooldownTurn ?? base.cooldownTurn,
    };
  }
  return base;
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
  const atkDownEffect = (state.playerStatusEffects ?? []).find(e => e.type === 'ATK_DOWN');
  const effectiveAtk = atkDownEffect ? atk * (1 - (atkDownEffect.atkDebuffPercent ?? 0)) : atk;
  const critChance = hasCritBonus(state.player);
  const isCrit = Math.random() < critChance;

  const equippedBloodline = state.player.equippedBloodlineId ? BLOODLINES[state.player.equippedBloodlineId] : null;
  const playerElement = equippedBloodline?.element;
  const enemyElement = state.enemy.definition.element;
  const elementMultiplier = calcElementalMultiplier(playerElement, enemyElement);

  let damage = calcDamage(effectiveAtk, state.enemy.definition.stats.def);
  if (isCrit) damage = Math.floor(damage * 1.5);
  damage = Math.floor(damage * elementMultiplier);

  // Enemy guard halves incoming damage
  if (state.enemy.isGuarding) {
    damage = Math.floor(damage * 0.5);
  }

  const newEnemyHp = Math.max(0, state.enemy.currentHp - damage);
  const guardNote = state.enemy.isGuarding ? '（ガード！）' : '';
  let log = isCrit
    ? `クリティカルヒット！ ${damage} のダメージ！${guardNote}`
    : `あなたは ${damage} のダメージを与えた。${guardNote}`;

  if (elementMultiplier > 1) log += ' 🔥 弱点！ ×1.5';
  else if (elementMultiplier < 1) log += ' 💧 耐性… ×0.75';

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

  const baseSkill: SkillDefinition = SKILLS[skillId];
  if (!baseSkill) return state;

  // Check level requirement — bypass for the first skill of the equipped bloodline
  const equippedBloodlineForLevel = state.player.equippedBloodlineId ? BLOODLINES[state.player.equippedBloodlineId] : null;
  const isFirstBloodlineSkill = equippedBloodlineForLevel?.skillIds[0] === skillId;
  if (!isFirstBloodlineSkill && state.player.stats.level < baseSkill.requiredLevel) {
    return {
      ...state,
      battleLog: [...state.battleLog, `${baseSkill.name} を使用するにはLV${baseSkill.requiredLevel}が必要です！`],
    };
  }

  // Check cooldown
  const cdEntry = state.skillCooldowns.find(c => c.skillId === skillId);
  if (cdEntry && cdEntry.remainingTurns > 0) {
    return {
      ...state,
      battleLog: [...state.battleLog, `${baseSkill.name} はクールダウン中です（残り${cdEntry.remainingTurns}ターン）。`],
    };
  }

  // Get mastery-adjusted skill
  const masteryCount = state.player.skillMasteries?.[skillId] ?? 0;
  const masteryLevel = getSkillMasteryLevel(masteryCount);
  const skill = getEffectiveSkill(skillId, masteryLevel);

  // Check costs
  if (state.player.stats.hp <= skill.hpCost) {
    return { ...state, battleLog: [...state.battleLog, `${skill.name} を使用するにはHPが不足しています！`] };
  }
  if (state.player.stats.md < skill.mdCost) {
    return { ...state, battleLog: [...state.battleLog, `${skill.name} を使用するにはチャクラが不足しています！`] };
  }

  const atk = calcPlayerAtk(state.player);
  const atkDownEffect = (state.playerStatusEffects ?? []).find(e => e.type === 'ATK_DOWN');
  const effectiveAtk = atkDownEffect ? atk * (1 - (atkDownEffect.atkDebuffPercent ?? 0)) : atk;
  const damageMultiplier = skill.effects.damageMultiplier ?? 1.0;

  // Elemental multiplier
  const equippedBloodline = state.player.equippedBloodlineId ? BLOODLINES[state.player.equippedBloodlineId] : null;
  const playerElement = equippedBloodline?.element;
  const enemyElement = state.enemy.definition.element;
  const elementMultiplier = calcElementalMultiplier(playerElement, enemyElement);

  // Deduct costs first
  let newPlayerStats = {
    ...state.player.stats,
    hp: state.player.stats.hp - skill.hpCost,
    md: state.player.stats.md - skill.mdCost,
  };

  let skillLog = `${skill.name} を発動！`;
  let newEnemyHp = state.enemy.currentHp;
  const newEnemyStatusEffects = [...state.enemy.statusEffects];
  let newIsGuarding = state.enemy.isGuarding;
  let skipEnemyNextTurn = false;

  // Deal damage (damageMultiplier > 0 means an offensive skill)
  if (damageMultiplier > 0) {
    let damage: number;
    if (skill.effects.ignoreDefense) {
      // ignoreDefense: bypass enemy def
      damage = Math.max(1, Math.floor(effectiveAtk * damageMultiplier));
    } else {
      damage = Math.max(1, Math.floor(calcDamage(effectiveAtk, state.enemy.definition.stats.def) * damageMultiplier));
    }

    // Apply elemental multiplier to per-hit damage
    damage = Math.floor(damage * elementMultiplier);

    // Multi-hit: loop each strike individually so guard/burn apply per hit
    const hitCount = skill.effects.multiHitCount ?? 1;
    let totalDamage = 0;
    let guardHit = false;
    for (let i = 0; i < hitCount; i++) {
      let hitDmg = damage;
      // Guard only absorbs the first hit then drops
      if (i === 0 && state.enemy.isGuarding) {
        hitDmg = Math.floor(hitDmg * 0.5);
        newIsGuarding = false;
        guardHit = true;
      }
      totalDamage += hitDmg;
      // Burn proc per hit (cap at one application)
      if (skill.effects.burnChance && Math.random() < skill.effects.burnChance) {
        if (!newEnemyStatusEffects.some(e => e.type === 'BURN')) {
          newEnemyStatusEffects.push({
            type: 'BURN',
            damagePerTurn: skill.effects.burnDamagePerTurn ?? 5,
            remainingTurns: skill.effects.burnDuration ?? 3,
          });
          skillLog += ' 敵に炎上付与！';
        }
      }
    }

    skillLog = `${skill.name}！ ${totalDamage} のダメージ！`;
    if (hitCount > 1) skillLog += ` (${hitCount}連撃！)`;
    if (guardHit) skillLog += '（ガード！）';
    if (elementMultiplier > 1) skillLog += ' 🔥 弱点！ ×1.5';
    else if (elementMultiplier < 1) skillLog += ' 💧 耐性… ×0.75';

    newEnemyHp = Math.max(0, state.enemy.currentHp - totalDamage);

    // skipEnemyTurn
    if (skill.effects.skipEnemyTurn) {
      skipEnemyNextTurn = true;
      skillLog += ' 敵は行動不能！';
    }
  }

  // Self-heal
  if (skill.effects.healSelfPercent) {
    const healAmount = Math.floor(calcPlayerMaxHp(state.player) * skill.effects.healSelfPercent);
    newPlayerStats = { ...newPlayerStats, hp: Math.min(calcPlayerMaxHp(state.player), newPlayerStats.hp + healAmount) };
    skillLog += ` ${healAmount} HP回復！`;
  }

  // MD restore
  if (skill.effects.mdRestore) {
    newPlayerStats = { ...newPlayerStats, md: Math.min(newPlayerStats.maxMd, newPlayerStats.md + skill.effects.mdRestore) };
    skillLog += ` チャクラ${skill.effects.mdRestore}回復！`;
  }

  // Set cooldown
  const newCooldowns = state.skillCooldowns.filter(c => c.skillId !== skillId);
  newCooldowns.push({ skillId, remainingTurns: skill.cooldownTurn });

  // Increment skill mastery
  const newSkillMasteries = { ...(state.player.skillMasteries ?? {}) };
  newSkillMasteries[skillId] = (newSkillMasteries[skillId] ?? 0) + 1;
  const newMasteryCount = newSkillMasteries[skillId];
  const prevLevel = getSkillMasteryLevel(newMasteryCount - 1);
  const newLevel = getSkillMasteryLevel(newMasteryCount);
  let masteryLog = '';
  if (newLevel > prevLevel) {
    if (newLevel === 2) masteryLog = `⚡ ${baseSkill.name} が改に進化した！`;
    if (newLevel === 3) masteryLog = `⚡ ${baseSkill.name} が奥義に達した！`;
  }

  const logEntries = [skillLog];
  if (masteryLog) logEntries.push(masteryLog);

  const newState: BattleState = {
    ...state,
    player: { ...state.player, stats: newPlayerStats, skillMasteries: newSkillMasteries },
    enemy: {
      ...state.enemy,
      currentHp: newEnemyHp,
      statusEffects: newEnemyStatusEffects,
      isGuarding: newIsGuarding,
      isSkippingTurn: skipEnemyNextTurn ? true : state.enemy.isSkippingTurn,
    },
    skillCooldowns: newCooldowns,
    battleLog: [...state.battleLog, ...logEntries],
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

  // Decrement player status effects and remove expired ones
  const updatedPlayerStatusEffects = (s.playerStatusEffects ?? [])
    .map(e => ({ ...e, remainingTurns: e.remainingTurns - 1 }))
    .filter(e => e.remainingTurns > 0);
  s = { ...s, playerStatusEffects: updatedPlayerStatusEffects };

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

  // Apply gear HP regen per turn
  const gearStats = getEquippedGearStats(newPlayer);
  if (gearStats.hpRegenPerTurn > 0) {
    const effectiveMaxHp = calcPlayerMaxHp(newPlayer);
    const regenHp = Math.min(effectiveMaxHp, newPlayer.stats.hp + gearStats.hpRegenPerTurn);
    if (regenHp > newPlayer.stats.hp) {
      newPlayer = { ...newPlayer, stats: { ...newPlayer.stats, hp: regenHp } };
    }
  }

  return performEnemyTurn({ ...s, player: newPlayer, phase: 'ENEMY_TURN' });
}

export function performEnemyTurn(state: BattleState): BattleState {
  if (state.phase !== 'ENEMY_TURN') return state;

  const newLog = [...state.battleLog];
  let newPlayer = { ...state.player };
  let newEnemy = { ...state.enemy };
  let newPlayerStatusEffects = [...(state.playerStatusEffects ?? [])];

  // Handle skip turn (from skipEnemyTurn skills)
  if (newEnemy.isSkippingTurn) {
    newLog.push(`${newEnemy.definition.name} は行動不能！`);
    // Reduce skill cooldowns
    const newCooldowns = state.skillCooldowns.map(c => ({
      ...c,
      remainingTurns: Math.max(0, c.remainingTurns - 1),
    }));
    // MD regen
    if (!newPlayer.isInMode) {
      const mdRegen = calcMdRegen(newPlayer);
      newPlayer = {
        ...newPlayer,
        stats: { ...newPlayer.stats, md: Math.min(newPlayer.stats.maxMd, newPlayer.stats.md + mdRegen) },
      };
    }
    return {
      ...state,
      player: newPlayer,
      enemy: { ...newEnemy, isSkippingTurn: false },
      battleLog: newLog,
      skillCooldowns: newCooldowns,
      playerStatusEffects: newPlayerStatusEffects,
      phase: 'PLAYER_TURN',
      turnNumber: state.turnNumber + 1,
    };
  }

  // Process burn on enemy
  const burnEffect = newEnemy.statusEffects.find(e => e.type === 'BURN');
  if (burnEffect) {
    const burnDmg = burnEffect.damagePerTurn ?? 0;
    newEnemy = {
      ...newEnemy,
      currentHp: Math.max(0, newEnemy.currentHp - burnDmg),
      statusEffects: newEnemy.statusEffects
        .map(e => e.type === 'BURN' ? { ...e, remainingTurns: e.remainingTurns - 1 } : e)
        .filter(e => e.remainingTurns > 0),
    };
    newLog.push(`敵は ${burnDmg} の炎上ダメージ！`);
    if (newEnemy.currentHp <= 0) {
      return { ...state, enemy: newEnemy, battleLog: newLog, phase: 'VICTORY', playerStatusEffects: newPlayerStatusEffects };
    }
  }

  // Enemy special ability / attack logic
  const enemyDef = newEnemy.definition;
  let nextIsGuarding = false;
  let nextChargeReady = false;

  if (newEnemy.chargeReady) {
    const def = calcPlayerDef(newPlayer);
    const damage = calcEnemyDamage(enemyDef.stats.atk * 2, def);
    const newHp = Math.max(0, newPlayer.stats.hp - damage);
    newLog.push(`⚡ ${enemyDef.name} の蓄力攻撃！ ${damage} の巨大ダメージ！`);
    newPlayer = { ...newPlayer, stats: { ...newPlayer.stats, hp: newHp } };
  } else if (enemyDef.specialAbility === 'GUARD' && Math.random() < (enemyDef.specialAbilityChance ?? 0)) {
    nextIsGuarding = true;
    newLog.push(`🛡 ${enemyDef.name} は守りを固めた！`);
  } else if (enemyDef.specialAbility === 'CHARGE' && Math.random() < (enemyDef.specialAbilityChance ?? 0)) {
    nextChargeReady = true;
    newLog.push(`⚡ ${enemyDef.name} は力を蓄えている！`);
  } else if (enemyDef.specialAbility === 'HEAL') {
    if (newEnemy.currentHp < enemyDef.stats.maxHp * 0.4 && Math.random() < (enemyDef.specialAbilityChance ?? 0)) {
      const healAmt = Math.floor(enemyDef.stats.maxHp * 0.2);
      newEnemy = { ...newEnemy, currentHp: Math.min(enemyDef.stats.maxHp, newEnemy.currentHp + healAmt) };
      newLog.push(`💚 ${enemyDef.name} はHPを${healAmt}回復した！`);
    }
    // Always also attack this turn
    const def = calcPlayerDef(newPlayer);
    const damage = calcEnemyDamage(enemyDef.stats.atk, def);
    const newHp = Math.max(0, newPlayer.stats.hp - damage);
    newLog.push(`${enemyDef.name} の攻撃！ ${damage} のダメージ！`);
    newPlayer = { ...newPlayer, stats: { ...newPlayer.stats, hp: newHp } };
  } else if (enemyDef.specialAbility === 'MULTI_HIT' && Math.random() < (enemyDef.specialAbilityChance ?? 0)) {
    const def = calcPlayerDef(newPlayer);
    let totalDmg = 0;
    let currentHp = newPlayer.stats.hp;
    for (let i = 0; i < 2; i++) {
      const dmg = Math.max(1, Math.floor(calcEnemyDamage(enemyDef.stats.atk, def) * 0.6));
      totalDmg += dmg;
      currentHp = Math.max(0, currentHp - dmg);
    }
    newLog.push(`⚡ ${enemyDef.name} の連続攻撃！合計${totalDmg}ダメージ！`);
    newPlayer = { ...newPlayer, stats: { ...newPlayer.stats, hp: currentHp } };
  } else if (enemyDef.specialAbility === 'DEBUFF' && Math.random() < (enemyDef.specialAbilityChance ?? 0)) {
    const existing = newPlayerStatusEffects.find(e => e.type === 'ATK_DOWN');
    if (!existing) {
      newPlayerStatusEffects = [...newPlayerStatusEffects, { type: 'ATK_DOWN', remainingTurns: 2, atkDebuffPercent: 0.20 }];
    }
    const def = calcPlayerDef(newPlayer);
    const damage = calcEnemyDamage(enemyDef.stats.atk, def);
    const newHp = Math.max(0, newPlayer.stats.hp - damage);
    newLog.push(`💜 ${enemyDef.name} の封印術！攻撃力が20%低下！（2ターン）`);
    newLog.push(`${enemyDef.name} の攻撃！ ${damage} のダメージ！`);
    newPlayer = { ...newPlayer, stats: { ...newPlayer.stats, hp: newHp } };
  } else {
    const def = calcPlayerDef(newPlayer);
    const damage = calcEnemyDamage(enemyDef.stats.atk, def);
    const newHp = Math.max(0, newPlayer.stats.hp - damage);
    newLog.push(`${enemyDef.name} の攻撃！ ${damage} のダメージ！`);
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
      playerStatusEffects: newPlayerStatusEffects,
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
    playerStatusEffects: newPlayerStatusEffects,
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
  const rareIds = RARE_BLOODLINE_IDS;
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
    resultMsg = `重複！${BLOODLINES[chosenId].name} 熟練度+1`;
  } else {
    newOwnedBloodlines.push({ id: chosenId, mastery: 1 });
    resultMsg = `新しい血継限界：${BLOODLINES[chosenId].name}！`;
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
    stamina: MAX_STAMINA,
    maxStamina: MAX_STAMINA,
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
    const now = Date.now();
    if (player.lastFreeRestTimestamp && now - player.lastFreeRestTimestamp < FREE_REST_COOLDOWN_MS) {
      const hoursLeft = Math.ceil((FREE_REST_COOLDOWN_MS - (now - player.lastFreeRestTimestamp)) / (60 * 60 * 1000));
      return { player, success: false, message: `無料休憩はあと${hoursLeft}時間後に使用できます。` };
    }
    const newHp = Math.min(maxHp, player.stats.hp + Math.floor(maxHp * 0.5));
    const newMd = Math.min(player.stats.maxMd, player.stats.md + Math.floor(player.stats.maxMd * 0.5));
    return {
      player: {
        ...player,
        stats: { ...player.stats, hp: newHp, md: newMd },
        lastFreeRestTimestamp: now,
      },
      success: true,
      message: '休憩完了！HPとChakraがそれぞれ50%回復しました。スタミナはスタミナ丸で回復してください。',
    };
  }

  // PAY: full restore
  const bracket = CLINIC_COSTS.find(b => player.stats.level <= b.maxLevel) ?? CLINIC_COSTS[CLINIC_COSTS.length - 1];
  const cost = bracket.cost;
  if (player.ryo < cost) {
    return { player, success: false, message: `Ryoが不足しています！必要: ${cost} Ryo。` };
  }
  return {
    player: {
      ...player,
      stats: { ...player.stats, hp: maxHp, md: player.stats.maxMd },
      ryo: player.ryo - cost,
    },
    success: true,
    message: `治療完了！HPとChakraが全回復しました！（${cost} Ryo消費）`,
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
    return { ...state, battleLog: [...state.battleLog, 'その道具がありません！'] };
  }

  const item = ITEMS[itemId];
  if (!item) {
    return { ...state, battleLog: [...state.battleLog, '未知の道具！'] };
  }

  let newStats = { ...state.player.stats };
  let log = `${item.name}を使用した！`;
  const newActiveBuffs = [...(state.player.activeBuffs ?? [])];

  const maxHp = calcPlayerMaxHp(state.player);

  if (item.effect.hpRestore) {
    const heal = item.effect.hpRestore;
    newStats = { ...newStats, hp: Math.min(maxHp, newStats.hp + heal) };
    log += ` ${heal}HP回復！`;
  }
  if (item.effect.hpRestorePercent) {
    const heal = Math.floor(maxHp * item.effect.hpRestorePercent);
    newStats = { ...newStats, hp: Math.min(maxHp, newStats.hp + heal) };
    log += ` ${heal}HP回復！`;
  }
  if (item.effect.mdRestore) {
    const restore = item.effect.mdRestore;
    newStats = { ...newStats, md: Math.min(newStats.maxMd, newStats.md + restore) };
    log += ` Chakraを${restore}回復！`;
  }
  if (item.effect.mdRestorePercent) {
    const restore = Math.floor(newStats.maxMd * item.effect.mdRestorePercent);
    newStats = { ...newStats, md: Math.min(newStats.maxMd, newStats.md + restore) };
    log += ` Chakraを${restore}回復！`;
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
    log += ` 強化効果（${item.effect.buffDuration}ターン）を獲得！`;
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
    return { player, message: 'その道具がありません！', success: false };
  }

  const item = ITEMS[itemId];
  if (!item || !item.usableOutOfCombat) {
    return { player, message: 'この道具は戦闘外では使えません！', success: false };
  }

  let newStats = { ...player.stats };
  let newStamina = player.stamina;
  let msg = `${item.name}を使用した！`;

  const maxHp = calcPlayerMaxHp(player);

  if (item.effect.hpRestore) {
    const heal = item.effect.hpRestore;
    newStats = { ...newStats, hp: Math.min(maxHp, newStats.hp + heal) };
    msg += ` ${heal}HP回復！`;
  }
  if (item.effect.hpRestorePercent) {
    const heal = Math.floor(maxHp * item.effect.hpRestorePercent);
    newStats = { ...newStats, hp: Math.min(maxHp, newStats.hp + heal) };
    msg += ` ${heal}HP回復！`;
  }
  if (item.effect.mdRestore) {
    const restore = item.effect.mdRestore;
    newStats = { ...newStats, md: Math.min(newStats.maxMd, newStats.md + restore) };
    msg += ` Chakraを${restore}回復！`;
  }
  if (item.effect.mdRestorePercent) {
    const restore = Math.floor(newStats.maxMd * item.effect.mdRestorePercent);
    newStats = { ...newStats, md: Math.min(newStats.maxMd, newStats.md + restore) };
    msg += ` Chakraを${restore}回復！`;
  }
  if (item.effect.staminaRestore) {
    const restore = item.effect.staminaRestore;
    newStamina = Math.min(player.maxStamina, newStamina + restore);
    msg += ` スタミナを${restore}回復！`;
  }

  const newInventory = deductInventoryItem(player.inventory ?? [], itemId);

  return {
    player: { ...player, stats: newStats, stamina: newStamina, inventory: newInventory },
    message: msg,
    success: true,
  };
}

// ── Gear ──────────────────────────────────────────────────────────────────────

export function equipGear(player: PlayerState, gearId: string): PlayerState {
  const gear = GEAR[gearId];
  if (!gear) return player;
  if (!player.ownedGearIds?.includes(gearId)) return player;

  const newEquippedGear = {
    ...(player.equippedGear ?? { weapon: null, armor: null, accessory: null }),
    [gear.slot.toLowerCase()]: gearId,
  };
  const newPlayer = { ...player, equippedGear: newEquippedGear };

  // Clamp HP to new effective max
  const newEffectiveMaxHp = calcPlayerMaxHp(newPlayer);
  return {
    ...newPlayer,
    stats: {
      ...newPlayer.stats,
      hp: Math.min(newPlayer.stats.hp, newEffectiveMaxHp),
    },
  };
}

export function unequipGear(player: PlayerState, slot: 'WEAPON' | 'ARMOR' | 'ACCESSORY'): PlayerState {
  const slotKey = slot.toLowerCase() as 'weapon' | 'armor' | 'accessory';
  const newEquippedGear = {
    ...(player.equippedGear ?? { weapon: null, armor: null, accessory: null }),
    [slotKey]: null,
  };
  const newPlayer = { ...player, equippedGear: newEquippedGear };
  const newEffectiveMaxHp = calcPlayerMaxHp(newPlayer);
  return {
    ...newPlayer,
    stats: {
      ...newPlayer.stats,
      hp: Math.min(newPlayer.stats.hp, newEffectiveMaxHp),
    },
  };
}

// ── World Map / Drops ──────────────────────────────────────────────────────

export function rollBattleDrops(enemyId: string): BattleDrop[] {
  const table = ENEMY_DROP_TABLES[enemyId] ?? [];
  const drops: BattleDrop[] = [];
  for (const entry of table) {
    if (Math.random() < entry.chance) {
      const item = ITEMS[entry.itemId];
      drops.push({ type: 'ITEM', itemId: entry.itemId, label: item?.name ?? entry.itemId });
    }
  }
  if (enemyId !== 'TRAINING_DUMMY') {
    const ryo = 5 + Math.floor(Math.random() * 16);
    drops.push({ type: 'RYO', ryo, label: `+${ryo} Ryo` });
  }
  return drops;
}

export function rollBossDrops(boss: WorldBossDefinition, isFirstKill: boolean): BattleDrop[] {
  const drops: BattleDrop[] = boss.guaranteedDrops.map(itemId => {
    const item = ITEMS[itemId];
    return { type: 'ITEM' as const, itemId, label: item?.name ?? itemId };
  });
  const ryo = 200 + Math.floor(Math.random() * 101);
  drops.push({ type: 'RYO', ryo, label: `+${ryo} Ryo` });
  if (isFirstKill && boss.signatureBloodlineId) {
    const bloodline = BLOODLINES[boss.signatureBloodlineId];
    const bloodlineName = bloodline?.name ?? boss.signatureBloodlineId;
    drops.push({ type: 'BLOODLINE_SCROLL', bloodlineId: boss.signatureBloodlineId, label: `血継限界の巻物（${bloodlineName}）` });
  }
  return drops;
}

export function isBossAvailable(bossId: string, lastKills: Record<string, number>, cooldownMs: number): boolean {
  const lastKill = lastKills[bossId];
  if (!lastKill) return true;
  return Date.now() - lastKill >= cooldownMs;
}

export function bossNextAvailableMs(bossId: string, lastKills: Record<string, number>, cooldownMs: number): number {
  const lastKill = lastKills[bossId];
  if (!lastKill) return 0;
  return Math.max(0, lastKill + cooldownMs - Date.now());
}
