import React from 'react';
import { useGame } from '../gameStore';
import { GEAR, GEAR_SHOP_IDS } from '../constants';
import type { GearSlot } from '../types';

const slotLabel: Record<GearSlot, React.ReactNode> = {
  WEAPON: <><ruby>武器<rt>ぶき</rt></ruby></>,
  ARMOR: <><ruby>鎧<rt>よろい</rt></ruby></>,
  ACCESSORY: <><ruby>装飾品<rt>そうしょくひん</rt></ruby></>,
};

const slotEmoji: Record<GearSlot, string> = {
  WEAPON: '⚔',
  ARMOR: '🛡',
  ACCESSORY: '💍',
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
      {stats.hpRegenPerTurn ? `HP回復/ターン +${stats.hpRegenPerTurn}` : ''}
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
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← 戻る</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>🗡 <ruby>装備<rt>そうび</rt></ruby></span>
        <span className="text-gold">💰 {player.ryo} Ryo</span>
      </div>

      {/* Equipped Gear */}
      <div className="card">
        <div className="card-title">🎯 <ruby>現在<rt>げんざい</rt></ruby>の<ruby>装備<rt>そうび</rt></ruby></div>
        {slots.map(slot => {
          const slotKey = slot.toLowerCase() as 'weapon' | 'armor' | 'accessory';
          const equippedId = player.equippedGear?.[slotKey] ?? null;
          const gear = equippedId ? GEAR[equippedId] : null;
          return (
            <div key={slot} className="stat-row" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
              <span className="stat-label">{slotEmoji[slot]} {slotLabel[slot]}</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {gear ? (
                  <>
                    <span className={rarityColor[gear.rarity]}>{gear.name}</span>
                    <button
                      className="btn text-small"
                      style={{ padding: '2px 8px' }}
                      onClick={() => dispatch({ type: 'UNEQUIP_GEAR', slot })}
                    >
                      <ruby>外<rt>はず</rt></ruby>す
                    </button>
                  </>
                ) : (
                  <span className="text-gray">— <ruby>未装備<rt>みそうび</rt></ruby> —</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Owned Gear */}
      {(player.ownedGearIds ?? []).length > 0 && (
        <div className="card">
          <div className="card-title">🎒 <ruby>所持<rt>しょじ</rt></ruby><ruby>装備<rt>そうび</rt></ruby></div>
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
                    <span className="text-small text-gray"> [{gear.rarity}] {slotEmoji[gear.slot]} {slotLabel[gear.slot]}</span>
                  </div>
                  <div className="text-small text-gray" style={{ marginTop: '2px' }}>{gear.description}</div>
                  <GearStatLine stats={gear.stats} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                  <button
                    className={`btn ${isEquipped ? 'btn-success' : 'btn-primary'}`}
                    onClick={() => dispatch({ type: 'EQUIP_GEAR', gearId })}
                    style={{ minWidth: '70px' }}
                  >
                    {isEquipped ? <><ruby>装備中<rt>そうびちゅう</rt></ruby></> : <ruby>装備<rt>そうび</rt></ruby>}
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ minWidth: '70px', fontSize: '0.8rem' }}
                    onClick={() => dispatch({ type: 'SELL_GEAR', gearId })}
                  >
                    <ruby>売却<rt>ばいきゃく</rt></ruby> (+{Math.floor(gear.price * 0.5)})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gear Shop */}
      <div className="card">
        <div className="card-title">🛒 <ruby>装備<rt>そうび</rt></ruby><ruby>商店<rt>しょうてん</rt></ruby></div>
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
                  <span className="text-small text-gray"> [{gear.rarity}] {slotEmoji[gear.slot]} {slotLabel[gear.slot]}</span>
                </div>
                <div className="text-small text-gray" style={{ marginTop: '2px' }}>{gear.description}</div>
                <GearStatLine stats={gear.stats} />
                <div className="text-small text-gold" style={{ marginTop: '4px' }}>
                  {gear.price} Ryo
                </div>
              </div>
              {owned ? (
                <span className="text-small text-green">✓ <ruby>購入済<rt>こうにゅうずみ</rt></ruby>み</span>
              ) : (
                <button
                  className="btn btn-primary"
                  disabled={!canAfford}
                  onClick={() => dispatch({ type: 'BUY_GEAR', gearId })}
                  style={{ minWidth: '70px' }}
                >
                  <ruby>購入<rt>こうにゅう</rt></ruby>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
