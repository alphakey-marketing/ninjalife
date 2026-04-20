import { useGame } from '../gameStore';
import { BLOODLINES, EXP_PER_LEVEL, getLevelCapForRank, QUESTS, RANK_DISPLAY } from '../constants';
import { canRankUp, calcPlayerMaxHp, getTodayString } from '../gameLogic';

export function HubScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;
  const equipped = player.equippedBloodlineId ? BLOODLINES[player.equippedBloodlineId] : null;
  const maxHp = calcPlayerMaxHp(player);
  const levelCap = getLevelCapForRank(player.rank);
  const expNeeded = player.stats.level < levelCap ? EXP_PER_LEVEL(player.stats.level) : 0;
  const hpPct = Math.max(0, Math.min(100, (player.stats.hp / maxHp) * 100));
  const mdPct = Math.max(0, Math.min(100, (player.stats.md / player.stats.maxMd) * 100));
  const expPct = expNeeded > 0 ? Math.max(0, Math.min(100, (player.stats.exp / expNeeded) * 100)) : 100;
  const staminaPct = Math.max(0, Math.min(100, (player.stamina / player.maxStamina) * 100));

  const todayStr = getTodayString();
  const dailyQuests = QUESTS.filter(q => q.requiredRank === player.rank && q.repeatType === 'DAILY');
  const completedToday = dailyQuests.filter(q => {
    const ts = player.questResetTimestamps?.[q.id];
    return ts !== undefined && new Date(ts).toISOString().slice(0, 10) === todayStr;
  }).length;

  return (
    <div className="screen">
      {/* Header */}
      <div className="header-bar">
        <span className="game-title">🥷 Ninja Life</span>
        <div className="flex-row">
          <span className={`rank-badge rank-${player.rank}`}>{RANK_DISPLAY[player.rank]}</span>
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
              <span className="text-blue">Chakra</span>
              <span>{player.stats.md} / {player.stats.maxMd}</span>
            </div>
            <div className="hp-bar">
              <div className="hp-bar-fill md-fill" style={{ width: `${mdPct}%` }} />
            </div>
          </div>
          <div className="hp-bar-container">
            <div className="hp-bar-label">
              <span className="text-orange">精力</span>
              <span>{player.stamina} / {player.maxStamina}</span>
            </div>
            <div className="hp-bar">
              <div className="hp-bar-fill stamina-fill" style={{ width: `${staminaPct}%` }} />
            </div>
          </div>
          {player.stats.level < levelCap && (
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
          {player.stats.level >= levelCap && (
            <div className="stat-row">
              <span className="stat-label">Level</span>
              <span className="stat-value-gold">MAX ({levelCap})</span>
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
        <div className="card-title">🩸 血繼限界 (Kekkei Genkai)</div>
        {equipped ? (
          <div className="flex-row">
            <span className={`rarity-${equipped.rarity.toLowerCase()}`}>◆ {equipped.name}</span>
            <span className="text-small text-gray">[{equipped.rarity}]</span>
            {player.isInMode && <span className="mode-active">⚡ 仙人模式</span>}
          </div>
        ) : (
          <span className="text-gray">尚未裝備血繼限界。前往 SPIN 取得！</span>
        )}
        {player.unlockedMode && !player.isInMode && (
          <div className="text-small text-gray" style={{ marginTop: '4px' }}>仙人模式已解鎖（可在戰鬥中啟動）</div>
        )}
      </div>

      {/* Daily Quest Summary */}
      <div className="card">
        <div className="flex-row" style={{ justifyContent: 'space-between' }}>
          <span className="text-small">📅 今日任務：</span>
          <span className="text-small text-gold">{completedToday}/{dailyQuests.length} 完成</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="card">
        <div className="card-title">🗺 導航</div>
        <div className="nav-buttons">
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'QUEST' })}>
            ⚔ 任務
          </button>
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'SPIN' })}>
            🌀 血繼轉盤
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'STATUS' })}>
            📊 狀態
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'CLINIC' })}>
            🏥 診療所
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'SHOP' })}>
            🛒 商店
          </button>
          {canRankUp(player) && (
            <button className="btn btn-success" onClick={() => dispatch({ type: 'RANK_UP' })}>
              ⬆ 晉升！
            </button>
          )}
        </div>
      </div>

      {/* Save/Load */}
      <div className="flex-row">
        <button className="btn text-small" onClick={() => dispatch({ type: 'SAVE_GAME' })}>💾 儲存</button>
        <button className="btn text-small" onClick={() => dispatch({ type: 'LOAD_GAME' })}>📂 讀取</button>
      </div>
    </div>
  );
}
