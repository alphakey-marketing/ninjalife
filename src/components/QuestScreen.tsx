import { useGame } from '../gameStore';
import { ENEMIES, QUEST_ZONES, QUESTS } from '../constants';
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
  const rankZones = QUEST_ZONES.filter(z =>
    z.questIds.some(id => rankQuests.find(q => q.id === id))
  );

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← Back</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>⚔ Quests</span>
        <span className="text-gold">LV {player.stats.level} | ⚡{player.stamina}</span>
      </div>

      {rankZones.map(zone => {
        const zoneQuests = zone.questIds.map(id => rankQuests.find(q => q.id === id)).filter(Boolean) as typeof rankQuests;
        if (zoneQuests.length === 0) return null;
        return (
          <div key={zone.zone} className="card">
            <div className="zone-header">{zone.emoji} {zone.zone}</div>
            {zoneQuests.map(quest => {
              const isLocked = player.stats.level < quest.requiredLevel;
              const isOnceDone = quest.repeatType === 'ONCE' && player.completedQuestIds.includes(quest.id);
              const isDailyDone = quest.repeatType === 'DAILY' && (() => {
                const ts = player.questResetTimestamps?.[quest.id];
                if (!ts) return false;
                return new Date(ts).toISOString().slice(0, 10) === getTodayString();
              })();
              const staminaInsufficient = player.stamina < quest.staminaCost;
              const unavailable = isOnceDone || isDailyDone;
              const enemyDef = ENEMIES[quest.targetEnemyId];
              return (
                <div
                  key={quest.id}
                  className={`quest-item quest-type-${quest.type} ${isLocked ? 'locked' : ''} ${isDailyDone ? 'quest-daily-done' : ''} ${isOnceDone ? 'quest-available' : ''}`}
                  onClick={() => !isLocked && !unavailable && !staminaInsufficient && dispatch({ type: 'START_QUEST', questId: quest.id })}
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
                      {enemyDef?.specialAbility === 'HEAL' && <span className="text-green"> 💚</span>}
                      {enemyDef?.specialAbility === 'MULTI_HIT' && <span className="text-gray"> ⚡⚡</span>}
                      {enemyDef?.specialAbility === 'DEBUFF' && <span className="text-purple"> 💜</span>}
                    </span>
                    <span className="text-gold">+{quest.reward.exp} EXP +{quest.reward.ryo} Ryo</span>
                  </div>
                  <div className="flex-row text-small" style={{ marginTop: '4px', justifyContent: 'space-between' }}>
                    <span className={staminaInsufficient ? 'text-red' : 'text-gray'}>
                      ⚡ {quest.staminaCost} 精力{staminaInsufficient ? '（不足）' : ''}
                    </span>
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
        );
      })}
    </div>
  );
}
