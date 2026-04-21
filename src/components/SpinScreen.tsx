import { useState, useEffect, useRef } from 'react';
import { useGame } from '../gameStore';
import { BLOODLINES, ELEMENT_EMOJI, RARE_BLOODLINE_IDS, SPIN_CONFIG } from '../constants';

const rarityEmoji: Record<string, string> = {
  COMMON: '◆',
  RARE: '◇',
  LEGENDARY: '★',
};

const rarityClass: Record<string, string> = {
  COMMON: '',
  RARE: 'rarity-rare',
  LEGENDARY: 'rarity-legendary',
};

export function SpinScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDisplayIdx, setSpinDisplayIdx] = useState(0);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [showResultFlash, setShowResultFlash] = useState(false);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevNotificationCount = useRef(state.notifications.length);

  const entries = SPIN_CONFIG.entries;

  const handleSpin = () => {
    setIsSpinning(true);
    setSpinResult(null);
    setShowResultFlash(false);
    prevNotificationCount.current = state.notifications.length;

    const totalTicks = 36;
    const startInterval = 60;
    const endInterval = 220;

    let scheduled = 0;

    function scheduleNext() {
      if (scheduled >= totalTicks) {
        dispatch({ type: 'SPIN' });
        return;
      }
      const progress = scheduled / totalTicks;
      const delay = Math.floor(startInterval + (endInterval - startInterval) * progress);
      spinIntervalRef.current = setTimeout(() => {
        setSpinDisplayIdx(Math.floor(Math.random() * entries.length));
        scheduled++;
        scheduleNext();
      }, delay);
    }
    scheduleNext();
  };

  useEffect(() => {
    if (isSpinning && state.notifications.length > prevNotificationCount.current) {
      setIsSpinning(false);
      const resultMsg = state.notifications[state.notifications.length - 1] ?? '';
      setSpinResult(resultMsg);
      setShowResultFlash(true);
      setTimeout(() => setShowResultFlash(false), 1500);
    }
  }, [state.notifications.length, isSpinning]);

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearTimeout(spinIntervalRef.current);
    };
  }, []);

  const rareIds = RARE_BLOODLINE_IDS;
  const totalWeight = SPIN_CONFIG.entries.reduce((sum, e) => {
    const bonus = rareIds.includes(e.bloodlineId) ? player.rankBonus.spinRarityBonus * 100 : 0;
    return sum + e.baseWeight + bonus;
  }, 0);

  const displayEntry = entries[spinDisplayIdx];
  const displayBl = BLOODLINES[displayEntry.bloodlineId];

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← 返回</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>🌀 血繼限界轉盤</span>
        <span className="text-gold">💰 {player.ryo} Ryo</span>
      </div>

      <div className="card">
        <div className="card-title">轉盤抽取血繼限界</div>
        <div className="text-small text-gray" style={{ marginBottom: '8px' }}>
          重複抽到已有血繼限界可提升熟練度，每級熟練度提供 +2% 被動技能加成。
        </div>
        <div className="text-small text-gray" style={{ marginBottom: '12px' }}>
          費用：{SPIN_CONFIG.priceRyo} Ryo / 次
        </div>

        {/* Roulette Display */}
        <div className={`spin-wheel-display ${showResultFlash ? `spin-flash-${displayBl.rarity.toLowerCase()}` : ''}`}>
          <div className={`rarity-${displayBl.rarity.toLowerCase()} text-bold`} style={{ fontSize: '1.3rem' }}>
            {rarityEmoji[displayBl.rarity]} {displayBl.name}
            {displayBl.element && <span> {ELEMENT_EMOJI[displayBl.element]}</span>}
          </div>
          <div className="text-small text-gray" style={{ marginTop: '4px' }}>[{displayBl.rarity}]</div>
        </div>

        {/* Odds Display */}
        <div style={{ marginBottom: '12px' }}>
          <div className="text-small text-gray" style={{ marginBottom: '4px' }}>基礎機率：</div>
          {SPIN_CONFIG.entries.map(entry => {
            const bl = BLOODLINES[entry.bloodlineId];
            const rarityBonus = rareIds.includes(entry.bloodlineId) ? player.rankBonus.spinRarityBonus * 100 : 0;
            const effectiveWeight = entry.baseWeight + rarityBonus;
            return (
              <div key={entry.bloodlineId} className="stat-row text-small">
                <span className={`rarity-${bl.rarity.toLowerCase()}`}>
                  {rarityEmoji[bl.rarity]} {bl.name}
                  {bl.element && <span> {ELEMENT_EMOJI[bl.element]}</span>}
                </span>
                <span className="text-gray">{(effectiveWeight / totalWeight * 100).toFixed(1)}%</span>
              </div>
            );
          })}
          {player.rankBonus.spinRarityBonus > 0 && (
            <div className="text-small text-gold" style={{ marginTop: '4px' }}>
              等級加成：+{player.rankBonus.spinRarityBonus * 100}% RARE/LEGENDARY 機率
            </div>
          )}
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}
          disabled={player.ryo < SPIN_CONFIG.priceRyo || isSpinning}
          onClick={handleSpin}
        >
          {isSpinning ? '🌀 轉動中...' : '🌀 抽取！(100 Ryo)'}
        </button>

        {spinResult && !isSpinning && (
          <div className={`spin-result ${rarityClass[displayBl.rarity]}`}>
            {spinResult}
          </div>
        )}
      </div>

      {/* Owned Bloodlines */}
      <div className="card">
        <div className="card-title">你的血繼限界 ({player.ownedBloodlines.length})</div>
        {player.ownedBloodlines.length === 0 ? (
          <div className="text-gray text-small">尚未獲得血繼限界。轉動抽取！</div>
        ) : (
          player.ownedBloodlines.map(owned => {
            const bl = BLOODLINES[owned.id];
            const isEquipped = player.equippedBloodlineId === owned.id;
            return (
              <div key={owned.id} className={`bloodline-item ${isEquipped ? 'bloodline-equipped' : ''}`}>
                <div>
                  <div className={`rarity-${bl.rarity.toLowerCase()}`}>
                    {rarityEmoji[bl.rarity]} {bl.name}
                    {bl.element && <span> {ELEMENT_EMOJI[bl.element]}</span>}
                    <span className="text-small text-gray"> [{bl.rarity}]</span>
                  </div>
                  <div className="text-small text-gray" style={{ marginTop: '2px' }}>{bl.description}</div>
                  <div className="text-small" style={{ marginTop: '2px' }}>
                    熟練度: <span className="text-gold">{owned.mastery}</span>
                    {owned.mastery > 1 && (
                      <span className="text-gray"> (+{((owned.mastery - 1) * 2)}% 被動加成)</span>
                    )}
                  </div>
                </div>
                <button
                  className={`btn ${isEquipped ? 'btn-success' : 'btn-primary'}`}
                  onClick={() => dispatch({ type: 'EQUIP_BLOODLINE', bloodlineId: owned.id })}
                  style={{ minWidth: '70px' }}
                >
                  {isEquipped ? '✓ 已裝備' : '裝備'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
