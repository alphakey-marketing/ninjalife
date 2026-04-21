import { useGame } from '../gameStore';
import { BLOODLINES, ELEMENT_EMOJI, EXP_PER_LEVEL, getLevelCapForRank, RANK_DISPLAY, SKILLS } from '../constants';
import { calcMdRegen, calcPlayerAtk, calcPlayerDef, calcPlayerMaxHp, calcPlayerSpd, getSkillMasteryLevel, getEffectiveSkill } from '../gameLogic';

export function StatusScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;
  const equipped = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  const equippedMastery = player.ownedBloodlines.find(b => b.id === player.equippedBloodlineId)?.mastery ?? 0;
  const effAtk = calcPlayerAtk(player);
  const effDef = calcPlayerDef(player);
  const effMaxHp = calcPlayerMaxHp(player);
  const effSpd = calcPlayerSpd(player);
  const mdRegen = calcMdRegen(player);

  const availableSkills = equipped ? equipped.skillIds.map(id => SKILLS[id]).filter(Boolean) : [];

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← 戻る</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>📊 ステータス</span>
        <span className={`rank-badge rank-${player.rank}`}>{RANK_DISPLAY[player.rank]}</span>
      </div>

      {/* Core Stats */}
      <div className="card">
        <div className="card-title">基本ステータス</div>
        <div className="stat-row"><span className="stat-label">レベル</span><span className="stat-value">{player.stats.level} / {getLevelCapForRank(player.rank)}</span></div>
        <div className="stat-row"><span className="stat-label">経験値</span><span className="stat-value">{player.stats.exp} / {player.stats.level < getLevelCapForRank(player.rank) ? EXP_PER_LEVEL(player.stats.level) : 'MAX'}</span></div>
        <div className="stat-row"><span className="stat-label">HP</span><span className="stat-value">{player.stats.hp} / {effMaxHp}</span></div>
        <div className="stat-row"><span className="stat-label">チャクラ</span><span className="stat-value">{player.stats.md} / {player.stats.maxMd}</span></div>
        <div className="stat-row"><span className="stat-label">チャクラ回復/ターン</span><span className="stat-value-gold">+{mdRegen}</span></div>
        <div className="stat-row"><span className="stat-label">ATK（基本）</span><span className="stat-value">{player.stats.atk}</span></div>
        <div className="stat-row"><span className="stat-label">ATK（実効）</span><span className="stat-value-gold">{effAtk.toFixed(1)}</span></div>
        <div className="stat-row"><span className="stat-label">DEF（基本）</span><span className="stat-value">{player.stats.def}</span></div>
        <div className="stat-row"><span className="stat-label">DEF（実効）</span><span className="stat-value-gold">{effDef.toFixed(1)}</span></div>
        <div className="stat-row"><span className="stat-label">SPD（実効）</span><span className="stat-value-gold">{effSpd}</span></div>
        <div className="stat-row"><span className="stat-label">Ryo（両）</span><span className="stat-value-gold">{player.ryo} 💰</span></div>
      </div>

      {/* Stat Points */}
      {player.statPoints.unspent > 0 && (
        <div className="card">
          <div className="card-title">⬆ スタットポイント配分（{player.statPoints.unspent}ポイント残り）</div>
          <div className="flex-col">
            <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="text-bold">STR（力）→ ATK+2</div>
                <div className="text-small text-gray">現在：{player.statPoints.str}ポイント配分済み</div>
              </div>
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'ALLOCATE_STAT', stat: 'str' })}>
                + 配分
              </button>
            </div>
            <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="text-bold">VIT（体力）→ 最大HP+20</div>
                <div className="text-small text-gray">現在：{player.statPoints.vit}ポイント配分済み</div>
              </div>
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'ALLOCATE_STAT', stat: 'vit' })}>
                + 配分
              </button>
            </div>
            <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="text-bold">FOC（集中）→ 最大チャクラ+10</div>
                <div className="text-small text-gray">現在：{player.statPoints.foc}ポイント配分済み</div>
              </div>
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'ALLOCATE_STAT', stat: 'foc' })}>
                + 配分
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bloodline */}
      <div className="card">
        <div className="card-title">🩸 血繼限界 (Kekkei Genkai)</div>
        {equipped ? (
          <>
            <div className={`rarity-${equipped.rarity.toLowerCase()} text-bold`}>
              {equipped.name} [{equipped.rarity}]
              {equipped.element && <span> {ELEMENT_EMOJI[equipped.element]}</span>}
              {equippedMastery > 1 && <span className="text-gold"> ★{equippedMastery}</span>}
            </div>
            <div className="text-small text-gray" style={{ marginTop: '4px' }}>{equipped.description}</div>
            <div className="text-small" style={{ marginTop: '8px' }}>
              <span className="text-gray">パッシブ: </span>
              {equipped.passive.atkMultiplier && (
                <span>ATK ×{(equipped.passive.atkMultiplier + Math.max(0, equippedMastery - 1) * 0.02).toFixed(2)} </span>
              )}
              {equipped.passive.hpMultiplier && <span>HP ×{equipped.passive.hpMultiplier} </span>}
              {equipped.passive.critChanceBonus && (
                <span>クリティカル +{((equipped.passive.critChanceBonus + Math.max(0, equippedMastery - 1) * 0.02) * 100).toFixed(0)}% </span>
              )}
              {equipped.passive.defMultiplier && (
                <span>DEF ×{(equipped.passive.defMultiplier + Math.max(0, equippedMastery - 1) * 0.02).toFixed(2)} </span>
              )}
              {equipped.passive.spdBonus && (
                <span>SPD +{equipped.passive.spdBonus + Math.max(0, equippedMastery - 1)} </span>
              )}
              {equipped.passive.mdRegenBonus && (
                <span>Chakra回復 +{equipped.passive.mdRegenBonus + Math.max(0, equippedMastery - 1)} </span>
              )}
              {equippedMastery > 1 && <span className="text-gold">（習熟度 {equippedMastery}）</span>}
            </div>
          </>
        ) : (
          <div className="text-gray">血継限界が装備されていません。</div>
        )}
      </div>

      {/* Skills */}
      {availableSkills.length > 0 && (
        <div className="card">
          <div className="card-title">✨ 術</div>
          {availableSkills.map(skill => {
            const skillMastery = player.skillMasteries?.[skill.id] ?? 0;
            const masteryLevel = getSkillMasteryLevel(skillMastery);
            const effectiveSkill = getEffectiveSkill(skill.id, masteryLevel);
            const tierLabel = masteryLevel === 3 ? ' [奥義]' : masteryLevel === 2 ? ' [改]' : '';
            const nextThreshold = masteryLevel === 1 ? 20 : masteryLevel === 2 ? 60 : 60;
            const masteryPct = Math.min(100, (skillMastery / nextThreshold) * 100);
            return (
              <div key={skill.id} style={{ marginBottom: '10px', padding: '8px', border: `1px solid ${masteryLevel === 3 ? '#f0a030' : masteryLevel === 2 ? '#4488ff' : '#2a2a3a'}`, borderRadius: '4px' }}>
                <div className="text-bold">
                  {effectiveSkill.name}{tierLabel}
                  {player.stats.level < skill.requiredLevel && (
                    <span className="text-red text-small"> 🔒 LV{skill.requiredLevel}</span>
                  )}
                </div>
                <div className="text-small text-gray">{effectiveSkill.description}</div>
                <div className="flex-row text-small" style={{ marginTop: '4px' }}>
                  {effectiveSkill.mdCost > 0 && <span className="text-blue">Chakra: {effectiveSkill.mdCost}</span>}
                  {effectiveSkill.hpCost > 0 && <span className="text-red">HP: {effectiveSkill.hpCost}</span>}
                  <span className="text-gray">CD: {effectiveSkill.cooldownTurn}t</span>
                  {(effectiveSkill.effects.damageMultiplier ?? 0) > 0 && <span className="text-gold">ダメージ: ×{effectiveSkill.effects.damageMultiplier}</span>}
                  {effectiveSkill.effects.healSelfPercent && <span className="text-green">回復: {(effectiveSkill.effects.healSelfPercent * 100).toFixed(0)}%HP</span>}
                  {effectiveSkill.effects.mdRestore && <span className="text-blue">回復: {effectiveSkill.effects.mdRestore}Chakra</span>}
                  {effectiveSkill.effects.burnChance && <span className="text-red">炎上: {(effectiveSkill.effects.burnChance * 100).toFixed(0)}%</span>}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <div className="text-small text-gray">習熟度: {skillMastery} {masteryLevel < 3 ? `/ ${nextThreshold}` : '(MAX)'}</div>
                  <div style={{ background: '#1a1a2e', borderRadius: '2px', height: '4px', marginTop: '2px' }}>
                    <div style={{ background: masteryLevel === 3 ? '#f0a030' : '#4488ff', width: `${masteryPct}%`, height: '100%', borderRadius: '2px', transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rank Info */}
      <div className="card">
        <div className="card-title">🏆 忍者ランク</div>
        <div className="stat-row"><span className="stat-label">現在のランク</span><span className={`rank-badge rank-${player.rank}`}>{RANK_DISPLAY[player.rank]}</span></div>
        <div className="stat-row"><span className="stat-label">ATK倍率</span><span className="stat-value-gold">×{player.rankBonus.baseAtkMultiplier}</span></div>
        <div className="stat-row"><span className="stat-label">スピンレアリティボーナス</span><span className="stat-value-gold">+{(player.rankBonus.spinRarityBonus * 100).toFixed(0)}%</span></div>
        {player.rank !== 'C' && (
          <div className="stat-row">
            <span className="stat-label">ランクアップ条件</span>
            <span className="text-small">LV{getLevelCapForRank(player.rank)} + BOSS撃破</span>
          </div>
        )}
        <div className="stat-row">
          <span className="stat-label">BOSS撃破</span>
          <span className={player.bossDefeatedThisRank ? 'text-green' : 'text-red'}>
            {player.bossDefeatedThisRank ? '✓ 撃破済み' : '✗ 未撃破'}
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">完了したクエスト数</span>
          <span className="stat-value">{player.completedQuestIds.length}</span>
        </div>
      </div>
    </div>
  );
}
