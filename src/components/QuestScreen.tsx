import { useGame } from '../gameStore';
import { ENEMIES, QUESTS } from '../constants';
import { getTodayString } from '../gameLogic';

const questTypeLabel: Record<string, string> = {
  GRIND: '⚔ GRIND',
  ELITE: '🗡 ELITE',
  BOSS: '💀 BOSS',
};

export function QuestScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;

  const rankQuests = QUESTS.filter(q => q.requiredRank === player.rank);

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← Back</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>⚔ Quests</span>
        <span className="text-gold">LV {player.stats.level}</span>
      </div>

      <div className="card">
        <div className="card-title">Available Quests</div>
        {rankQuests.map(quest => {
          const isLocked = player.stats.level < quest.requiredLevel;
          const isOnceDone = quest.repeatType === 'ONCE' && player.completedQuestIds.includes(quest.id);
          const isDailyDone = quest.repeatType === 'DAILY' && (() => {
            const ts = player.questResetTimestamps?.[quest.id];
            if (!ts) return false;
            return new Date(ts).toISOString().slice(0, 10) === getTodayString();
          })();
          const unavailable = isOnceDone || isDailyDone;
          const enemyDef = ENEMIES[quest.targetEnemyId];
          return (
            <div
              key={quest.id}
              className={`quest-item quest-type-${quest.type} ${isLocked ? 'locked' : ''} ${isDailyDone ? 'quest-daily-done' : ''} ${isOnceDone ? 'quest-available' : ''}`}
              onClick={() => !isLocked && !unavailable && dispatch({ type: 'START_QUEST', questId: quest.id })}
            >
              <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                <span className="text-bold">
                  {quest.name}
                  {isOnceDone && <span className="text-green"> ✓</span>}
                </span>
                <span className="text-small">{questTypeLabel[quest.type]}</span>
              </div>
              <div className="text-small text-gray" style={{ marginTop: '4px' }}>{quest.description}</div>
              <div className="flex-row text-small" style={{ marginTop: '6px', justifyContent: 'space-between' }}>
                <span>
                  Defeat {quest.targetCount}× {enemyDef?.name ?? quest.targetEnemyId}
                  {enemyDef?.specialAbility === 'GUARD' && <span className="text-gray"> 🛡</span>}
                  {enemyDef?.specialAbility === 'CHARGE' && <span className="text-gray"> ⚡</span>}
                </span>
                <span className="text-gold">+{quest.reward.exp} EXP +{quest.reward.ryo} Ryo</span>
              </div>
              {isLocked && (
                <div className="text-small text-red" style={{ marginTop: '4px' }}>
                  🔒 Requires LV {quest.requiredLevel}
                </div>
              )}
              {isDailyDone && (
                <div className="text-small text-gray" style={{ marginTop: '4px' }}>
                  🔄 明日重置
                </div>
              )}
              {isOnceDone && (
                <div className="text-small text-green" style={{ marginTop: '4px' }}>
                  ✓ 已完成（不可重複）
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
