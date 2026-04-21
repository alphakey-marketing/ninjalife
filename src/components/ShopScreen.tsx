import { useGame } from '../gameStore';
import { ITEMS } from '../constants';

const typeEmoji: Record<string, string> = {
  POTION: '🧪',
  CHAKRA_PILL: '💊',
  SCROLL: '📜',
};

export function ShopScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;

  const itemList = Object.values(ITEMS);

  return (
    <div className="screen">
      <div className="header-bar">
        <button className="btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'HUB' })}>← 返回</button>
        <span className="game-title" style={{ fontSize: '1.1rem' }}>🛒 忍具商店</span>
        <span className="text-gold">💰 {player.ryo} Ryo</span>
      </div>

      {/* Shop items */}
      <div className="card">
        <div className="card-title">🏪 商品列表</div>
        {itemList.map(item => (
          <div key={item.id} className="shop-item item-entry">
            <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="text-bold">
                  {typeEmoji[item.type]} {item.name}
                </div>
                <div className="text-small text-gray">{item.description}</div>
                {item.usableInCombat && <span className="text-small text-blue"> ⚔ 戰鬥中可用</span>}
                {item.usableOutOfCombat && <span className="text-small text-green"> 🏠 場外可用</span>}
              </div>
              <div style={{ textAlign: 'right', minWidth: '100px' }}>
                <div className="text-gold">{item.price} Ryo</div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '4px', fontSize: '0.85rem' }}
                  disabled={player.ryo < item.price}
                  onClick={() => dispatch({ type: 'BUY_ITEM', itemId: item.id })}
                >
                  購買
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Player inventory */}
      <div className="card">
        <div className="card-title">🎒 我的道具</div>
        {player.inventory.length === 0 ? (
          <div className="text-gray text-small">背包是空的。</div>
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
                      使用
                    </button>
                  )}
                  <button
                    className="btn btn-danger"
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => dispatch({ type: 'SELL_ITEM', itemId: inv.itemId })}
                  >
                    出售 (+{Math.floor(item.price * 0.5)} Ryo)
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
