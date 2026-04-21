import { useEffect, useRef, useState } from 'react';
import { useGame } from '../gameStore';
import { BLOODLINES, ITEMS, QUESTS, SKILLS } from '../constants';
import { calcPlayerMaxHp, getSkillMasteryLevel, getEffectiveSkill } from '../gameLogic';

const ELEMENT_EMOJI: Record<string, string> = {
  FIRE: '🔥', WATER: '💧', LIGHTNING: '⚡', EARTH: '🌍', WIND: '🌀',
};

export function CombatScreen() {
  const { state, dispatch } = useGame();
  const { battle } = state;
  const logRef = useRef<HTMLDivElement>(null);

  const [playerHit, setPlayerHit] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const prevPlayerHpRef = useRef<number | null>(null);
  const prevEnemyHpRef = useRef<number | null>(null);

  useEffect(() => {
    if (!battle) return;
    const prevPlayerHp = prevPlayerHpRef.current;
    const prevEnemyHp = prevEnemyHpRef.current;

    // Update refs before setting animation state to avoid stale comparisons
    prevPlayerHpRef.current = battle.player.stats.hp;
    prevEnemyHpRef.current = battle.enemy.currentHp;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    if (prevPlayerHp !== null && battle.player.stats.hp < prevPlayerHp) {
      setPlayerHit(true);
      timeouts.push(setTimeout(() => setPlayerHit(false), 500));
    }
    if (prevEnemyHp !== null && battle.enemy.currentHp < prevEnemyHp) {
      setEnemyHit(true);
      timeouts.push(setTimeout(() => setEnemyHit(false), 500));
    }
    return () => timeouts.forEach(t => clearTimeout(t));
  }, [battle?.player.stats.hp, battle?.enemy.currentHp]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battle?.battleLog]);

  if (!battle) {
    return <div className="screen"><div className="card">戦闘がありません。</div></div>;
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
  const isQuestComplete = battle.phase === 'QUEST_COMPLETE';

  return (
    <div className="screen">
      <div className="header-bar">
        <span className="text-gold">{quest.name}</span>
        <span className="text-small text-gray">
          {battle.enemiesDefeated}/{quest.targetCount} 撃破 | ターン {battle.turnNumber}
        </span>
      </div>

      {/* Combat Display */}
      <div className="card">
        <div className="combat-header">
          {/* Player */}
          <div className={playerHit ? 'combat-hit-flash' : ''}>
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
                <span className="text-blue text-small">Chakra</span>
                <span className="text-small">{player.stats.md}/{player.stats.maxMd}</span>
              </div>
              <div className="hp-bar"><div className="hp-bar-fill md-fill" style={{ width: `${mdPct}%` }} /></div>
            </div>
            {player.activeBuffs && player.activeBuffs.length > 0 && (
              <div className="flex-row" style={{ marginTop: '4px', flexWrap: 'wrap', gap: '4px' }}>
                {player.activeBuffs.map((buff, i) => (
                  <span key={i} className="buff-badge">
                    {ITEMS[buff.itemId]?.name ?? buff.itemId} ({buff.remainingTurns}t)
                  </span>
                ))}
              </div>
            )}
            {battle.playerStatusEffects && battle.playerStatusEffects.length > 0 && (
              <div className="flex-row" style={{ marginTop: '4px', flexWrap: 'wrap', gap: '4px' }}>
                {battle.playerStatusEffects.map((effect, i) => (
                  effect.type === 'ATK_DOWN' && (
                    <span key={i} className="debuff-badge">
                      💜 攻擊↓{Math.round((effect.atkDebuffPercent ?? 0) * 100)}% ({effect.remainingTurns}t)
                    </span>
                  )
                ))}
              </div>
            )}
          </div>

          <div className="vs-text">VS</div>

          {/* Enemy */}
          <div style={{ textAlign: 'right' }} className={enemyHit ? 'combat-hit-flash' : ''}>
            <div className="text-bold" style={{ marginBottom: '6px' }}>
              {enemy.definition.name}
              {enemy.definition.element && <span className="text-small"> {ELEMENT_EMOJI[enemy.definition.element]}</span>}
              {enemy.statusEffects.find(e => e.type === 'BURN') && <span className="text-red"> 🔥</span>}
              {enemy.isGuarding && <span className="text-blue"> 🛡</span>}
              {enemy.chargeReady && <span className="text-gold"> ⚡</span>}
              {enemy.definition.specialAbility === 'HEAL' && <span className="text-green"> 💚</span>}
              {enemy.definition.specialAbility === 'MULTI_HIT' && <span className="text-gold"> ⚡⚡</span>}
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
          <div className="card-title">行動</div>
          <div className="combat-actions">
            <button className="btn btn-primary" disabled={!canAct} onClick={() => dispatch({ type: 'BATTLE_ATTACK' })}>
              ⚔ 攻撃
            </button>
            <button
              className="btn"
              disabled={!canAct || !player.unlockedMode}
              onClick={() => dispatch({ type: 'BATTLE_TOGGLE_MODE' })}
            >
              {player.isInMode
                ? '⚡ 關閉仙人模式'
                : battle.modeCooldown > 0
                  ? `⚡ 仙人模式 (CD: ${battle.modeCooldown}t)`
                  : '⚡ 啟動仙人模式'}
            </button>
            {availableSkills.map(skill => {
              const cd = battle.skillCooldowns.find(c => c.skillId === skill.id);
              const skillMastery = player.skillMasteries?.[skill.id] ?? 0;
              const masteryLevel = getSkillMasteryLevel(skillMastery);
              const effectiveSkill = getEffectiveSkill(skill.id, masteryLevel);
              const tierLabel = masteryLevel === 3 ? ' [奥義]' : masteryLevel === 2 ? ' [改]' : '';
              const onCd = cd && cd.remainingTurns > 0;
              const noMd = player.stats.md < effectiveSkill.mdCost;
              const noHp = player.stats.hp <= effectiveSkill.hpCost;
              const tooLowLevel = player.stats.level < skill.requiredLevel;
              return (
                <button
                  key={skill.id}
                  className={`btn${activeSkillId === skill.id ? ' skill-active' : ''}${masteryLevel === 3 ? ' skill-ougi' : ''}`}
                  disabled={!canAct || !!onCd || noMd || noHp || tooLowLevel}
                  onClick={() => {
                    setActiveSkillId(skill.id);
                    setTimeout(() => setActiveSkillId(null), 600);
                    dispatch({ type: 'BATTLE_SKILL', skillId: skill.id });
                  }}
                  title={effectiveSkill.description}
                >
                  ✨ {effectiveSkill.name}{tierLabel}
                  {tooLowLevel
                    ? ` (LV${skill.requiredLevel})`
                    : onCd
                      ? ` (${cd!.remainingTurns}t)`
                      : ` (${effectiveSkill.mdCost}Chakra${effectiveSkill.hpCost > 0 ? `+${effectiveSkill.hpCost}HP` : ''})`}
                </button>
              );
            })}
            <button className="btn btn-danger" onClick={() => dispatch({ type: 'BATTLE_RUN' })}>
              🏃 逃跑
            </button>
            {canAct && player.inventory && player.inventory.filter(inv => ITEMS[inv.itemId]?.usableInCombat && inv.quantity > 0).length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="text-small text-gray" style={{ marginBottom: '4px' }}>🎒 道具</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {player.inventory.filter(inv => ITEMS[inv.itemId]?.usableInCombat && inv.quantity > 0).map(inv => (
                    <button key={inv.itemId} className="btn" style={{ fontSize: '0.8rem' }}
                      onClick={() => dispatch({ type: 'BATTLE_USE_ITEM', itemId: inv.itemId })}
                    >
                      {ITEMS[inv.itemId].name} ×{inv.quantity}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Victory – more enemies remain */}
      {isVictory && !isQuestComplete && (
        <div className="card">
          <div className="text-bold text-gold" style={{ marginBottom: '8px' }}>
            ✓ 敵人擊敗！({battle.enemiesDefeated + 1}/{quest.targetCount})
          </div>
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'BATTLE_NEXT_ENEMY' })}>
            下一個敵人 →
          </button>
        </div>
      )}

      {/* Quest fully complete */}
      {isQuestComplete && (
        <div className="card">
          <div className="text-bold text-gold" style={{ marginBottom: '8px' }}>
            🏆 任務完成！
          </div>
          <div className="text-small" style={{ marginBottom: '8px' }}>
            獎勵：+{quest.reward.exp} EXP, +{quest.reward.ryo} Ryo
          </div>
          <button className="btn btn-success" onClick={() => dispatch({ type: 'COLLECT_QUEST_REWARD' })}>
            領取獎勵
          </button>
        </div>
      )}

      {isDefeat && (
        <div className="card">
          <div className="text-bold text-red" style={{ marginBottom: '8px' }}>
            💀 你被擊敗了…
          </div>
          <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>
            返回據點
          </button>
        </div>
      )}
    </div>
  );
}
