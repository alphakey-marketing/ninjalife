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
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← 戻る</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>🌀 <ruby>血継限界<rt>けっけいげんかい</rt></ruby>ガチャ</span>
        <span className="text-gold">💰 {player.ryo} Ryo</span>
      </div>

      <div className="card">
        <div className="card-title"><ruby>血継限界<rt>けっけいげんかい</rt></ruby>ガチャ</div>
        <div className="text-small text-gray" style={{ marginBottom: '8px' }}>
          すでに<ruby>持<rt>も</rt></ruby>っている<ruby>血継限界<rt>けっけいげんかい</rt></ruby>を<ruby>引<rt>ひ</rt></ruby>くと<ruby>熟練度<rt>じゅくれんど</rt></ruby>が<ruby>上<rt>あ</rt></ruby>がる。<ruby>熟練度<rt>じゅくれんど</rt></ruby>1<ruby>段階<rt>だんかい</rt></ruby>ごとに+2%のパッシブスキル<ruby>強化<rt>きょうか</rt></ruby>を<ruby>付与<rt>ふよ</rt></ruby>。
        </div>
        <div className="text-small text-gray" style={{ marginBottom: '12px' }}>
          <ruby>費用<rt>ひよう</rt></ruby>：{SPIN_CONFIG.priceRyo} Ryo / <ruby>回<rt>かい</rt></ruby>
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
          <div className="text-small text-gray" style={{ marginBottom: '4px' }}><ruby>基本<rt>きほん</rt></ruby><ruby>確率<rt>かくりつ</rt></ruby>：</div>
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
              ランクボーナス：RARE/LEGENDARY<ruby>確率<rt>かくりつ</rt></ruby>+{player.rankBonus.spinRarityBonus * 100}%
            </div>
          )}
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}
          disabled={player.ryo < SPIN_CONFIG.priceRyo || isSpinning}
          onClick={handleSpin}
        >
          {isSpinning ? '�� 回転中（かいてんちゅう）...' : '🌀 ガチャを引く！(100 Ryo)'}
        </button>

        {spinResult && !isSpinning && (
          <div className={`spin-result ${rarityClass[displayBl.rarity]}`}>
            {spinResult}
          </div>
        )}
      </div>

      {/* Owned Bloodlines */}
      <div className="card">
        <div className="card-title"><ruby>所持<rt>しょじ</rt></ruby><ruby>血継限界<rt>けっけいげんかい</rt></ruby> ({player.ownedBloodlines.length})</div>
        {player.ownedBloodlines.length === 0 ? (
          <div className="text-gray text-small">まだ<ruby>血継限界<rt>けっけいげんかい</rt></ruby>を<ruby>持<rt>も</rt></ruby>っていません。ガチャを<ruby>引<rt>ひ</rt></ruby>いてください！</div>
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
                    <ruby>熟練度<rt>じゅくれんど</rt></ruby>: <span className="text-gold">{owned.mastery}</span>
                    {owned.mastery > 1 && (
                      <span className="text-gray"> (+{((owned.mastery - 1) * 2)}% パッシブ<ruby>強化<rt>きょうか</rt></ruby>)</span>
                    )}
                  </div>
                </div>
                <button
                  className={`btn ${isEquipped ? 'btn-success' : 'btn-primary'}`}
                  onClick={() => dispatch({ type: 'EQUIP_BLOODLINE', bloodlineId: owned.id })}
                  style={{ minWidth: '70px' }}
                >
                  {isEquipped ? '✓ 装備中' : '装備'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
