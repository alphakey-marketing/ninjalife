import { useGame } from '../gameStore';
import { CLINIC_COSTS, FREE_REST_COOLDOWN_MS, STAMINA_RECOVERY_INTERVAL_MS, STAMINA_RECOVERY_AMOUNT } from '../constants';
import { calcPlayerMaxHp } from '../gameLogic';

export function ClinicScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;
  const maxHp = calcPlayerMaxHp(player);
  const hpPct = Math.max(0, Math.min(100, (player.stats.hp / maxHp) * 100));
  const mdPct = Math.max(0, Math.min(100, (player.stats.md / player.stats.maxMd) * 100));
  const staminaPct = Math.max(0, Math.min(100, (player.stamina / player.maxStamina) * 100));

  const payBracket = CLINIC_COSTS.find(b => player.stats.level <= b.maxLevel) ?? CLINIC_COSTS[CLINIC_COSTS.length - 1];
  const payCost = payBracket.cost;
  const now = Date.now();
  const lastRest = player.lastFreeRestTimestamp ?? 0;
  const restCooldownRemaining = Math.max(0, FREE_REST_COOLDOWN_MS - (now - lastRest));
  const freeRestOnCooldown = restCooldownRemaining > 0;
  const restHoursLeft = Math.floor(restCooldownRemaining / (60 * 60 * 1000));
  const restMinsLeft = Math.floor((restCooldownRemaining % (60 * 60 * 1000)) / (60 * 1000));

  const nextRecovery = (player.lastStaminaRecovery ?? now) + STAMINA_RECOVERY_INTERVAL_MS;
  const secsUntil = Math.max(0, Math.ceil((nextRecovery - now) / 1000));
  const minsUntil = Math.floor(secsUntil / 60);
  const secsLeft = secsUntil % 60;
  const recoveryLabel = player.stamina >= player.maxStamina
    ? 'スタミナ満タン'
    : `${minsUntil}分${String(secsLeft).padStart(2, '0')}秒後に +${STAMINA_RECOVERY_AMOUNT}`;

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← 戻る</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>🏥 <ruby>診療所<rt>しんりょうじょ</rt></ruby></span>
        <span className="text-gold">💰 {player.ryo} Ryo</span>
      </div>

      {/* Current Status */}
      <div className="card">
        <div className="card-title">📋 <ruby>現在<rt>げんざい</rt></ruby>の<ruby>状態<rt>じょうたい</rt></ruby></div>
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
            <span className="text-orange">スタミナ</span>
            <span>{player.stamina} / {player.maxStamina} <span className="text-small text-gray">({recoveryLabel})</span></span>
          </div>
          <div className="hp-bar">
            <div className="hp-bar-fill stamina-fill" style={{ width: `${staminaPct}%` }} />
          </div>
        </div>
      </div>

      {/* Free Rest */}
      <div className="card">
        <div className="card-title">😴 <ruby>無料<rt>むりょう</rt></ruby><ruby>休憩<rt>きゅうけい</rt></ruby>（20<ruby>時間<rt>じかん</rt></ruby>に1<ruby>回<rt>かい</rt></ruby>）</div>
        <div className="text-small text-gray" style={{ marginBottom: '12px' }}>
          HPとChakraを50%<ruby>回復<rt>かいふく</rt></ruby>する。20<ruby>時間<rt>じかん</rt></ruby>に1<ruby>回<rt>かい</rt></ruby>。（スタミナはスタミナ<ruby>丸<rt>まる</rt></ruby>を<ruby>使用<rt>しよう</rt></ruby>）
        </div>
        {freeRestOnCooldown ? (
          <div className="text-small text-red" style={{ marginBottom: '8px' }}>
            ✗ <ruby>無料休憩<rt>むりょうきゅうけい</rt></ruby>は<ruby>使用済<rt>しようずみ</rt></ruby>み（あと{restHoursLeft}<ruby>時間<rt>じかん</rt></ruby>{restMinsLeft}<ruby>分<rt>ぷん</rt></ruby>）
          </div>
        ) : (
          <div className="text-small text-green" style={{ marginBottom: '8px' }}>
            ✓ <ruby>無料休憩<rt>むりょうきゅうけい</rt></ruby>が<ruby>使用可能<rt>しようかのう</rt></ruby>
          </div>
        )}
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={freeRestOnCooldown}
          onClick={() => dispatch({ type: 'REST_FREE' })}
        >
          😴 <ruby>無料休憩<rt>むりょうきゅうけい</rt></ruby>（HP/Chakra +50%）
        </button>
      </div>

      {/* Paid Treatment */}
      <div className="card">
        <div className="card-title">💊 <ruby>医療忍者<rt>いりょうにんじゃ</rt></ruby>による<ruby>治療<rt>ちりょう</rt></ruby>（<ruby>全回復<rt>ぜんかいふく</rt></ruby>）</div>
        <div className="text-small text-gray" style={{ marginBottom: '8px' }}>
          Ryoを<ruby>消費<rt>しょうひ</rt></ruby>してHPとChakraを<ruby>全回復<rt>ぜんかいふく</rt></ruby>する。（スタミナは<ruby>回復<rt>かいふく</rt></ruby>しない）
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
                <span>{b.cost} Ryo {isCurrentBracket && '← 現在'}</span>
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
          💊 <ruby>有料治療<rt>ゆうりょうちりょう</rt></ruby>（{payCost} Ryo）— <ruby>全回復<rt>ぜんかいふく</rt></ruby>
        </button>
        {player.ryo < payCost && (
          <div className="text-small text-red" style={{ marginTop: '6px' }}>
            Ryoが<ruby>不足<rt>ふそく</rt></ruby>（<ruby>必要<rt>ひつよう</rt></ruby>: {payCost} Ryo、<ruby>現在<rt>げんざい</rt></ruby>: {player.ryo}）
          </div>
        )}
      </div>
    </div>
  );
}
