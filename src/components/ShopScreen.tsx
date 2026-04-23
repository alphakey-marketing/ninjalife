import { useState } from 'react';
import { useGame } from '../gameStore';
import { ITEMS, JADE_SHOP_ITEMS } from '../constants';

const typeEmoji: Record<string, string> = {
  POTION: '🧪',
  CHAKRA_PILL: '💊',
  SCROLL: '📜',
};

export function ShopScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;
  const [activeTab, setActiveTab] = useState<'RYO' | 'JADE'>('RYO');
  const itemList = Object.values(ITEMS);

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← 戻る</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>🛒 <ruby>忍具<rt>にんぐ</rt></ruby><ruby>商店<rt>しょうてん</rt></ruby></span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="text-gold">💰 {player.ryo}</span>
          <span style={{ color: '#26c6da' }}>💎 {player.jade ?? 0}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', margin: '8px' }}>
        <button
          className={`btn ${activeTab === 'RYO' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('RYO')}
          style={{ flex: 1 }}
        >
          💰 Ryo ショップ
        </button>
        <button
          className={`btn ${activeTab === 'JADE' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('JADE')}
          style={{ flex: 1 }}
        >
          💎 翠玉ショップ
        </button>
      </div>

      {activeTab === 'RYO' && (
        <>
          {/* Ryo Shop items */}
          <div className="card">
            <div className="card-title">🏪 <ruby>商品<rt>しょうひん</rt></ruby><ruby>一覧<rt>いちらん</rt></ruby></div>
            {itemList.map(item => (
              <div key={item.id} className="shop-item item-entry">
                <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="text-bold">
                      {typeEmoji[item.type]} {item.name}
                    </div>
                    <div className="text-small text-gray">{item.description}</div>
                    {item.usableInCombat && <span className="text-small text-blue"> ⚔ <ruby>戦闘<rt>せんとう</rt></ruby>中<ruby>使用<rt>しよう</rt></ruby>可</span>}
                    {item.usableOutOfCombat && <span className="text-small text-green"> 🏠 <ruby>戦闘外<rt>せんとうがい</rt></ruby><ruby>使用<rt>しよう</rt></ruby>可</span>}
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <div className="text-gold">{item.price} Ryo</div>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: '4px', fontSize: '0.85rem' }}
                      disabled={player.ryo < item.price}
                      onClick={() => dispatch({ type: 'BUY_ITEM', itemId: item.id })}
                    >
                      <ruby>購入<rt>こうにゅう</rt></ruby>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Player inventory */}
          <div className="card">
            <div className="card-title">🎒 <ruby>所持<rt>しょじ</rt></ruby><ruby>道具<rt>どうぐ</rt></ruby></div>
            {player.inventory.length === 0 ? (
              <div className="text-gray text-small"><ruby>道具袋<rt>どうぐぶくろ</rt></ruby>が<ruby>空<rt>から</rt></ruby>です。</div>
            ) : (
              player.inventory.map(inv => {
                const item = ITEMS[inv.itemId];
                if (!item) return null;
                return (
                  <div key={inv.itemId} className="item-entry flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="text-bold">{typeEmoji[item.type]} {item.name}</span>
                      <span className="text-small text-gray"> ×{inv.quantity}</span>
                      <div className="text-small text-gray">{item.description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {item.usableOutOfCombat && (
                        <button
                          className="btn btn-success"
                          style={{ fontSize: '0.85rem' }}
                          onClick={() => dispatch({ type: 'USE_ITEM', itemId: inv.itemId })}
                        >
                          <ruby>使用<rt>しよう</rt></ruby>
                        </button>
                      )}
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: '0.85rem' }}
                        onClick={() => dispatch({ type: 'SELL_ITEM', itemId: inv.itemId })}
                      >
                        <ruby>売却<rt>ばいきゃく</rt></ruby> (+{Math.floor(item.price * 0.5)} Ryo)
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'JADE' && (
        <div className="card">
          <div className="card-title">💎 翠玉ショップ</div>
          <div className="text-small text-gray" style={{ marginBottom: '12px' }}>
            翠玉で便利なアイテムを購入できます。（f2p完全対応・課金なしで遊べます）
          </div>
          {JADE_SHOP_ITEMS.map(item => (
            <div key={item.id} className="shop-item item-entry">
              <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="text-bold">{item.nameJp}</div>
                  <div className="text-small text-gray">{item.descriptionJp}</div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '100px' }}>
                  <div style={{ color: '#26c6da' }}>💎 {item.jadeCost}</div>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: '4px', fontSize: '0.85rem', borderColor: '#26c6da' }}
                    disabled={(player.jade ?? 0) < item.jadeCost}
                    onClick={() => dispatch({ type: 'SPEND_JADE', itemId: item.id })}
                  >
                    購入
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
