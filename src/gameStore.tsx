import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { BattleState, BattleDrop, PlayerState, Screen } from './types';
import { ENEMIES, GEAR, ITEMS, JADE_SHOP_ITEMS, QUESTS, SAVE_VERSION, MAX_STAMINA, STAMINA_RECOVERY_INTERVAL_MS, STAMINA_RECOVERY_AMOUNT, VITAL_REGEN_INTERVAL_MS, VITAL_HP_REGEN_AMOUNT, VITAL_MD_REGEN_AMOUNT, WORLD_BOSSES, WORLD_ZONES, KILL_STREAK_BONUS_RYO, KILL_STREAK_THRESHOLD } from './constants';
import {
  applyItemEffect,
  applyStatPoint,
  calcPlayerMaxHp,
  canRankUp,
  calcEnemyDamage,
  checkLevelUp,
  enemyHasFirstStrike,
  equipBloodline,
  equipGear,
  getTodayString,
  isQuestAvailableForPlayer,
  performAttack,
  performRankUp,
  performRest,
  performSkill,
  performSpin,
  performUseItemInBattle,
  toggleMode,
  unequipGear,
  rollBattleDrops,
  rollBossDrops,
  isBossAvailable,
} from './gameLogic';

interface GameState {
  screen: Screen;
  player: PlayerState;
  battle: BattleState | null;
  notifications: string[];
  lastSpinBloodlineId: string | null;
}

type GameAction =
  | { type: 'NAVIGATE'; screen: Screen }
  | { type: 'START_QUEST'; questId: string }
  | { type: 'BATTLE_ATTACK' }
  | { type: 'BATTLE_SKILL'; skillId: string }
  | { type: 'BATTLE_TOGGLE_MODE' }
  | { type: 'BATTLE_RUN' }
  | { type: 'BATTLE_NEXT_ENEMY' }
  | { type: 'COLLECT_QUEST_REWARD' }
  | { type: 'COLLECT_DROPS' }
  | { type: 'ENTER_ZONE'; zoneId: string; enemyId: string }
  | { type: 'WORLD_BOSS_ATTEMPT'; bossId: string }
  | { type: 'SPIN' }
  | { type: 'EQUIP_BLOODLINE'; bloodlineId: string }
  | { type: 'ALLOCATE_STAT'; stat: 'str' | 'vit' | 'foc' }
  | { type: 'RANK_UP' }
  | { type: 'REST_FREE' }
  | { type: 'REST_PAY' }
  | { type: 'BUY_ITEM'; itemId: string }
  | { type: 'USE_ITEM'; itemId: string }
  | { type: 'BATTLE_USE_ITEM'; itemId: string }
  | { type: 'EQUIP_GEAR'; gearId: string }
  | { type: 'UNEQUIP_GEAR'; slot: 'WEAPON' | 'ARMOR' | 'ACCESSORY' }
  | { type: 'BUY_GEAR'; gearId: string }
  | { type: 'SELL_ITEM'; itemId: string }
  | { type: 'SELL_GEAR'; gearId: string }
  | { type: 'STAMINA_TICK' }
  | { type: 'SAVE_GAME' }
  | { type: 'LOAD_GAME' }
  | { type: 'DEQUEUE_NOTIFICATION' }
  | { type: 'SET_PLAYER_NAME'; name: string }
  | { type: 'SPEND_JADE'; itemId: string }
  | { type: 'ADD_JADE'; amount: number }
  | { type: 'DAILY_LOGIN_CHECK' };

const initialPlayer: PlayerState = {
  name: 'Ninja',
  rank: 'E',
  rankBonus: { baseAtkMultiplier: 1.0, spinRarityBonus: 0 },
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
  ryo: 0,
  ownedBloodlines: [],
  equippedBloodlineId: null,
  unlockedMode: false,
  isInMode: false,
  currentQuestId: null,
  bossDefeatedThisRank: false,
  completedQuestIds: [],
  lastFreeRestTimestamp: 0,
  lastVitalRecovery: Date.now(),
  inventory: [],
  activeBuffs: [],
  questResetTimestamps: {},
  stamina: MAX_STAMINA,
  maxStamina: MAX_STAMINA,
  lastStaminaRecovery: Date.now(),
  ownedGearIds: [],
  equippedGear: { weapon: null, armor: null, accessory: null },
  skillMasteries: {},
  killStreak: 0,
  lastWorldBossKills: {},
  clearedBossIds: [],
  jade: 0,
  lastLoginDate: '',
};

const initialState: GameState = {
  screen: 'INTRO',
  player: initialPlayer,
  battle: null,
  notifications: [],
  lastSpinBloodlineId: null,
};

function notify(state: GameState, message: string): GameState {
  return { ...state, notifications: [...state.notifications, message] };
}

