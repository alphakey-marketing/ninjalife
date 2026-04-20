import { useGame } from '../gameStore';
import { GEAR, GEAR_SHOP_IDS } from '../constants';
import type { GearSlot } from '../types';

const slotLabel: Record<GearSlot, string> = {
  WEAPON: '⚔ 武器',
  ARMOR: '🛡 護甲',
  ACCESSORY: '💍 飾品',
};

const rarityColor: Record<string, string> = {
  COMMON: 'rarity-common',
  RARE: 'rarity-rare',
  LEGENDARY: 'rarity-legendary',
};

function GearStatLine({ stats }: { stats: import('../types').GearStats }) {
  return (
    <div className="text-small text-green" style={{ marginTop: '2px' }}>
      {stats.atkBonus ? `ATK +${stats.atkBonus} ` : ''}
      {stats.defBonus ? `DEF +${stats.defBonus} ` : ''}
      {stats.hpBonus ? `HP +${stats.hpBonus} ` : ''}
      {stats.spdBonus ? `SPD +${stats.spdBonus} ` : ''}
      {stats.mdRegenBonus ? `Chakra回復 +${stats.mdRegenBonus} ` : ''}
      {stats.hpRegenPerTurn ? `HP回復/回合 +${stats.hpRegenPerTurn}` : ''}
    </div>
  );
}

export function GearScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;

  const slots: GearSlot[] = ['WEAPON', 'ARMOR', 'ACCESSORY'];

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← 返回</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>🗡 裝備</span>
        <span className="text-gold">💰 {player.ryo} Ryo</span>
      </div>

      {/* Equipped Gear */}
      <div className="card">
        <div className="card-title">🎯 目前裝備</div>
        {slots.map(slot => {
          const slotKey = slot.toLowerCase() as 'weapon' | 'armor' | 'accessory';
          const equippedId = player.equippedGear?.[slotKey] ?? null;
          const gear = equippedId ? GEAR[equippedId] : null;
          return (
            <div key={slot} className="stat-row" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
              <span className="stat-label">{slotLabel[slot]}</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {gear ? (
                  <>
                    <span className={rarityColor[gear.rarity]}>{gear.name}</span>
                    <button
                      className="btn text-small"
                      style={{ padding: '2px 8px' }}
                      onClick={() => dispatch({ type: 'UNEQUIP_GEAR', slot })}
                    >
                      卸除
                    </button>
                  </>
                ) : (
                  <span className="text-gray">— 未裝備 —</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Owned Gear */}
      {(player.ownedGearIds ?? []).length > 0 && (
        <div className="card">
          <div className="card-title">🎒 持有裝備</div>
          {(player.ownedGearIds ?? []).map(gearId => {
            const gear = GEAR[gearId];
            if (!gear) return null;
            const slotKey = gear.slot.toLowerCase() as 'weapon' | 'armor' | 'accessory';
            const isEquipped = player.equippedGear?.[slotKey] === gearId;
            return (
              <div key={gearId} className="gear-item">
                <div>
                  <div className={`text-bold ${rarityColor[gear.rarity]}`}>
                    {gear.name}
                    <span className="text-small text-gray"> [{gear.rarity}] {slotLabel[gear.slot]}</span>
                  </div>
                  <div className="text-small text-gray" style={{ marginTop: '2px' }}>{gear.description}</div>
                  <GearStatLine stats={gear.stats} />
                </div>
                <button
                  className={`btn ${isEquipped ? 'btn-success' : 'btn-primary'}`}
                  onClick={() => dispatch({ type: 'EQUIP_GEAR', gearId })}
                  style={{ minWidth: '70px' }}
                >
                  {isEquipped ? '✓ 已裝備' : '裝備'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Gear Shop */}
      <div className="card">
        <div className="card-title">🛒 裝備商店</div>
        {GEAR_SHOP_IDS.map(gearId => {
          const gear = GEAR[gearId];
          if (!gear) return null;
          const owned = player.ownedGearIds?.includes(gearId) ?? false;
          const canAfford = player.ryo >= gear.price;
          return (
            <div key={gearId} className="gear-item">
              <div>
                <div className={`text-bold ${rarityColor[gear.rarity]}`}>
                  {gear.name}
                  <span className="text-small text-gray"> [{gear.rarity}] {slotLabel[gear.slot]}</span>
                </div>
                <div className="text-small text-gray" style={{ marginTop: '2px' }}>{gear.description}</div>
                <GearStatLine stats={gear.stats} />
                <div className="text-small text-gold" style={{ marginTop: '4px' }}>
                  {gear.price} Ryo
                </div>
              </div>
              {owned ? (
                <span className="text-small text-green">✓ 已購買</span>
              ) : (
                <button
                  className="btn btn-primary"
                  disabled={!canAfford}
                  onClick={() => dispatch({ type: 'BUY_GEAR', gearId })}
                  style={{ minWidth: '70px' }}
                >
                  購買
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
