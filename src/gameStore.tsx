import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { BattleState, PlayerState, Screen } from './types';
import { ENEMIES, QUESTS } from './constants';
import {
  applyStatPoint,
  canRankUp,
  checkLevelUp,
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
  notification: string | null;
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
  | { type: 'SET_NOTIFICATION'; message: string | null };

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
  ryo: 200,
  ownedBloodlines: [],
  equippedBloodlineId: null,
  unlockedMode: false,
  isInMode: false,
  currentQuestId: null,
  bossDefeatedThisRank: false,
};

const initialState: GameState = {
  screen: 'HUB',
  player: initialPlayer,
  battle: null,
  notification: null,
};

function createBattle(player: PlayerState, questId: string): BattleState {
  const quest = QUESTS.find(q => q.id === questId)!;
  const enemyDef = ENEMIES[quest.targetEnemyId];
  return {
    player,
    enemy: {
      definition: enemyDef,
      currentHp: enemyDef.stats.maxHp,
      statusEffects: [],
    },
    skillCooldowns: [],
    turnNumber: 1,
    battleLog: [`A wild ${enemyDef.name} appears!`],
    phase: 'PLAYER_TURN',
    enemiesDefeated: 0,
    questId,
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, screen: action.screen, notification: null };

    case 'START_QUEST': {
      const quest = QUESTS.find(q => q.id === action.questId);
      if (!quest) return state;
      if (state.player.stats.level < quest.requiredLevel) {
        return { ...state, notification: `Requires Level ${quest.requiredLevel}!` };
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
      return {
        ...state,
        screen: 'HUB',
        battle: null,
        notification: 'You fled the battle!',
        player: { ...state.player, currentQuestId: null },
      };
    }

    case 'BATTLE_NEXT_ENEMY': {
      if (!state.battle || state.battle.phase !== 'VICTORY') return state;
      const quest = QUESTS.find(q => q.id === state.battle!.questId)!;
      const newDefeated = state.battle.enemiesDefeated + 1;

      if (newDefeated >= quest.targetCount) {
        // Quest complete - go to collect reward phase
        return {
          ...state,
          battle: {
            ...state.battle,
            enemiesDefeated: newDefeated,
            phase: 'VICTORY',
            battleLog: [...state.battle.battleLog, `Quest complete! Collect your reward.`],
          },
        };
      }

      // Spawn next enemy
      const enemyDef = ENEMIES[quest.targetEnemyId];
      const updatedPlayer = { ...state.battle.player };
      return {
        ...state,
        battle: {
          ...state.battle,
          player: updatedPlayer,
          enemy: {
            definition: enemyDef,
            currentHp: enemyDef.stats.maxHp,
            statusEffects: [],
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
      let player = { ...state.battle.player };

      player = {
        ...player,
        stats: { ...player.stats, exp: player.stats.exp + quest.reward.exp },
        ryo: player.ryo + quest.reward.ryo,
        bossDefeatedThisRank: quest.type === 'BOSS' ? true : player.bossDefeatedThisRank,
        currentQuestId: null,
      };

      player = checkLevelUp(player);

      return {
        ...state,
        screen: 'HUB',
        battle: null,
        player,
        notification: `Quest Complete! +${quest.reward.exp} EXP +${quest.reward.ryo} Ryo`,
      };
    }

    case 'SPIN': {
      const { player: newPlayer, result, bloodlineId } = performSpin(state.player);
      if (!bloodlineId) {
        return { ...state, notification: result };
      }
      return {
        ...state,
        player: newPlayer,
        notification: result,
      };
    }

    case 'EQUIP_BLOODLINE': {
      const newPlayer = equipBloodline(state.player, action.bloodlineId);
      // Check mode unlock
      const unlockedMode = newPlayer.stats.level >= 10 && !!newPlayer.equippedBloodlineId;
      return {
        ...state,
        player: { ...newPlayer, unlockedMode: unlockedMode || newPlayer.unlockedMode },
        notification: `Equipped ${action.bloodlineId} bloodline!`,
      };
    }

    case 'ALLOCATE_STAT': {
      const newPlayer = applyStatPoint(state.player, action.stat);
      return { ...state, player: newPlayer };
    }

    case 'RANK_UP': {
      if (!canRankUp(state.player)) {
        return { ...state, notification: 'Cannot rank up yet! Need LV30 and BOSS cleared.' };
      }
      const newPlayer = performRankUp(state.player);
      return { ...state, player: newPlayer, notification: `Ranked up to ${newPlayer.rank}!` };
    }

    case 'SAVE_GAME': {
      try {
        localStorage.setItem('ninjalife_save', JSON.stringify(state.player));
        return { ...state, notification: 'Game saved!' };
      } catch {
        return { ...state, notification: 'Failed to save!' };
      }
    }

    case 'LOAD_GAME': {
      try {
        const saved = localStorage.getItem('ninjalife_save');
        if (saved) {
          const player = JSON.parse(saved) as PlayerState;
          return { ...state, player, screen: 'HUB', battle: null, notification: 'Game loaded!' };
        }
        return { ...state, notification: 'No save found!' };
      } catch {
        return { ...state, notification: 'Failed to load!' };
      }
    }

    case 'SET_NOTIFICATION':
      return { ...state, notification: action.message };

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

  // Auto-clear notifications
  useEffect(() => {
    if (state.notification) {
      const timer = setTimeout(() => dispatch({ type: 'SET_NOTIFICATION', message: null }), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.notification]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
