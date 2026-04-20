import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { BattleState, PlayerState, Screen } from './types';
import { ENEMIES, ITEMS, QUESTS, SAVE_VERSION, MAX_STAMINA } from './constants';
import {
  applyItemEffect,
  applyStatPoint,
  canRankUp,
  calcEnemyDamage,
  checkLevelUp,
  enemyHasFirstStrike,
  equipBloodline,
  getTodayString,
  isQuestAvailableForPlayer,
  performAttack,
  performRankUp,
  performRest,
  performSkill,
  performSpin,
  performUseItemInBattle,
  toggleMode,
} from './gameLogic';

interface GameState {
  screen: Screen;
  player: PlayerState;
  battle: BattleState | null;
  notifications: string[];
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
  lastFreeRestDate: '',
  inventory: [],
  activeBuffs: [],
  questResetTimestamps: {},
  stamina: MAX_STAMINA,
  maxStamina: MAX_STAMINA,
};

const initialState: GameState = {
  screen: 'INTRO',
  player: initialPlayer,
  battle: null,
  notifications: [],
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
  const battleLog: string[] = [`A wild ${enemyDef.name} appears!`];
  let initialPlayer = { ...player };

  // SPD initiative: enemy with significantly higher SPD gets a free pre-emptive strike
  if (enemyHasFirstStrike(player, enemyDef.stats.spd)) {
    const preDamage = calcEnemyDamage(enemyDef.stats.atk, player.stats.def);
    // Pre-emptive can't kill the player outright
    const newHp = Math.max(1, player.stats.hp - preDamage);
    initialPlayer = { ...player, stats: { ...player.stats, hp: newHp } };
    battleLog.push(`⚡ ${enemyDef.name} is faster! Pre-emptive strike for ${preDamage} damage!`);
  }

  // Announce enemy abilities
  if (enemyDef.specialAbility === 'CHARGE') {
    battleLog.push(`⚠ ${enemyDef.name} may charge up powerful attacks!`);
  } else if (enemyDef.specialAbility === 'GUARD') {
    battleLog.push(`⚠ ${enemyDef.name} may guard against your strikes!`);
  } else if (enemyDef.specialAbility === 'HEAL') {
    battleLog.push(`⚠ ${enemyDef.name} may heal when low on HP!`);
  } else if (enemyDef.specialAbility === 'MULTI_HIT') {
    battleLog.push(`⚠ ${enemyDef.name} may strike multiple times!`);
  } else if (enemyDef.specialAbility === 'DEBUFF') {
    battleLog.push(`⚠ ${enemyDef.name} may debuff your attack!`);
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
      if (quest.requiredRank !== state.player.rank) {
        return notify(state, 'Rank 不符！');
      }
      if (!isQuestAvailableForPlayer(quest, state.player)) {
        return notify(state, quest.repeatType === 'ONCE' ? '此任務已完成！' : '今日任務已完成，明日再來！');
      }
      if (state.player.stats.level < quest.requiredLevel) {
        return notify(state, `Requires Level ${quest.requiredLevel}!`);
      }
      if (state.player.stamina < quest.staminaCost) {
        return notify(state, `精力不足！需要 ${quest.staminaCost} 精力（現有 ${state.player.stamina}）`);
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
        notifications: [...state.notifications, '逃跑成功！'],
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
            battleLog: [...state.battle.battleLog, '任務完成！領取你的報酬吧。'],
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
          battleLog: [...state.battle.battleLog, `新的 ${enemyDef.name} 出現！`],
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
      } else {
        // DAILY: record timestamp
        questResetTimestamps = { ...questResetTimestamps, [quest.id]: Date.now() };
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
        notifications: [...state.notifications, `任務完成！+${quest.reward.exp} EXP +${quest.reward.ryo} Ryo`],
      };

      // Level-up notifications for each level gained
      for (let lv = preRewardLevel + 1; lv <= player.stats.level; lv++) {
        finalState = notify(finalState, `⬆ 升級！現在是 Level ${lv}！`);
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
      return notify({ ...state, player: newPlayer }, result);
    }

    case 'EQUIP_BLOODLINE': {
      const newPlayer = equipBloodline(state.player, action.bloodlineId);
      const unlockedMode = newPlayer.stats.level >= 10 && !!newPlayer.equippedBloodlineId;
      return {
        ...notify(state, `已裝備 ${action.bloodlineId} 血繼限界！`),
        player: { ...newPlayer, unlockedMode: unlockedMode || newPlayer.unlockedMode },
      };
    }

    case 'ALLOCATE_STAT': {
      const newPlayer = applyStatPoint(state.player, action.stat);
      return { ...state, player: newPlayer };
    }

    case 'RANK_UP': {
      if (!canRankUp(state.player)) {
        return notify(state, '尚未滿足晉升條件！需要 LV30 並擊敗 BOSS。');
      }
      const newPlayer = performRankUp(state.player);
      return notify({ ...state, player: newPlayer }, `恭喜晉升至 Rank ${newPlayer.rank}！`);
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
      if (!item) return notify(state, '未知道具！');
      if (state.player.ryo < item.price) return notify(state, `Ryo 不足！需要 ${item.price} Ryo。`);
      const existing = state.player.inventory.find(i => i.itemId === action.itemId);
      const newInventory = existing
        ? state.player.inventory.map(i => i.itemId === action.itemId ? { ...i, quantity: i.quantity + 1 } : i)
        : [...state.player.inventory, { itemId: action.itemId, quantity: 1 }];
      return notify(
        { ...state, player: { ...state.player, ryo: state.player.ryo - item.price, inventory: newInventory } },
        `已購買 ${item.name}！`,
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

    case 'SAVE_GAME': {
      try {
        localStorage.setItem('ninjalife_save', JSON.stringify({ saveVersion: SAVE_VERSION, player: state.player }));
        return notify(state, '遊戲已儲存！');
      } catch {
        return notify(state, '儲存失敗！');
      }
    }

    case 'LOAD_GAME': {
      try {
        const saved = localStorage.getItem('ninjalife_save');
        if (saved) {
          const raw = JSON.parse(saved);
          // Support both new format { saveVersion, player } and legacy format (raw player)
          const rawPlayer = (raw.saveVersion !== undefined ? raw.player : raw) as PlayerState & { freeRestUsedToday?: boolean };
          // Patch any missing fields added in later save versions
          const freeRestUsedToday = rawPlayer.freeRestUsedToday ?? false;
          // Build clean player without deprecated freeRestUsedToday field
          const { freeRestUsedToday: _deprecated, ...cleanPlayer } = rawPlayer;
          const player: PlayerState = {
            ...cleanPlayer,
            completedQuestIds: rawPlayer.completedQuestIds ?? [],
            lastFreeRestDate: rawPlayer.lastFreeRestDate ?? (_deprecated ? getTodayString() : ''),
            inventory: rawPlayer.inventory ?? [],
            activeBuffs: rawPlayer.activeBuffs ?? [],
            questResetTimestamps: rawPlayer.questResetTimestamps ?? {},
            stamina: rawPlayer.stamina ?? MAX_STAMINA,
            maxStamina: rawPlayer.maxStamina ?? MAX_STAMINA,
          };
          void freeRestUsedToday; // only used via _deprecated above
          return notify({ ...state, player, screen: 'HUB', battle: null }, '遊戲已讀取！');
        }
        return notify(state, '找不到存檔！');
      } catch {
        return notify(state, '讀取失敗！');
      }
    }

    case 'DEQUEUE_NOTIFICATION':
      return { ...state, notifications: state.notifications.slice(1) };

    case 'SET_PLAYER_NAME':
      return { ...state, player: { ...state.player, name: action.name }, screen: 'HUB' };

    default:
      return state;
  }
}

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Auto-dequeue the front notification after 3 seconds so queued ones show in order
  useEffect(() => {
    if (state.notifications.length > 0) {
      const timer = setTimeout(() => dispatch({ type: 'DEQUEUE_NOTIFICATION' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.notifications]);

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
