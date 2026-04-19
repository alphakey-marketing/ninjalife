import { useGame } from '../gameStore';
import { canRankUp, calcPlayerMaxHp } from '../gameLogic';
import { BLOODLINES, EXP_PER_LEVEL } from '../constants';

export function HubScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;
  const equipped = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  const maxHp = calcPlayerMaxHp(player);
  const expNeeded = player.stats.level < 30 ? EXP_PER_LEVEL(player.stats.level) : 0;
  const hpPct = Math.max(0, Math.min(100, (player.stats.hp / maxHp) * 100));
  const mdPct = Math.max(0, Math.min(100, (player.stats.md / player.stats.maxMd) * 100));
  const expPct = expNeeded > 0 ? Math.max(0, Math.min(100, (player.stats.exp / expNeeded) * 100)) : 100;

  return (
    <div className="screen">
      {/* Header */}
      <div className="header-bar">
        <span className="game-title">⚔ Ninja Life</span>
        <div className="flex-row">
          <span className={`rank-badge rank-${player.rank}`}>Rank {player.rank}</span>
          <span className="text-gold">💰 {player.ryo} Ryo</span>
        </div>
      </div>

      {/* Player Stats */}
      <div className="card">
        <div className="card-title">👤 {player.name}</div>
        <div className="progress-section">
          <div className="hp-bar-container">
            <div className="hp-bar-label">
              <span className="text-red">HP</span>
              <span>{player.stats.hp} / {maxHp}</span>
            </div>
            <div className="hp-bar">
              <div className="hp-bar-fill hp-fill" style={{ width: `${hpPct}%` }} />
            </div>
          </div>
          <div className="hp-bar-container">
            <div className="hp-bar-label">
              <span className="text-blue">MD</span>
              <span>{player.stats.md} / {player.stats.maxMd}</span>
            </div>
            <div className="hp-bar">
              <div className="hp-bar-fill md-fill" style={{ width: `${mdPct}%` }} />
            </div>
          </div>
          {player.stats.level < 30 && (
            <div className="hp-bar-container">
              <div className="hp-bar-label">
                <span className="text-green">EXP (LV{player.stats.level})</span>
                <span>{player.stats.exp} / {expNeeded}</span>
              </div>
              <div className="hp-bar">
                <div className="hp-bar-fill exp-fill" style={{ width: `${expPct}%` }} />
              </div>
            </div>
          )}
          {player.stats.level >= 30 && (
            <div className="stat-row">
              <span className="stat-label">Level</span>
              <span className="stat-value-gold">MAX (30)</span>
            </div>
          )}
        </div>

        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <div className="stat-row"><span className="stat-label">ATK</span><span className="stat-value">{player.stats.atk}</span></div>
          <div className="stat-row"><span className="stat-label">DEF</span><span className="stat-value">{player.stats.def}</span></div>
          <div className="stat-row"><span className="stat-label">SPD</span><span className="stat-value">{player.stats.spd}</span></div>
          {player.statPoints.unspent > 0 && (
            <div className="stat-row"><span className="stat-label text-gold">Points</span><span className="stat-value-gold">{player.statPoints.unspent}✨</span></div>
          )}
        </div>
      </div>

      {/* Bloodline */}
      <div className="card">
        <div className="card-title">🩸 Bloodline</div>
        {equipped ? (
          <div className="flex-row">
            <span className={`rarity-${equipped.rarity.toLowerCase()}`}>◆ {equipped.name}</span>
            <span className="text-small text-gray">[{equipped.rarity}]</span>
            {player.isInMode && <span className="mode-active">⚡ MODE ACTIVE</span>}
          </div>
        ) : (
          <span className="text-gray">No bloodline equipped. Visit SPIN to get one!</span>
        )}
        {player.unlockedMode && !player.isInMode && (
          <div className="text-small text-gray" style={{ marginTop: '4px' }}>Mode unlocked (activate in combat)</div>
        )}
      </div>

      {/* Navigation */}
      <div className="card">
        <div className="card-title">🗺 Navigation</div>
        <div className="nav-buttons">
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'QUEST' })}>
            ⚔ Quests
          </button>
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'SPIN' })}>
            🌀 SPIN
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'STATUS' })}>
            📊 Status
          </button>
          {canRankUp(player) && (
            <button className="btn btn-success" onClick={() => dispatch({ type: 'RANK_UP' })}>
              ⬆ Rank Up!
            </button>
          )}
        </div>
      </div>

      {/* Save/Load */}
      <div className="flex-row">
        <button className="btn text-small" onClick={() => dispatch({ type: 'SAVE_GAME' })}>💾 Save</button>
        <button className="btn text-small" onClick={() => dispatch({ type: 'LOAD_GAME' })}>📂 Load</button>
      </div>
    </div>
  );
}
