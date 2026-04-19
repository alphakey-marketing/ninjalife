import { useGame } from '../gameStore';
import { BLOODLINES, EXP_PER_LEVEL, SKILLS } from '../constants';
import { calcPlayerAtk, calcPlayerDef, calcPlayerMaxHp } from '../gameLogic';

export function StatusScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;
  const equipped = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  const effAtk = calcPlayerAtk(player);
  const effDef = calcPlayerDef(player);
  const effMaxHp = calcPlayerMaxHp(player);

  const availableSkills = equipped ? equipped.skillIds.map(id => SKILLS[id]) : [];

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← Back</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>📊 Status</span>
        <span className={`rank-badge rank-${player.rank}`}>Rank {player.rank}</span>
      </div>

      {/* Core Stats */}
      <div className="card">
        <div className="card-title">Core Stats</div>
        <div className="stat-row"><span className="stat-label">Level</span><span className="stat-value">{player.stats.level} / 30</span></div>
        <div className="stat-row"><span className="stat-label">EXP</span><span className="stat-value">{player.stats.exp} / {player.stats.level < 30 ? EXP_PER_LEVEL(player.stats.level) : 'MAX'}</span></div>
        <div className="stat-row"><span className="stat-label">HP</span><span className="stat-value">{player.stats.hp} / {effMaxHp}</span></div>
        <div className="stat-row"><span className="stat-label">MD</span><span className="stat-value">{player.stats.md} / {player.stats.maxMd}</span></div>
        <div className="stat-row"><span className="stat-label">ATK (base)</span><span className="stat-value">{player.stats.atk}</span></div>
        <div className="stat-row"><span className="stat-label">ATK (effective)</span><span className="stat-value-gold">{effAtk.toFixed(1)}</span></div>
        <div className="stat-row"><span className="stat-label">DEF (base)</span><span className="stat-value">{player.stats.def}</span></div>
        <div className="stat-row"><span className="stat-label">DEF (effective)</span><span className="stat-value-gold">{effDef.toFixed(1)}</span></div>
        <div className="stat-row"><span className="stat-label">SPD</span><span className="stat-value">{player.stats.spd}</span></div>
        <div className="stat-row"><span className="stat-label">Ryo</span><span className="stat-value-gold">{player.ryo} 💰</span></div>
      </div>

      {/* Stat Points */}
      {player.statPoints.unspent > 0 && (
        <div className="card">
          <div className="card-title">⬆ Allocate Stat Points ({player.statPoints.unspent} available)</div>
          <div className="flex-col">
            <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="text-bold">STR (Strength) → +2 ATK</div>
                <div className="text-small text-gray">Current: {player.statPoints.str} allocated</div>
              </div>
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'ALLOCATE_STAT', stat: 'str' })}>
                + Allocate
              </button>
            </div>
            <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="text-bold">VIT (Vitality) → +20 Max HP</div>
                <div className="text-small text-gray">Current: {player.statPoints.vit} allocated</div>
              </div>
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'ALLOCATE_STAT', stat: 'vit' })}>
                + Allocate
              </button>
            </div>
            <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="text-bold">FOC (Focus) → +10 Max MD</div>
                <div className="text-small text-gray">Current: {player.statPoints.foc} allocated</div>
              </div>
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'ALLOCATE_STAT', stat: 'foc' })}>
                + Allocate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bloodline */}
      <div className="card">
        <div className="card-title">🩸 Bloodline</div>
        {equipped ? (
          <>
            <div className={`rarity-${equipped.rarity.toLowerCase()} text-bold`}>{equipped.name} [{equipped.rarity}]</div>
            <div className="text-small text-gray" style={{ marginTop: '4px' }}>{equipped.description}</div>
            <div className="text-small" style={{ marginTop: '8px' }}>
              <span className="text-gray">Passive: </span>
              {equipped.passive.atkMultiplier && <span>ATK ×{equipped.passive.atkMultiplier} </span>}
              {equipped.passive.hpMultiplier && <span>HP ×{equipped.passive.hpMultiplier} </span>}
              {equipped.passive.critChanceBonus && <span>Crit +{(equipped.passive.critChanceBonus * 100).toFixed(0)}% </span>}
            </div>
          </>
        ) : (
          <div className="text-gray">No bloodline equipped.</div>
        )}
      </div>

      {/* Skills */}
      {availableSkills.length > 0 && (
        <div className="card">
          <div className="card-title">✨ Skills</div>
          {availableSkills.map(skill => (
            <div key={skill.id} style={{ marginBottom: '10px', padding: '8px', border: '1px solid #2a2a3a', borderRadius: '4px' }}>
              <div className="text-bold">{skill.name}</div>
              <div className="text-small text-gray">{skill.description}</div>
              <div className="flex-row text-small" style={{ marginTop: '4px' }}>
                {skill.mdCost > 0 && <span className="text-blue">MD: {skill.mdCost}</span>}
                {skill.hpCost > 0 && <span className="text-red">HP: {skill.hpCost}</span>}
                <span className="text-gray">CD: {skill.cooldownTurn}t</span>
                {skill.effects.damageMultiplier && <span className="text-gold">DMG: ×{skill.effects.damageMultiplier}</span>}
                {skill.effects.burnChance && <span className="text-red">Burn: {(skill.effects.burnChance * 100).toFixed(0)}%</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rank Info */}
      <div className="card">
        <div className="card-title">🏆 Rank</div>
        <div className="stat-row"><span className="stat-label">Current Rank</span><span className={`rank-badge rank-${player.rank}`}>Rank {player.rank}</span></div>
        <div className="stat-row"><span className="stat-label">ATK Multiplier</span><span className="stat-value-gold">×{player.rankBonus.baseAtkMultiplier}</span></div>
        <div className="stat-row"><span className="stat-label">Spin Rarity Bonus</span><span className="stat-value-gold">+{(player.rankBonus.spinRarityBonus * 100).toFixed(0)}%</span></div>
        {player.rank !== 'C' && (
          <div className="stat-row">
            <span className="stat-label">Rank Up Condition</span>
            <span className="text-small">LV30 + BOSS clear</span>
          </div>
        )}
        <div className="stat-row">
          <span className="stat-label">Boss Cleared</span>
          <span className={player.bossDefeatedThisRank ? 'text-green' : 'text-red'}>
            {player.bossDefeatedThisRank ? '✓ Yes' : '✗ No'}
          </span>
        </div>
      </div>
    </div>
  );
}
