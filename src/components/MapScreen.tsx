import { useState, useEffect } from 'react';
import { useGame } from '../gameStore';
import { WORLD_ZONES, WORLD_BOSSES, ENEMIES, ELEMENT_EMOJI } from '../constants';
import { renderRuby } from '../utils/renderRuby';
import { isBossAvailable, bossNextAvailableMs } from '../gameLogic';

const TIER_LABEL: Record<string, string> = {
  ZONE: 'ZONE',
  WORLD: 'WORLD',
  LEGENDARY: '⭐ LEGENDARY',
};

const RANK_ORDER: Record<string, number> = { E: 0, D: 1, C: 2 };

function formatCountdown(ms: number): string {
  if (ms <= 0) return '復活済み';
  const totalSecs = Math.ceil(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export function MapScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [, setNow] = useState(Date.now());

  // Tick for boss countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const lastKills = player.lastWorldBossKills ?? {};

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← 戻る</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>🗺 <ruby>ワールドマップ<rt></rt></ruby></span>
        <span className="text-gold">⚡{player.stamina}</span>
      </div>

      {WORLD_ZONES.map(zone => {
        const rankLocked = RANK_ORDER[zone.requiredRank] > RANK_ORDER[player.rank];
        const levelLocked = player.stats.level < zone.requiredLevel;
        const locked = rankLocked || levelLocked;
        const isSelected = selectedZoneId === zone.id;
        const boss = WORLD_BOSSES.find(b => b.id === zone.bossId);
        const bossAvailable = boss ? isBossAvailable(boss.id, lastKills, boss.cooldownMs) : false;

        return (
          <div key={zone.id} className={`card ${locked ? 'locked' : ''}`} style={{ opacity: locked ? 0.6 : 1 }}>
            {/* Zone header */}
            <div className="zone-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem' }}>
                {zone.emoji} {renderRuby(zone.name)}
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span className={`rank-badge rank-${zone.requiredRank}`}>{zone.requiredRank}</span>
                {zone.requiredLevel > 1 && <span className="text-small text-gray">LV{zone.requiredLevel}+</span>}
                <span className="text-small text-orange">⚡{zone.staminaCost}</span>
              </div>
            </div>

            <div className="text-small text-gray" style={{ margin: '6px 0' }}>{zone.description}</div>

            {/* Lock reason */}
            {locked && (
              <div className="text-small text-red" style={{ marginBottom: '6px' }}>
                🔒 {rankLocked ? `ランク${zone.requiredRank}必要` : `レベル${zone.requiredLevel}必要`}
              </div>
            )}

            {/* Enemy grid */}
            {!locked && (
              <>
                <div className="text-small text-gray" style={{ marginBottom: '4px' }}>出現する敵:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  {zone.enemyIds.map(eid => {
                    const enemy = ENEMIES[eid];
                    if (!enemy) return null;
                    return (
                      <span key={eid} className="buff-badge" style={{ fontSize: '0.75rem' }}>
                        {enemy.element ? ELEMENT_EMOJI[enemy.element] : '⚔'} {renderRuby(enemy.name)}
                      </span>
                    );
                  })}
                  <span className="buff-badge" style={{ fontSize: '0.75rem', border: '1px solid #ffd700' }}>
                    ✨ {renderRuby(ENEMIES[zone.eliteEnemyId]?.name ?? zone.eliteEnemyId)}
                  </span>
                </div>

                {/* Explore button / enemy picker */}
                {!isSelected ? (
                  <button
                    className="btn btn-primary"
                    style={{ marginBottom: '8px' }}
                    onClick={() => setSelectedZoneId(zone.id)}
                  >
                    🗺 <ruby>探索<rt>たんさく</rt></ruby>する
                  </button>
                ) : (
                  <div style={{ marginBottom: '8px' }}>
                    <div className="text-small text-gold" style={{ marginBottom: '4px' }}>戦う敵を選べ:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                      {[...zone.enemyIds, zone.eliteEnemyId].map(eid => {
                        const enemy = ENEMIES[eid];
                        if (!enemy) return null;
                        return (
                          <button
                            key={eid}
                            className="btn"
                            style={{ fontSize: '0.8rem' }}
                            onClick={() => {
                              setSelectedZoneId(null);
                              dispatch({ type: 'ENTER_ZONE', zoneId: zone.id, enemyId: eid });
                            }}
                          >
                            {enemy.element ? ELEMENT_EMOJI[enemy.element] : '⚔'} {renderRuby(enemy.name)}
                            <span className="text-small text-gray"> HP{enemy.stats.maxHp}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button className="btn" style={{ fontSize: '0.8rem' }} onClick={() => setSelectedZoneId(null)}>
                      ✕ キャンセル
                    </button>
                  </div>
                )}

                {/* Boss section */}
                {boss && (
                  <div style={{ borderTop: '1px solid #2a2a3a', paddingTop: '8px' }}>
                    <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span className="text-bold">
                        {boss.emoji} {renderRuby(boss.name)}
                      </span>
                      <span
                        className="text-small"
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: boss.tier === 'LEGENDARY' ? '#7b1fa2' : boss.tier === 'WORLD' ? '#c62828' : '#1565c0',
                          color: '#fff',
                        }}
                      >
                        {TIER_LABEL[boss.tier]}
                      </span>
                    </div>
                    {boss.signatureBloodlineId && !player.clearedBossIds?.includes(boss.id) && (
                      <div className="text-small text-gold" style={{ marginTop: '4px' }}>
                        🌟 <ruby>初回討伐<rt>しょかいとうばつ</rt></ruby>報酬: {boss.signatureBloodlineId} の血継限界！
                      </div>
                    )}
                    {player.clearedBossIds?.includes(boss.id) && (
                      <div className="text-small text-green" style={{ marginTop: '4px' }}>
                        ✓ 初回討伐済み
                      </div>
                    )}
                    {bossAvailable ? (
                      <button
                        className="btn btn-danger"
                        onClick={() => dispatch({ type: 'WORLD_BOSS_ATTEMPT', bossId: boss.id })}
                      >
                        ⚔ ボスに挑む（⚡{(WORLD_ZONES.find(z => z.bossId === boss.id)?.staminaCost ?? 5) * 2}）
                      </button>
                    ) : (
                      <div className="text-small text-gray">
                        🕐 <ruby>復活<rt>ふっかつ</rt></ruby>まで: {formatCountdown(bossNextAvailableMs(boss.id, lastKills, boss.cooldownMs))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
