import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { BattleState, PlayerState, Screen } from './types';
import { ENEMIES, GEAR, ITEMS, QUESTS, SAVE_VERSION, MAX_STAMINA, STAMINA_RECOVERY_INTERVAL_MS, STAMINA_RECOVERY_AMOUNT, VITAL_REGEN_INTERVAL_MS, VITAL_HP_REGEN_AMOUNT, VITAL_MD_REGEN_AMOUNT } from './constants';
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
  | { type: 'SET_PLAYER_NAME'; name: string };

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

function createBattle(player: PlayerState, questId: string): BattleState {
  const quest = QUESTS.find(q => q.id === questId)!;
  const enemyDef = ENEMIES[quest.targetEnemyId];
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
    modeCooldown: 0,
    playerStatusEffects: [],
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
        screen: 'HUB',
        battle: null,
        player: restoredPlayer,
        notifications: [...state.notifications, '逃走成功！'],
      };
    }

    case 'BATTLE_NEXT_ENEMY': {
      if (!state.battle || state.battle.phase !== 'VICTORY') return state;
      const quest = QUESTS.find(q => q.id === state.battle!.questId)!;
      const newDefeated = state.battle.enemiesDefeated + 1;
      // Use state.player as base to avoid snapshot staleness; carry over current battle HP/MD/mode
      const updatedPlayer: PlayerState = {
        ...state.player,
        stats: {
          ...state.player.stats,
          hp: state.battle.player.stats.hp,
          md: state.battle.player.stats.md,
        },
        isInMode: state.battle.player.isInMode,
      };

      if (newDefeated >= quest.targetCount) {
        return {
          ...state,
          player: updatedPlayer,
          battle: {
            ...state.battle,
            player: updatedPlayer,
            enemiesDefeated: newDefeated,
            phase: 'QUEST_COMPLETE',
            battleLog: [...state.battle.battleLog, 'ミッション完了！報酬を受け取れ。'],
          },
        };
      }

      const enemyDef = ENEMIES[quest.targetEnemyId];
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
        },
      };
    }

    case 'COLLECT_QUEST_REWARD': {
      if (!state.battle) return state;
      const quest = QUESTS.find(q => q.id === state.battle!.questId)!;
      // Use state.player as base to avoid snapshot staleness; carry over battle HP only
      const preRewardLevel = state.player.stats.level;
      let player = { ...state.player };

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

      player = {
        ...player,
        stats: {
          ...player.stats,
          exp: player.stats.exp + quest.reward.exp,
          // Carry over HP damage taken during battle; restore full Chakra on completion
          hp: state.battle.player.stats.hp,
          md: player.stats.maxMd,
        },
        ryo: player.ryo + quest.reward.ryo,
        bossDefeatedThisRank: quest.type === 'BOSS' ? true : player.bossDefeatedThisRank,
        currentQuestId: null,
        isInMode: false,
        completedQuestIds,
        questResetTimestamps,
      };

      player = checkLevelUp(player);

      let finalState: GameState = {
        ...state,
        screen: 'HUB',
        battle: null,
        player,
        notifications: [...state.notifications, `ミッション完了！+${quest.reward.exp} EXP +${quest.reward.ryo} Ryo`],
      };

      // Level-up notifications for each level gained
      for (let lv = preRewardLevel + 1; lv <= player.stats.level; lv++) {
        finalState = notify(finalState, `⬆ レベルアップ！Level ${lv} になった！`);
      }

      // Auto-save after quest completion
      autoSave(finalState.player);

      return finalState;
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
      return notify({ ...state, player: newPlayer }, `おめでとう！Rank ${newPlayer.rank} に昇進しました！`);
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

  // Stamina real-time recovery: check every 60s
  useEffect(() => {
    const interval = setInterval(() => dispatch({ type: 'STAMINA_TICK' }), 60_000);
    return () => clearInterval(interval);
  }, [dispatch]);

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
