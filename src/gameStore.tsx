import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { BattleState, PlayerState, Screen } from './types';
import { ENEMIES, QUESTS, SAVE_VERSION } from './constants';
import {
  applyStatPoint,
  canRankUp,
  calcEnemyDamage,
  checkLevelUp,
  enemyHasFirstStrike,
  equipBloodline,
  performAttack,
  performRankUp,
  performSkill,
  performSpin,
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
  | { type: 'SAVE_GAME' }
  | { type: 'LOAD_GAME' }
  | { type: 'DEQUEUE_NOTIFICATION' };

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
};

const initialState: GameState = {
  screen: 'HUB',
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
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, screen: action.screen };

    case 'START_QUEST': {
      const quest = QUESTS.find(q => q.id === action.questId);
      if (!quest) return state;
      if (state.player.stats.level < quest.requiredLevel) {
        return notify(state, `Requires Level ${quest.requiredLevel}!`);
      }
      const battle = createBattle(state.player, action.questId);
      return {
        ...state,
        screen: 'COMBAT',
        battle,
        player: { ...state.player, currentQuestId: action.questId },
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
      // Restore full MD on retreat so the player isn't punished by resource drought next quest
      const restoredPlayer: PlayerState = {
        ...battlePlayer,
        currentQuestId: null,
        isInMode: false,
        stats: { ...battlePlayer.stats, md: battlePlayer.stats.maxMd },
      };
      return {
        ...state,
        screen: 'HUB',
        battle: null,
        player: restoredPlayer,
        notifications: [...state.notifications, 'You fled the battle!'],
      };
    }

    case 'BATTLE_NEXT_ENEMY': {
      if (!state.battle || state.battle.phase !== 'VICTORY') return state;
      const quest = QUESTS.find(q => q.id === state.battle!.questId)!;
      const newDefeated = state.battle.enemiesDefeated + 1;
      const updatedPlayer = { ...state.battle.player };

      if (newDefeated >= quest.targetCount) {
        return {
          ...state,
          player: updatedPlayer,
          battle: {
            ...state.battle,
            player: updatedPlayer,
            enemiesDefeated: newDefeated,
            phase: 'QUEST_COMPLETE',
            battleLog: [...state.battle.battleLog, 'Quest complete! Collect your reward.'],
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
          battleLog: [...state.battle.battleLog, `A new ${enemyDef.name} appears!`],
          phase: 'PLAYER_TURN',
          enemiesDefeated: newDefeated,
        },
      };
    }

    case 'COLLECT_QUEST_REWARD': {
      if (!state.battle) return state;
      const quest = QUESTS.find(q => q.id === state.battle!.questId)!;
      const preRewardLevel = state.battle.player.stats.level;
      let player = { ...state.battle.player };

      // Mark quest as completed (first-time tracking)
      const completedQuestIds = player.completedQuestIds.includes(quest.id)
        ? player.completedQuestIds
        : [...player.completedQuestIds, quest.id];

      player = {
        ...player,
        stats: { ...player.stats, exp: player.stats.exp + quest.reward.exp },
        ryo: player.ryo + quest.reward.ryo,
        bossDefeatedThisRank: quest.type === 'BOSS' ? true : player.bossDefeatedThisRank,
        currentQuestId: null,
        isInMode: false,
        // Restore full MD on quest complete
        completedQuestIds,
      };
      player = { ...player, stats: { ...player.stats, md: player.stats.maxMd } };

      player = checkLevelUp(player);

      let finalState: GameState = {
        ...state,
        screen: 'HUB',
        battle: null,
        player,
        notifications: [...state.notifications, `Quest Complete! +${quest.reward.exp} EXP +${quest.reward.ryo} Ryo`],
      };

      // Level-up notifications for each level gained
      for (let lv = preRewardLevel + 1; lv <= player.stats.level; lv++) {
        finalState = notify(finalState, `⬆ Level Up! Now Level ${lv}!`);
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
        ...notify(state, `Equipped ${action.bloodlineId} bloodline!`),
        player: { ...newPlayer, unlockedMode: unlockedMode || newPlayer.unlockedMode },
      };
    }

    case 'ALLOCATE_STAT': {
      const newPlayer = applyStatPoint(state.player, action.stat);
      return { ...state, player: newPlayer };
    }

    case 'RANK_UP': {
      if (!canRankUp(state.player)) {
        return notify(state, 'Cannot rank up yet! Need LV30 and BOSS cleared.');
      }
      const newPlayer = performRankUp(state.player);
      return notify({ ...state, player: newPlayer }, `Ranked up to Rank ${newPlayer.rank}!`);
    }

    case 'SAVE_GAME': {
      try {
        localStorage.setItem('ninjalife_save', JSON.stringify({ saveVersion: SAVE_VERSION, player: state.player }));
        return notify(state, 'Game saved!');
      } catch {
        return notify(state, 'Failed to save!');
      }
    }

    case 'LOAD_GAME': {
      try {
        const saved = localStorage.getItem('ninjalife_save');
        if (saved) {
          const raw = JSON.parse(saved);
          // Support both new format { saveVersion, player } and legacy format (raw player)
          const rawPlayer = (raw.saveVersion !== undefined ? raw.player : raw) as PlayerState;
          // Patch any missing fields added in later save versions
          const player: PlayerState = {
            ...rawPlayer,
            completedQuestIds: rawPlayer.completedQuestIds ?? [],
          };
          return notify({ ...state, player, screen: 'HUB', battle: null }, 'Game loaded!');
        }
        return notify(state, 'No save found!');
      } catch {
        return notify(state, 'Failed to load!');
      }
    }

    case 'DEQUEUE_NOTIFICATION':
      return { ...state, notifications: state.notifications.slice(1) };

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
