import { useGame } from '../gameStore';
import { CLINIC_COSTS } from '../constants';
import { calcPlayerMaxHp, getTodayString } from '../gameLogic';

export function ClinicScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;
  const maxHp = calcPlayerMaxHp(player);
  const hpPct = Math.max(0, Math.min(100, (player.stats.hp / maxHp) * 100));
  const mdPct = Math.max(0, Math.min(100, (player.stats.md / player.stats.maxMd) * 100));
  const staminaPct = Math.max(0, Math.min(100, (player.stamina / player.maxStamina) * 100));

  const payBracket = CLINIC_COSTS.find(b => player.stats.level <= b.maxLevel) ?? CLINIC_COSTS[CLINIC_COSTS.length - 1];
  const payCost = payBracket.cost;
  const freeRestUsedToday = player.lastFreeRestDate === getTodayString();

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← 返回</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>🏥 診療所</span>
        <span className="text-gold">💰 {player.ryo} Ryo</span>
      </div>

      {/* Current Status */}
      <div className="card">
        <div className="card-title">📋 目前狀態</div>
        <div className="hp-bar-container">
          <div className="hp-bar-label">
            <span className="text-red">HP</span>
            <span>{player.stats.hp} / {maxHp}</span>
          </div>
          <div className="hp-bar">
            <div className="hp-bar-fill hp-fill" style={{ width: `${hpPct}%` }} />
          </div>
        </div>
        <div className="hp-bar-container" style={{ marginTop: '8px' }}>
          <div className="hp-bar-label">
            <span className="text-blue">Chakra</span>
            <span>{player.stats.md} / {player.stats.maxMd}</span>
          </div>
          <div className="hp-bar">
            <div className="hp-bar-fill md-fill" style={{ width: `${mdPct}%` }} />
          </div>
        </div>
        <div className="hp-bar-container" style={{ marginTop: '8px' }}>
          <div className="hp-bar-label">
            <span className="text-orange">精力</span>
            <span>{player.stamina} / {player.maxStamina}</span>
          </div>
          <div className="hp-bar">
            <div className="hp-bar-fill stamina-fill" style={{ width: `${staminaPct}%` }} />
          </div>
        </div>
      </div>

      {/* Free Rest */}
      <div className="card">
        <div className="card-title">😴 免費休息（每日一次）</div>
        <div className="text-small text-gray" style={{ marginBottom: '12px' }}>
          回復 50% HP + 50% Chakra + 50 精力。每日限使用一次。
        </div>
        {freeRestUsedToday ? (
          <div className="text-small text-red" style={{ marginBottom: '8px' }}>
            ✗ 今日已使用免費休息
          </div>
        ) : (
          <div className="text-small text-green" style={{ marginBottom: '8px' }}>
            ✓ 可使用免費休息
          </div>
        )}
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={freeRestUsedToday}
          onClick={() => dispatch({ type: 'REST_FREE' })}
        >
          😴 免費休息（+50% HP / Chakra / +50 精力）
        </button>
      </div>

      {/* Paid Treatment */}
      <div className="card">
        <div className="card-title">💊 醫療忍者治療（全回復）</div>
        <div className="text-small text-gray" style={{ marginBottom: '8px' }}>
          消耗 Ryo 全回復 HP、Chakra 和精力。
        </div>
        <div className="text-small" style={{ marginBottom: '12px' }}>
          {CLINIC_COSTS.map((b, i) => {
            const minLv = i === 0 ? 1 : CLINIC_COSTS[i - 1].maxLevel + 1;
            const isCurrentBracket = player.stats.level <= b.maxLevel &&
              (i === 0 || player.stats.level > CLINIC_COSTS[i - 1].maxLevel);
            return (
              <div
                key={b.maxLevel}
                className={`stat-row ${isCurrentBracket ? 'text-gold' : 'text-gray'}`}
              >
                <span>LV{minLv}–{b.maxLevel}</span>
                <span>{b.cost} Ryo {isCurrentBracket && '← 目前'}</span>
              </div>
            );
          })}
        </div>
        <button
          className="btn btn-success"
          style={{ width: '100%' }}
          disabled={player.ryo < payCost}
          onClick={() => dispatch({ type: 'REST_PAY' })}
        >
          💊 付費治療（{payCost} Ryo）— 全回復
        </button>
        {player.ryo < payCost && (
          <div className="text-small text-red" style={{ marginTop: '6px' }}>
            Ryo 不足（需要 {payCost} Ryo，現有 {player.ryo}）
          </div>
        )}
      </div>
    </div>
  );
}
