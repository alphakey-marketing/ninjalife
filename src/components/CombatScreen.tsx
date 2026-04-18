import { useEffect, useRef } from 'react';
import { useGame } from '../gameStore';
import { BLOODLINES, QUESTS, SKILLS } from '../constants';
import { calcPlayerMaxHp } from '../gameLogic';

export function CombatScreen() {
  const { state, dispatch } = useGame();
  const { battle } = state;
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battle?.battleLog]);

  if (!battle) {
    return <div className="screen"><div className="card">No active battle.</div></div>;
  }

  const { player, enemy } = battle;
  const quest = QUESTS.find(q => q.id === battle.questId)!;
  const maxHp = calcPlayerMaxHp(player);
  const hpPct = Math.max(0, Math.min(100, (player.stats.hp / maxHp) * 100));
  const mdPct = Math.max(0, Math.min(100, (player.stats.md / player.stats.maxMd) * 100));
  const enemyHpPct = Math.max(0, Math.min(100, (enemy.currentHp / enemy.definition.stats.maxHp) * 100));

  const equippedBloodline = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  const availableSkills = equippedBloodline ? equippedBloodline.skillIds.map(id => SKILLS[id]) : [];

  const canAct = battle.phase === 'PLAYER_TURN';
  const isVictory = battle.phase === 'VICTORY';
  const isDefeat = battle.phase === 'DEFEAT';

  const questDone = isVictory && battle.enemiesDefeated + 1 >= quest.targetCount;

  return (
    <div className="screen">
      <div className="header-bar">
        <span className="text-gold">{quest.name}</span>
        <span className="text-small text-gray">
          {battle.enemiesDefeated}/{quest.targetCount} defeated | Turn {battle.turnNumber}
        </span>
      </div>

      {/* Combat Display */}
      <div className="card">
        <div className="combat-header">
          {/* Player */}
          <div>
            <div className="text-bold" style={{ marginBottom: '6px' }}>
              {player.name} {player.isInMode && <span className="mode-active">⚡</span>}
            </div>
            <div className="hp-bar-container">
              <div className="hp-bar-label">
                <span className="text-red text-small">HP</span>
                <span className="text-small">{player.stats.hp}/{maxHp}</span>
              </div>
              <div className="hp-bar"><div className="hp-bar-fill hp-fill" style={{ width: `${hpPct}%` }} /></div>
            </div>
            <div className="hp-bar-container" style={{ marginTop: '4px' }}>
              <div className="hp-bar-label">
                <span className="text-blue text-small">MD</span>
                <span className="text-small">{player.stats.md}/{player.stats.maxMd}</span>
              </div>
              <div className="hp-bar"><div className="hp-bar-fill md-fill" style={{ width: `${mdPct}%` }} /></div>
            </div>
          </div>

          <div className="vs-text">VS</div>

          {/* Enemy */}
          <div style={{ textAlign: 'right' }}>
            <div className="text-bold" style={{ marginBottom: '6px' }}>
              {enemy.definition.name}
              {enemy.statusEffects.find(e => e.type === 'BURN') && <span className="text-red"> 🔥</span>}
            </div>
            <div className="hp-bar-container">
              <div className="hp-bar-label">
                <span className="text-red text-small">HP</span>
                <span className="text-small">{enemy.currentHp}/{enemy.definition.stats.maxHp}</span>
              </div>
              <div className="hp-bar"><div className="hp-bar-fill hp-fill" style={{ width: `${enemyHpPct}%` }} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Battle Log */}
      <div className="battle-log" ref={logRef}>
        {battle.battleLog.map((line, i) => (
          <div key={i} className="battle-log-entry">{line}</div>
        ))}
      </div>

      {/* Actions */}
      {!isVictory && !isDefeat && (
        <div className="card">
          <div className="card-title">Actions</div>
          <div className="combat-actions">
            <button className="btn btn-primary" disabled={!canAct} onClick={() => dispatch({ type: 'BATTLE_ATTACK' })}>
              ⚔ Attack
            </button>
            <button
              className="btn"
              disabled={!canAct || !player.unlockedMode}
              onClick={() => dispatch({ type: 'BATTLE_TOGGLE_MODE' })}
            >
              {player.isInMode ? '⚡ Deactivate Mode' : '⚡ Activate Mode'}
            </button>
            {availableSkills.map(skill => {
              const cd = battle.skillCooldowns.find(c => c.skillId === skill.id);
              const onCd = cd && cd.remainingTurns > 0;
              const noMd = player.stats.md < skill.mdCost;
              const noHp = player.stats.hp <= skill.hpCost;
              return (
                <button
                  key={skill.id}
                  className="btn"
                  disabled={!canAct || !!onCd || noMd || noHp}
                  onClick={() => dispatch({ type: 'BATTLE_SKILL', skillId: skill.id })}
                  title={skill.description}
                >
                  ✨ {skill.name}
                  {onCd ? ` (${cd!.remainingTurns}t)` : ` (${skill.mdCost}MD)`}
                </button>
              );
            })}
            <button className="btn btn-danger" onClick={() => dispatch({ type: 'BATTLE_RUN' })}>
              🏃 Run
            </button>
          </div>
        </div>
      )}

      {/* Victory */}
      {isVictory && !questDone && (
        <div className="card">
          <div className="text-bold text-gold" style={{ marginBottom: '8px' }}>
            ✓ Enemy Defeated! ({battle.enemiesDefeated + 1}/{quest.targetCount})
          </div>
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'BATTLE_NEXT_ENEMY' })}>
            Next Enemy →
          </button>
        </div>
      )}

      {isVictory && questDone && (
        <div className="card">
          <div className="text-bold text-gold" style={{ marginBottom: '8px' }}>
            🏆 Quest Complete!
          </div>
          <div className="text-small" style={{ marginBottom: '8px' }}>
            Reward: +{quest.reward.exp} EXP, +{quest.reward.ryo} Ryo
          </div>
          <button className="btn btn-success" onClick={() => dispatch({ type: 'COLLECT_QUEST_REWARD' })}>
            Collect Reward
          </button>
        </div>
      )}

      {isDefeat && (
        <div className="card">
          <div className="text-bold text-red" style={{ marginBottom: '8px' }}>
            💀 You were defeated...
          </div>
          <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>
            Return to HUB
          </button>
        </div>
      )}
    </div>
  );
}
