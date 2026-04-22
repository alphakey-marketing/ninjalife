import { useGame } from '../gameStore';
import { BLOODLINES, EXP_PER_LEVEL, GEAR, getLevelCapForRank, RANK_DISPLAY, STAMINA_RECOVERY_INTERVAL_MS, STAMINA_RECOVERY_AMOUNT } from '../constants';
import { canRankUp, calcPlayerMaxHp } from '../gameLogic';

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

  const now = Date.now();
  const nextRecovery = (player.lastStaminaRecovery ?? now) + STAMINA_RECOVERY_INTERVAL_MS;
  const secsUntil = Math.max(0, Math.ceil((nextRecovery - now) / 1000));
  const minsUntil = Math.floor(secsUntil / 60);
  const secsLeft = secsUntil % 60;
  const recoveryLabel = player.stamina >= player.maxStamina
    ? 'スタミナ満タン'
    : `${minsUntil}分${String(secsLeft).padStart(2, '0')}秒後に +${STAMINA_RECOVERY_AMOUNT}`;

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
              <span className="text-orange">スタミナ</span>
              <span>{player.stamina} / {player.maxStamina} <span className="text-small text-gray">({recoveryLabel})</span></span>
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
        <div className="card-title">🩸 <ruby>血継限界<rt>けっけいげんかい</rt></ruby> (Kekkei Genkai)</div>
        {equipped ? (
          <div className="flex-row">
            <span className={`rarity-${equipped.rarity.toLowerCase()}`}>◆ {equipped.name}</span>
            <span className="text-small text-gray">[{equipped.rarity}]</span>
            {player.isInMode && <span className="mode-active">⚡ <ruby>仙人<rt>せんにん</rt></ruby>モード</span>}
          </div>
        ) : (
          <span className="text-gray"><ruby>血継限界<rt>けっけいげんかい</rt></ruby>が<ruby>未装備<rt>みそうび</rt></ruby>。SPINで<ruby>入手<rt>にゅうしゅ</rt></ruby>せよ！</span>
        )}
        {player.unlockedMode && !player.isInMode && (
          <div className="text-small text-gray" style={{ marginTop: '4px' }}><ruby>仙人<rt>せんにん</rt></ruby>モード<ruby>解放済<rt>かいほうずみ</rt></ruby>み（<ruby>戦闘中<rt>せんとうちゅう</rt></ruby>に<ruby>発動<rt>はつどう</rt></ruby>可能）</div>
        )}
      </div>

      {/* Gear Summary */}
      <div className="card">
        <div className="card-title">🗡 <ruby>装備<rt>そうび</rt></ruby></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
          {(['weapon', 'armor', 'accessory'] as const).map(slot => {
            const gearId = player.equippedGear?.[slot] ?? null;
            const gear = gearId ? GEAR[gearId] : null;
            return (
              <div key={slot} className="text-small" style={{ textAlign: 'center', padding: '4px', border: '1px solid #2a2a3a', borderRadius: '4px' }}>
                <div className="text-gray" style={{ marginBottom: '2px' }}>
                  {slot === 'weapon' ? '⚔' : slot === 'armor' ? '🛡' : '💍'}
                </div>
                {gear ? (
                  <span className={`rarity-${gear.rarity.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>{gear.name}</span>
                ) : (
                  <span className="text-gray" style={{ fontSize: '0.7rem' }}>—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="card">
        <div className="card-title">🗺 <ruby>ナビ<rt></rt></ruby></div>
        <div className="nav-buttons">
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'QUEST' })}>
            ⚔ <ruby>任務<rt>にんむ</rt></ruby>
          </button>
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'SPIN' })}>
            🌀 <ruby>血継<rt>けっけい</rt></ruby>ガチャ
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'STATUS' })}>
            📊 ステータス
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'CLINIC' })}>
            🏥 <ruby>診療所<rt>しんりょうじょ</rt></ruby>
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'SHOP' })}>
            🛒 <ruby>商店<rt>しょうてん</rt></ruby>
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'GEAR' })}>
            🗡 <ruby>装備<rt>そうび</rt></ruby>
          </button>
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'MAP' })}>
            🗺 <ruby>ワールドマップ<rt></rt></ruby>
          </button>
          {canRankUp(player) && (
            <button className="btn btn-success" onClick={() => dispatch({ type: 'RANK_UP' })}>
              ⬆ <ruby>昇進<rt>しょうしん</rt></ruby>！
            </button>
          )}
        </div>
      </div>

      {/* Save/Load */}
      <div className="flex-row">
        <button className="btn text-small" onClick={() => dispatch({ type: 'SAVE_GAME' })}>💾 セーブ</button>
        <button className="btn text-small" onClick={() => dispatch({ type: 'LOAD_GAME' })}>📂 ロード</button>
      </div>
    </div>
  );
}