function autoSave(player: PlayerState): void {
  try {
    localStorage.setItem('ninjalife_save', JSON.stringify({ saveVersion: SAVE_VERSION, player }));
  } catch { /* silent fail */ }
}

function createBattle(player: PlayerState, questId: string, overrideEnemyId?: string, overrideTargetCount?: number, isWorldBoss?: boolean): BattleState {
  const quest = overrideEnemyId ? null : QUESTS.find(q => q.id === questId);
  const enemyId = overrideEnemyId ?? quest!.targetEnemyId;
  const targetCount = overrideTargetCount ?? quest!.targetCount;
  const enemyDef = ENEMIES[enemyId];
  const battleLog: string[] = [`${enemyDef.name} が現れた！`];
  let initialPlayer = { ...player };

  // SPD initiative: enemy with significantly higher SPD gets a free pre-emptive strike
  if (enemyHasFirstStrike(player, enemyDef.stats.spd)) {
    const preDamage = calcEnemyDamage(enemyDef.stats.atk, player.stats.def);
    // Pre-emptive can't kill the player outright
    const newHp = Math.max(1, player.stats.hp - preDamage);
    initialPlayer = { ...player, stats: { ...player.stats, hp: newHp } };
    battleLog.push(`⚡ ${enemyDef.name} の先制攻撃！ ${preDamage} ダメージ！`);
  }

  // Announce enemy abilities
  if (enemyDef.specialAbility === 'CHARGE') {
    battleLog.push(`⚠ ${enemyDef.name} は蓄力攻撃を使う！`);
  } else if (enemyDef.specialAbility === 'GUARD') {
    battleLog.push(`⚠ ${enemyDef.name} はガードを使う！`);
  } else if (enemyDef.specialAbility === 'HEAL') {
    battleLog.push(`⚠ ${enemyDef.name} は瀕死になると回復する！`);
  } else if (enemyDef.specialAbility === 'MULTI_HIT') {
    battleLog.push(`⚠ ${enemyDef.name} は連続攻撃を使う！`);
  } else if (enemyDef.specialAbility === 'DEBUFF') {
    battleLog.push(`⚠ ${enemyDef.name} はデバフ攻撃を使う！`);
  }

  return {
    player: initialPlayer,
    enemy: {
      definition: enemyDef,
      currentHp: enemyDef.stats.maxHp,
      statusEffects: [],
      isGuarding: false,
      chargeReady: false,
    },
    skillCooldowns: [],
    turnNumber: 1,
    battleLog,
    phase: 'PLAYER_TURN',
    enemiesDefeated: 0,
    questId,
    targetCount,
    modeCooldown: 0,
    playerStatusEffects: [],
    pendingDrops: [],
    isWorldBoss: isWorldBoss ?? false,
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, screen: action.screen };

    case 'START_QUEST': {
      const quest = QUESTS.find(q => q.id === action.questId);
      if (!quest) return state;
      const rankOrder: Record<string, number> = { E: 0, D: 1, C: 2 };
      if (rankOrder[quest.requiredRank] > rankOrder[state.player.rank]) {
        return notify(state, 'ランクが足りません！');
      }
      if (!isQuestAvailableForPlayer(quest, state.player)) {
        return notify(state, quest.repeatType === 'ONCE' ? 'このミッションは達成済みです！' : '本日のミッションは完了しました。明日また来てください！');
      }
      if (state.player.stats.level < quest.requiredLevel) {
        return notify(state, `Requires Level ${quest.requiredLevel}!`);
      }
      if (state.player.stamina < quest.staminaCost) {
        return notify(state, `スタミナ不足！必要: ${quest.staminaCost}（現在: ${state.player.stamina}）`);
      }
      const playerWithStamina = { ...state.player, stamina: state.player.stamina - quest.staminaCost };
      const battle = createBattle(playerWithStamina, action.questId);
      return {
        ...state,
        screen: 'COMBAT',
        battle,
        player: { ...playerWithStamina, currentQuestId: action.questId },
      };
    }

    case 'BATTLE_ATTACK': {
      if (!state.battle) return state;
      const newBattle = performAttack(state.battle);
      return { ...state, battle: newBattle };
    }

    case 'BATTLE_SKILL': {
      if (!state.battle) return state;
      const newBattle = performSkill(state.battle, action.skillId);
      return { ...state, battle: newBattle };
    }

    case 'BATTLE_TOGGLE_MODE': {
      if (!state.battle) return state;
      const newBattle = toggleMode(state.battle);
      return { ...state, battle: newBattle };
    }

    case 'BATTLE_RUN': {
      const battlePlayer = state.battle ? state.battle.player : state.player;
      const isSyntheticBattle = state.battle?.questId?.startsWith('__') ?? false;
      // Use state.player as base to avoid snapshot staleness; carry over current battle HP
      const restoredPlayer: PlayerState = {
        ...state.player,
        currentQuestId: null,
        isInMode: false,
        stats: {
          ...state.player.stats,
          hp: battlePlayer.stats.hp,
          // Restore full Chakra on retreat so the player isn't punished by resource drought
          md: state.player.stats.maxMd,
        },
      };
      return {
        ...state,
        screen: isSyntheticBattle ? 'MAP' : 'HUB',
        battle: null,
        player: restoredPlayer,
        notifications: [...state.notifications, '逃走成功！'],
      };
    }

    case 'BATTLE_NEXT_ENEMY': {
      if (!state.battle || state.battle.phase !== 'VICTORY') return state;
      const isSynthetic = state.battle.questId.startsWith('__');
      const quest = isSynthetic ? null : QUESTS.find(q => q.id === state.battle!.questId);
      const targetCount = state.battle.targetCount;
      const newDefeated = state.battle.enemiesDefeated + 1;

      // Roll drops for just-defeated enemy and update kill streak
      const defeatedEnemyId = state.battle.enemy.definition.id;
      const newDrops = rollBattleDrops(defeatedEnemyId);
      const newKillStreak = (state.player.killStreak ?? 0) + 1;
      const streakBonus: BattleDrop[] = (newKillStreak % KILL_STREAK_THRESHOLD === 0)
        ? [{ type: 'RYO', ryo: KILL_STREAK_BONUS_RYO, label: `🔥 ${KILL_STREAK_THRESHOLD}連続撃破ボーナス！ +${KILL_STREAK_BONUS_RYO} Ryo` }]
        : [];
      const accumulatedDrops = [...(state.battle.pendingDrops ?? []), ...newDrops, ...streakBonus];

      // Use state.player as base to avoid snapshot staleness; carry over current battle HP/MD/mode
      const updatedPlayer: PlayerState = {
        ...state.player,
        stats: {
          ...state.player.stats,
          hp: state.battle.player.stats.hp,
          md: state.battle.player.stats.md,
        },
        isInMode: state.battle.player.isInMode,
        killStreak: newKillStreak,
      };

      if (newDefeated >= targetCount) {
        return {
          ...state,
          player: updatedPlayer,
          battle: {
            ...state.battle,
            player: updatedPlayer,
            enemiesDefeated: newDefeated,
            phase: 'QUEST_COMPLETE',
            battleLog: [...state.battle.battleLog, 'ミッション完了！報酬を受け取れ。'],
            pendingDrops: accumulatedDrops,
          },
        };
      }

      const enemyId = isSynthetic ? state.battle.enemy.definition.id : quest!.targetEnemyId;
      const enemyDef = ENEMIES[enemyId];
      return {
        ...state,
        player: updatedPlayer,
        battle: {
          ...state.battle,
          player: updatedPlayer,
          enemy: {
            definition: enemyDef,
            currentHp: enemyDef.stats.maxHp,
            statusEffects: [],
            isGuarding: false,
            chargeReady: false,
          },
          skillCooldowns: [],
          turnNumber: state.battle.turnNumber + 1,
          battleLog: [...state.battle.battleLog, `新しい ${enemyDef.name} が現れた！`],
          phase: 'PLAYER_TURN',
          enemiesDefeated: newDefeated,
          playerStatusEffects: state.battle.playerStatusEffects ?? [],
          pendingDrops: accumulatedDrops,
        },
      };
    }

    case 'COLLECT_QUEST_REWARD': {
      if (!state.battle) return state;
      const quest = QUESTS.find(q => q.id === state.battle!.questId);
      if (!quest) return state; // synthetic quest — use COLLECT_DROPS instead
      // Use state.player as base to avoid snapshot staleness; carry over battle HP only
      const preRewardLevel = state.player.stats.level;
      let player = { ...state.player, killStreak: state.player.killStreak ?? 0 };

      // Track quest completion
      let completedQuestIds = player.completedQuestIds;
      let questResetTimestamps = { ...player.questResetTimestamps };
      if (quest.repeatType === 'ONCE') {
        if (!completedQuestIds.includes(quest.id)) {
          completedQuestIds = [...completedQuestIds, quest.id];
        }
      } else if (quest.repeatType === 'DAILY') {
        questResetTimestamps = { ...questResetTimestamps, [quest.id]: Date.now() };
      }
      // UNLIMITED: don't record anything

      // Apply pending drops (items/ryo accumulated during battle)
      const pendingDrops = state.battle.pendingDrops ?? [];
      let newInventory = [...(player.inventory ?? [])];
      let bonusRyo = 0;
      for (const drop of pendingDrops) {
        if (drop.type === 'RYO' && drop.ryo) {
          bonusRyo += drop.ryo;
        } else if (drop.type === 'ITEM' && drop.itemId) {
          const existing = newInventory.find(i => i.itemId === drop.itemId);
          if (existing) {
            newInventory = newInventory.map(i => i.itemId === drop.itemId ? { ...i, quantity: i.quantity + 1 } : i);
          } else {
            newInventory = [...newInventory, { itemId: drop.itemId, quantity: 1 }];
          }
        } else if (drop.type === 'BLOODLINE_SCROLL' && drop.bloodlineId) {
          const already = player.ownedBloodlines.some(b => b.id === drop.bloodlineId);
          if (!already) {
            player = { ...player, ownedBloodlines: [...player.ownedBloodlines, { id: drop.bloodlineId!, mastery: 0 }] };
          }
        } else if (drop.type === 'GEAR' && drop.gearId) {
          const gearIds = player.ownedGearIds ?? [];
          if (!gearIds.includes(drop.gearId)) {
            player = { ...player, ownedGearIds: [...gearIds, drop.gearId] };
          }
        }
      }

      player = {
        ...player,
        stats: {
          ...player.stats,
          exp: player.stats.exp + quest.reward.exp,
          // Carry over HP damage taken during battle; restore full Chakra on completion
          hp: state.battle.player.stats.hp,
          md: player.stats.maxMd,
        },
        ryo: player.ryo + quest.reward.ryo + bonusRyo,
        bossDefeatedThisRank: quest.type === 'BOSS' ? true : player.bossDefeatedThisRank,
        currentQuestId: null,
        isInMode: false,
        completedQuestIds,
        questResetTimestamps,
        inventory: newInventory,
      };

      player = checkLevelUp(player);

      let finalState: GameState = {
        ...state,
        screen: 'HUB',
        battle: null,
        player,
        notifications: [...state.notifications, `ミッション完了！+${quest.reward.exp} EXP +${quest.reward.ryo} Ryo${bonusRyo > 0 ? ` +${bonusRyo} Ryo (ドロップ)` : ''}`],
      };

      // Level-up notifications for each level gained
      for (let lv = preRewardLevel + 1; lv <= player.stats.level; lv++) {
        finalState = notify(finalState, `⬆ レベルアップ！Level ${lv} になった！`);
      }

      // Auto-save after quest completion
      autoSave(finalState.player);

      return finalState;
    }

    case 'COLLECT_DROPS': {
      if (!state.battle) return state;
      const pendingDrops = state.battle.pendingDrops ?? [];
      let player = { ...state.player };
      let newInventory = [...(player.inventory ?? [])];
      let bonusRyo = 0;
      for (const drop of pendingDrops) {
        if (drop.type === 'RYO' && drop.ryo) {
          bonusRyo += drop.ryo;
        } else if (drop.type === 'ITEM' && drop.itemId) {
          const existing = newInventory.find(i => i.itemId === drop.itemId);
          if (existing) {
            newInventory = newInventory.map(i => i.itemId === drop.itemId ? { ...i, quantity: i.quantity + 1 } : i);
          } else {
            newInventory = [...newInventory, { itemId: drop.itemId, quantity: 1 }];
          }
        } else if (drop.type === 'BLOODLINE_SCROLL' && drop.bloodlineId) {
          const already = player.ownedBloodlines.some(b => b.id === drop.bloodlineId);
          if (!already) {
            player = { ...player, ownedBloodlines: [...player.ownedBloodlines, { id: drop.bloodlineId!, mastery: 0 }] };
          }
        } else if (drop.type === 'GEAR' && drop.gearId) {
          const gearIds = player.ownedGearIds ?? [];
          if (!gearIds.includes(drop.gearId)) {
            player = { ...player, ownedGearIds: [...gearIds, drop.gearId] };
          }
        }
      }
      // Update boss kill timestamp if world boss
      let lastWorldBossKills = { ...(player.lastWorldBossKills ?? {}) };
      if (state.battle.isWorldBoss) {
        const bossQuestId = state.battle.questId;
        const bossId = bossQuestId.replace('__BOSS__', '');
        lastWorldBossKills = { ...lastWorldBossKills, [bossId]: Date.now() };
      }
      // Track first-clear for world bosses
      const bossDef = state.battle.isWorldBoss
        ? WORLD_BOSSES.find(b => b.enemyId === state.battle!.enemy.definition.id)
        : null;
      const isNewBossClear = bossDef != null && !(state.player.clearedBossIds ?? []).includes(bossDef.id);
      const newClearedBossIds = bossDef && !(player.clearedBossIds ?? []).includes(bossDef.id)
        ? [...(player.clearedBossIds ?? []), bossDef.id]
        : player.clearedBossIds ?? [];
      player = {
        ...player,
        ryo: player.ryo + bonusRyo,
        stats: {
          ...player.stats,
          hp: state.battle.player.stats.hp,
          md: player.stats.maxMd,
        },
        currentQuestId: null,
        isInMode: false,
        inventory: newInventory,
        lastWorldBossKills,
        clearedBossIds: newClearedBossIds,
        jade: isNewBossClear
          ? (player.jade ?? 0) + 50
          : (player.jade ?? 0),
      };
      player = checkLevelUp(player);
      const navigateTo: Screen = state.battle.isWorldBoss || state.battle.questId.startsWith('__ZONE__') ? 'MAP' : 'HUB';
      const dropMsg = (pendingDrops.length > 0
        ? `ドロップ獲得！${bonusRyo > 0 ? ` +${bonusRyo} Ryo` : ''}`
        : 'ドロップなし') + (isNewBossClear ? ' 🎉 初回討伐ボーナス：+50 翠玉！' : '');
      autoSave(player);
      return notify({ ...state, screen: navigateTo, battle: null, player }, dropMsg);
    }

    case 'ENTER_ZONE': {
      const zone = WORLD_ZONES.find(z => z.id === action.zoneId);
      if (!zone) return notify(state, 'ゾーンが見つかりません！');
      const rankOrder: Record<string, number> = { E: 0, D: 1, C: 2 };
      if (rankOrder[zone.requiredRank] > rankOrder[state.player.rank]) {
        return notify(state, `ランクが足りません！必要: ${zone.requiredRank}`);
      }
      if (state.player.stats.level < zone.requiredLevel) {
        return notify(state, `レベルが足りません！必要: ${zone.requiredLevel}`);
      }
      if (state.player.stamina < zone.staminaCost) {
        return notify(state, `スタミナ不足！必要: ${zone.staminaCost}（現在: ${state.player.stamina}）`);
      }
      const enemyDef = ENEMIES[action.enemyId];
      if (!enemyDef) return notify(state, '敵が見つかりません！');
      const playerWithStamina = { ...state.player, stamina: state.player.stamina - zone.staminaCost };
      const questId = `__ZONE__${zone.id}`;
      const battle = createBattle(playerWithStamina, questId, action.enemyId, 1, false);
      return {
        ...state,
        screen: 'COMBAT',
        battle,
        player: { ...playerWithStamina, currentQuestId: questId },
      };
    }

    case 'WORLD_BOSS_ATTEMPT': {
      const boss = WORLD_BOSSES.find(b => b.id === action.bossId);
      if (!boss) return notify(state, 'ボスが見つかりません！');
      const lastKills = state.player.lastWorldBossKills ?? {};
      if (!isBossAvailable(boss.id, lastKills, boss.cooldownMs)) {
        return notify(state, `${boss.name} はまだ復活していません！`);
      }
      // Find zone for stamina cost
      const zone = WORLD_ZONES.find(z => z.bossId === boss.id);
      const staminaCost = zone ? zone.staminaCost * 2 : 10;
      if (state.player.stamina < staminaCost) {
        return notify(state, `スタミナ不足！必要: ${staminaCost}（現在: ${state.player.stamina}）`);
      }
      const enemyDef = ENEMIES[boss.enemyId];
      if (!enemyDef) return notify(state, 'ボスの敵データが見つかりません！');
      const playerWithStamina = { ...state.player, stamina: state.player.stamina - staminaCost };
      const questId = `__BOSS__${boss.id}`;
      // Roll boss drops now (check if first kill)
      const isFirstKill = !state.player.lastWorldBossKills?.[boss.id];
      const bossDrops = rollBossDrops(boss, isFirstKill);
      const battle = createBattle(playerWithStamina, questId, boss.enemyId, 1, true);
      // Pre-set boss drops on battle state so they're ready at QUEST_COMPLETE
      const battleWithDrops = { ...battle, pendingDrops: bossDrops };
      return {
        ...state,
        screen: 'COMBAT',
        battle: battleWithDrops,
        player: { ...playerWithStamina, currentQuestId: questId },
      };
    }

    case 'SPIN': {
      const { player: newPlayer, result, bloodlineId } = performSpin(state.player);
      if (!bloodlineId) {
        return notify(state, result);
      }
      return notify({ ...state, player: newPlayer, lastSpinBloodlineId: bloodlineId }, result);
    }

    case 'EQUIP_BLOODLINE': {
      const newPlayer = equipBloodline(state.player, action.bloodlineId);
      const unlockedMode = newPlayer.stats.level >= 10 && !!newPlayer.equippedBloodlineId;
      return {
        ...notify(state, `血継限界を装備しました！`),
        player: { ...newPlayer, unlockedMode: unlockedMode || newPlayer.unlockedMode },
      };
    }

    case 'ALLOCATE_STAT': {
      const newPlayer = applyStatPoint(state.player, action.stat);
      return { ...state, player: newPlayer };
    }

    case 'RANK_UP': {
      if (!canRankUp(state.player)) {
        return notify(state, 'まだ昇進条件を満たしていません！LV30とBOSS討伐が必要です。');
      }
      const newPlayer = performRankUp(state.player);
      const jadeBonus = 100;
      const playerWithJade = { ...newPlayer, jade: (newPlayer.jade ?? 0) + jadeBonus };
      return notify({ ...state, player: playerWithJade }, `おめでとう！Rank ${newPlayer.rank} に昇進しました！ +${jadeBonus} 翠玉！`); // POC_FREE_JADE
    }

    case 'REST_FREE': {
      const { player: newPlayer, success, message } = performRest(state.player, 'FREE');
      const newState = success ? { ...state, player: newPlayer } : state;
      return notify(newState, message);
    }

    case 'REST_PAY': {
      const { player: newPlayer, success, message } = performRest(state.player, 'PAY');
      const newState = success ? { ...state, player: newPlayer } : state;
      return notify(newState, message);
    }

    case 'BUY_ITEM': {
      const item = ITEMS[action.itemId];
      if (!item) return notify(state, '未知の道具！');
      if (state.player.ryo < item.price) return notify(state, `Ryoが不足しています！必要: ${item.price} Ryo。`);
      const existing = state.player.inventory.find(i => i.itemId === action.itemId);
      const newInventory = existing
        ? state.player.inventory.map(i => i.itemId === action.itemId ? { ...i, quantity: i.quantity + 1 } : i)
        : [...state.player.inventory, { itemId: action.itemId, quantity: 1 }];
      return notify(
        { ...state, player: { ...state.player, ryo: state.player.ryo - item.price, inventory: newInventory } },
        `${item.name}を購入しました！`,
      );
    }

    case 'USE_ITEM': {
      const { player: newPlayer, message, success } = applyItemEffect(state.player, action.itemId);
      const newState = success ? { ...state, player: newPlayer } : state;
      return notify(newState, message);
    }

    case 'BATTLE_USE_ITEM': {
      if (!state.battle) return state;
      const newBattle = performUseItemInBattle(state.battle, action.itemId);
      return { ...state, battle: newBattle };
    }

    case 'EQUIP_GEAR': {
      const newPlayer = equipGear(state.player, action.gearId);
      return { ...state, player: newPlayer };
    }

    case 'UNEQUIP_GEAR': {
      const newPlayer = unequipGear(state.player, action.slot);
      return { ...state, player: newPlayer };
    }

    case 'BUY_GEAR': {
      const gear = GEAR[action.gearId];
      if (!gear) return notify(state, '未知の装備！');
      if (state.player.ryo < gear.price) return notify(state, `Ryoが不足しています！必要: ${gear.price} Ryo。`);
      if (state.player.ownedGearIds?.includes(action.gearId)) return notify(state, 'この装備はすでに所持しています！');
      return notify(
        {
          ...state,
          player: {
            ...state.player,
            ryo: state.player.ryo - gear.price,
            ownedGearIds: [...(state.player.ownedGearIds ?? []), action.gearId],
          },
        },
        `${gear.name}を購入しました！`,
      );
    }

    case 'STAMINA_TICK': {
      const now = Date.now();
      let newPlayer = state.player;

      // Stamina recovery
      if (newPlayer.stamina < newPlayer.maxStamina) {
        const last = newPlayer.lastStaminaRecovery ?? now;
        const intervals = Math.floor((now - last) / STAMINA_RECOVERY_INTERVAL_MS);
        if (intervals > 0) {
          const gain = intervals * STAMINA_RECOVERY_AMOUNT;
          newPlayer = {
            ...newPlayer,
            stamina: Math.min(newPlayer.maxStamina, newPlayer.stamina + gain),
            lastStaminaRecovery: last + intervals * STAMINA_RECOVERY_INTERVAL_MS,
          };
        }
      }

      // Passive HP + Chakra regen (always ticks, even at 0 Ryo)
      const lastVital = newPlayer.lastVitalRecovery ?? now;
      const vitalIntervals = Math.floor((now - lastVital) / VITAL_REGEN_INTERVAL_MS);
      if (vitalIntervals > 0) {
        const maxHp = calcPlayerMaxHp(newPlayer);
        const newHp = Math.min(maxHp, newPlayer.stats.hp + vitalIntervals * VITAL_HP_REGEN_AMOUNT);
        const newMd = Math.min(newPlayer.stats.maxMd, newPlayer.stats.md + vitalIntervals * VITAL_MD_REGEN_AMOUNT);
        newPlayer = {
          ...newPlayer,
          stats: { ...newPlayer.stats, hp: newHp, md: newMd },
          lastVitalRecovery: lastVital + vitalIntervals * VITAL_REGEN_INTERVAL_MS,
        };
      }

      if (newPlayer === state.player) return state;
      return { ...state, player: newPlayer };
    }

    case 'SAVE_GAME': {
      try {
        localStorage.setItem('ninjalife_save', JSON.stringify({ saveVersion: SAVE_VERSION, player: state.player }));
        return notify(state, 'ゲームを保存しました！');
      } catch {
        return notify(state, '保存に失敗しました！');
      }
    }

    case 'LOAD_GAME': {
      try {
        const saved = localStorage.getItem('ninjalife_save');
        if (saved) {
          const raw = JSON.parse(saved);
          // Support both new format { saveVersion, player } and legacy format (raw player)
          const rawPlayer = (raw.saveVersion !== undefined ? raw.player : raw) as PlayerState & {
            freeRestUsedToday?: boolean;
            lastFreeRestDate?: string;
            lastVitalRecovery?: number;
          };
          // Build clean player without deprecated fields
          const { freeRestUsedToday: _deprecated, lastFreeRestDate: _oldDate, ...cleanPlayer } = rawPlayer;
          // Migrate lastFreeRestDate → lastFreeRestTimestamp
          // If old save shows rest was used today, treat as used just now (20-hour cooldown applies).
          // Otherwise default to 0 (free rest immediately available).
          const lastFreeRestTimestamp: number = rawPlayer.lastFreeRestTimestamp
            ?? (_deprecated || _oldDate === getTodayString() ? Date.now() : 0);
          const player: PlayerState = {
            ...cleanPlayer,
            completedQuestIds: rawPlayer.completedQuestIds ?? [],
            lastFreeRestTimestamp,
            lastVitalRecovery: rawPlayer.lastVitalRecovery ?? Date.now(),
            inventory: rawPlayer.inventory ?? [],
            activeBuffs: rawPlayer.activeBuffs ?? [],
            questResetTimestamps: rawPlayer.questResetTimestamps ?? {},
            stamina: rawPlayer.stamina ?? MAX_STAMINA,
            maxStamina: rawPlayer.maxStamina ?? MAX_STAMINA,
            lastStaminaRecovery: rawPlayer.lastStaminaRecovery ?? Date.now(),
            ownedGearIds: rawPlayer.ownedGearIds ?? [],
            equippedGear: rawPlayer.equippedGear ?? { weapon: null, armor: null, accessory: null },
            skillMasteries: rawPlayer.skillMasteries ?? {},
            killStreak: (rawPlayer as PlayerState).killStreak ?? 0,
            lastWorldBossKills: (rawPlayer as PlayerState).lastWorldBossKills ?? {},
            clearedBossIds: (rawPlayer as PlayerState).clearedBossIds ?? [],
            jade: (rawPlayer as PlayerState).jade ?? 0,
            lastLoginDate: (rawPlayer as PlayerState).lastLoginDate ?? '',
          };
          return notify({ ...state, player, screen: 'HUB', battle: null }, 'ゲームを読み込みました！');
        }
        return notify(state, 'セーブデータが見つかりません！');
      } catch {
        return notify(state, '読み込みに失敗しました！');
      }
    }

    case 'DEQUEUE_NOTIFICATION':
      return { ...state, notifications: state.notifications.slice(1) };

    case 'SET_PLAYER_NAME':
      return { ...state, player: { ...state.player, name: action.name }, screen: 'HUB' };

    case 'SELL_ITEM': {
      const item = ITEMS[action.itemId];
      if (!item) return notify(state, '未知の道具！');
      const invItem = state.player.inventory.find(i => i.itemId === action.itemId);
      if (!invItem || invItem.quantity <= 0) return notify(state, 'この道具を所持していません！');
      const sellPrice = Math.floor(item.price * 0.5);
      const newInventory = state.player.inventory
        .map(i => i.itemId === action.itemId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0);
      return notify(
        { ...state, player: { ...state.player, ryo: state.player.ryo + sellPrice, inventory: newInventory } },
        `${item.name}を売却しました！+${sellPrice} Ryo`,
      );
    }

    case 'SELL_GEAR': {
      const gear = GEAR[action.gearId];
      if (!gear) return notify(state, '未知の装備！');
      if (!state.player.ownedGearIds.includes(action.gearId)) return notify(state, 'この装備を所持していません！');
      const sellPrice = Math.floor(gear.price * 0.5);
      const slotKey = gear.slot.toLowerCase() as 'weapon' | 'armor' | 'accessory';
      const newEquippedGear = { ...state.player.equippedGear };
      if (newEquippedGear[slotKey] === action.gearId) newEquippedGear[slotKey] = null;
      return notify(
        {
          ...state,
          player: {
            ...state.player,
            ryo: state.player.ryo + sellPrice,
            ownedGearIds: state.player.ownedGearIds.filter(id => id !== action.gearId),
            equippedGear: newEquippedGear,
          },
        },
        `${gear.name}を売却しました！+${sellPrice} Ryo`,
      );
    }

    case 'ADD_JADE': {
      // POC_FREE_JADE - remove when real payment is added
      return notify({ ...state, player: { ...state.player, jade: (state.player.jade ?? 0) + action.amount } }, `+${action.amount} 翠玉を獲得！`);
    }

    case 'SPEND_JADE': {
      const jadeItem = JADE_SHOP_ITEMS.find(i => i.id === action.itemId);
      if (!jadeItem) return notify(state, '無効なアイテムです。');
      const currentJade = state.player.jade ?? 0;
      if (currentJade < jadeItem.jadeCost) return notify(state, `翠玉が不足しています！必要: ${jadeItem.jadeCost} 翠玉`);

      let updatedPlayer: PlayerState = { ...state.player, jade: currentJade - jadeItem.jadeCost };

      if (jadeItem.effect === 'STAMINA_REFILL') {
        updatedPlayer = { ...updatedPlayer, stamina: updatedPlayer.maxStamina };
      } else if (jadeItem.effect === 'HP_MD_RESTORE') {
        const maxHp = calcPlayerMaxHp(updatedPlayer);
        updatedPlayer = { ...updatedPlayer, stats: { ...updatedPlayer.stats, hp: maxHp, md: updatedPlayer.stats.maxMd } };
      } else if (jadeItem.effect === 'EXTRA_SPIN') {
        // EXTRA_SPIN: navigate to spin screen (the spend is enough — spin itself is free)
        return notify({ ...state, player: updatedPlayer, screen: 'SPIN' as Screen }, `${jadeItem.nameJp}を使用しました！`);
      } else if (jadeItem.effect === 'REST_CD_SKIP') {
        updatedPlayer = { ...updatedPlayer, lastFreeRestTimestamp: 0 };
      }

      return notify({ ...state, player: updatedPlayer }, `${jadeItem.nameJp}を使用しました！`);
    }

    case 'DAILY_LOGIN_CHECK': {
      const today = new Date().toISOString().slice(0, 10);
      const lastLogin = state.player.lastLoginDate ?? '';
      if (lastLogin === today) return state;
      const jade = (state.player.jade ?? 0) + 20;
      return notify(
        { ...state, player: { ...state.player, jade, lastLoginDate: today } },
        '🌅 デイリーログインボーナス：+20 翠玉！', // POC_FREE_JADE
      );
    }

    default:
      return state;
  }
}

