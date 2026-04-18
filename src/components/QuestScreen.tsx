import { useGame } from '../gameStore';
import { QUESTS } from '../constants';

const questTypeLabel: Record<string, string> = {
  GRIND: '⚔ GRIND',
  ELITE: '🗡 ELITE',
  BOSS: '💀 BOSS',
};

export function QuestScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← Back</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>⚔ Quests</span>
        <span className="text-gold">LV {player.stats.level}</span>
      </div>

      <div className="card">
        <div className="card-title">Available Quests</div>
        {QUESTS.map(quest => {
          const isLocked = player.stats.level < quest.requiredLevel;
          return (
            <div
              key={quest.id}
              className={`quest-item quest-type-${quest.type} ${isLocked ? 'locked' : ''}`}
              onClick={() => !isLocked && dispatch({ type: 'START_QUEST', questId: quest.id })}
            >
              <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                <span className="text-bold">{quest.name}</span>
                <span className="text-small">{questTypeLabel[quest.type]}</span>
              </div>
              <div className="text-small text-gray" style={{ marginTop: '4px' }}>{quest.description}</div>
              <div className="flex-row text-small" style={{ marginTop: '6px', justifyContent: 'space-between' }}>
                <span>
                  Defeat {quest.targetCount}x {quest.targetEnemyId.replace('_', ' ')}
                </span>
                <span className="text-gold">+{quest.reward.exp} EXP +{quest.reward.ryo} Ryo</span>
              </div>
              {isLocked && (
                <div className="text-small text-red" style={{ marginTop: '4px' }}>
                  🔒 Requires LV {quest.requiredLevel}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
