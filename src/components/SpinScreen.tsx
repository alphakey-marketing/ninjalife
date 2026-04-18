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
        <span className="game-title" style={{ fontSize: '1.1rem' }}>🌀 Bloodline SPIN</span>
        <span className="text-gold">💰 {player.ryo} Ryo</span>
      </div>

      <div className="card">
        <div className="card-title">Spin for Bloodline</div>
        <div className="text-small text-gray" style={{ marginBottom: '12px' }}>
          Cost: {SPIN_CONFIG.priceRyo} Ryo per spin
        </div>

        {/* Odds Display */}
        <div style={{ marginBottom: '12px' }}>
          <div className="text-small text-gray" style={{ marginBottom: '4px' }}>Base Rates:</div>
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
              Rank Bonus: +{player.rankBonus.spinRarityBonus * 100}% to RARE/LEGENDARY
            </div>
          )}
        </div>

        <button
          className={`btn btn-primary ${isSpinning ? 'spinning' : ''}`}
          style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}
          disabled={player.ryo < SPIN_CONFIG.priceRyo || isSpinning}
          onClick={handleSpin}
        >
          {isSpinning ? '🌀 Spinning...' : '🌀 SPIN! (100 Ryo)'}
        </button>

        {state.notification && (
          <div className="spin-result">
            <span className={state.notification.includes('LEGENDARY') || state.notification.includes('Void') ? 'text-purple text-bold' :
              state.notification.includes('RARE') || state.notification.includes('Storm') ? 'text-blue text-bold' : ''}>
              {state.notification}
            </span>
          </div>
        )}
      </div>

      {/* Owned Bloodlines */}
      <div className="card">
        <div className="card-title">Your Bloodlines ({player.ownedBloodlines.length})</div>
        {player.ownedBloodlines.length === 0 ? (
          <div className="text-gray text-small">No bloodlines yet. Spin to get one!</div>
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
                  {isEquipped ? '✓ On' : 'Equip'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