function tryAutoLoadState(): GameState {
  try {
    const saved = localStorage.getItem('ninjalife_save');
    if (!saved) return initialState;
    const raw = JSON.parse(saved);
    const rawPlayer = (raw.saveVersion !== undefined ? raw.player : raw) as PlayerState & {
      freeRestUsedToday?: boolean;
      lastFreeRestDate?: string;
      lastVitalRecovery?: number;
    };
    const { freeRestUsedToday: _deprecated, lastFreeRestDate: _oldDate, ...cleanPlayer } = rawPlayer;
    const lastFreeRestTimestamp: number = rawPlayer.lastFreeRestTimestamp
      ?? (_deprecated || _oldDate === getTodayString() ? Date.now() : 0);
    const player: PlayerState = {
      ...cleanPlayer,
      completedQuestIds: rawPlayer.completedQuestIds ?? [],
      lastFreeRestTimestamp,
      lastVitalRecovery: rawPlayer.lastVitalRecovery ?? Date.now(),
      inventory: rawPlayer.inventory ?? [],
      activeBuffs: rawPlayer.activeBuffs ?? [],
      questResetTimestamps: rawPlayer.questResetTimestamps ?? {},
      stamina: rawPlayer.stamina ?? MAX_STAMINA,
      maxStamina: rawPlayer.maxStamina ?? MAX_STAMINA,
      lastStaminaRecovery: rawPlayer.lastStaminaRecovery ?? Date.now(),
      ownedGearIds: rawPlayer.ownedGearIds ?? [],
      equippedGear: rawPlayer.equippedGear ?? { weapon: null, armor: null, accessory: null },
      skillMasteries: rawPlayer.skillMasteries ?? {},
      killStreak: (rawPlayer as PlayerState).killStreak ?? 0,
      lastWorldBossKills: (rawPlayer as PlayerState).lastWorldBossKills ?? {},
      clearedBossIds: (rawPlayer as PlayerState).clearedBossIds ?? [],
      jade: (rawPlayer as PlayerState).jade ?? 0,
      lastLoginDate: (rawPlayer as PlayerState).lastLoginDate ?? '',
    };
    return { screen: 'HUB', player, battle: null, notifications: [], lastSpinBloodlineId: null };
  } catch {
    return initialState;
  }
}

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, tryAutoLoadState);

  // Auto-dequeue the front notification after 3 seconds so queued ones show in order
  useEffect(() => {
    if (state.notifications.length > 0) {
      const timer = setTimeout(() => dispatch({ type: 'DEQUEUE_NOTIFICATION' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.notifications]);

  // Stamina real-time recovery: check every 10s
  useEffect(() => {
    const interval = setInterval(() => dispatch({ type: 'STAMINA_TICK' }), 10_000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Daily login bonus check on mount
  useEffect(() => {
    dispatch({ type: 'DAILY_LOGIN_CHECK' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
