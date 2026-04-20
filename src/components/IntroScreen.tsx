import { useState } from 'react';
import { useGame } from '../gameStore';

export function IntroScreen() {
  const { dispatch } = useGame();
  const [name, setName] = useState('');

  const handleStart = () => {
    const trimmed = name.trim();
    dispatch({ type: 'SET_PLAYER_NAME', name: trimmed || '無名忍者' });
  };

  return (
    <div className="screen" style={{ justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
        <div className="game-title" style={{ fontSize: '2rem', marginBottom: '16px' }}>🥷 忍者生涯</div>
        <div className="text-gray text-small" style={{ marginBottom: '24px', lineHeight: '1.8' }}>
          木葉忍者學校的畢業典禮剛結束。<br />
          作為下忍的第一天，你站在村莊的入口，<br />
          心中充滿著對未來的期待與不安。<br />
          「我的名字將在忍者世界中留下傳說。」
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div className="text-small text-gray" style={{ marginBottom: '8px' }}>你的忍者名稱：</div>
          <input
            type="text"
            maxLength={20}
            placeholder="輸入你的忍者名稱..."
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            style={{
              background: '#1e1e2e',
              border: '1px solid #f0a030',
              color: '#e8e0d0',
              padding: '8px 12px',
              borderRadius: '4px',
              fontFamily: 'Courier New, monospace',
              fontSize: '1rem',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}
          onClick={handleStart}
        >
          ✅ 開始忍者生涯
        </button>
        <div className="text-small text-gray" style={{ marginTop: '16px' }}>
          留空則使用「無名忍者」
        </div>
      </div>
    </div>
  );
}
