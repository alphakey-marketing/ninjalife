import { useState } from 'react';
import { useGame } from '../gameStore';
import { BLOODLINES, SPIN_CONFIG } from '../constants';

const rarityEmoji: Record<string, string> = {
  COMMON: '◆',
  RARE: '◇',
  LEGENDARY: '★',
};

export function SpinScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;
  const [isSpinning, setIsSpinning] = useState(false);

  const handleSpin = () => {
    setIsSpinning(true);
    setTimeout(() => {
      dispatch({ type: 'SPIN' });
      setIsSpinning(false);
    }, 800);
  };

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← Back</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>🌀 血繼限界轉盤</span>
        <span className="text-gold">💰 {player.ryo} Ryo</span>
      </div>

      <div className="card">
        <div className="card-title">轉盤抽取血繼限界</div>
        <div className="text-small text-gray" style={{ marginBottom: '12px' }}>
          Cost: {SPIN_CONFIG.priceRyo} Ryo per spin
        </div>

        {/* Odds Display */}
        <div style={{ marginBottom: '12px' }}>
          <div className="text-small text-gray" style={{ marginBottom: '4px' }}>基礎機率：</div>
          {SPIN_CONFIG.entries.map(entry => {
            const bl = BLOODLINES[entry.bloodlineId];
            return (
              <div key={entry.bloodlineId} className="stat-row text-small">
                <span className={`rarity-${bl.rarity.toLowerCase()}`}>
                  {rarityEmoji[bl.rarity]} {bl.name}
                </span>
                <span className="text-gray">{entry.baseWeight}%</span>
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
          className={`btn btn-primary ${isSpinning ? 'spinning' : ''}`}
          style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}
          disabled={player.ryo < SPIN_CONFIG.priceRyo || isSpinning}
          onClick={handleSpin}
        >
          {isSpinning ? '🌀 轉動中...' : '🌀 抽取！(100 Ryo)'}
        </button>

        {state.notifications[0] && (
          <div className="spin-result">
            <span className={state.notifications[0].includes('宇智波') ? 'text-purple text-bold' :
              state.notifications[0].includes('日向') || state.notifications[0].includes('霧隱') ? 'text-blue text-bold' : ''}>
              {state.notifications[0]}
            </span>
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
                    <span className="text-small text-gray"> [{bl.rarity}]</span>
                  </div>
                  <div className="text-small text-gray" style={{ marginTop: '2px' }}>{bl.description}</div>
                  <div className="text-small" style={{ marginTop: '2px' }}>
                    Mastery: <span className="text-gold">{owned.mastery}</span>
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
