import { useState } from 'react';
import { useGame } from '../gameStore';

export function IntroScreen() {
  const { dispatch } = useGame();
  const [name, setName] = useState('');

  const handleStart = () => {
    const trimmed = name.trim();
    dispatch({ type: 'SET_PLAYER_NAME', name: trimmed || '名無しの忍者' });
  };

  return (
    <div className="screen" style={{ justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
        <div className="game-title" style={{ fontSize: '2rem', marginBottom: '16px' }}>🥷 忍びの道</div>
        <div className="text-gray text-small" style={{ marginBottom: '24px', lineHeight: '1.8' }}>
          <ruby>木<rt>この</rt></ruby>ノ<ruby>葉<rt>は</rt></ruby><ruby>忍者<rt>にんじゃ</rt></ruby><ruby>学校<rt>がっこう</rt></ruby>の<ruby>卒業式<rt>そつぎょうしき</rt></ruby>が<ruby>終<rt>お</rt></ruby>わった。<br />
          <ruby>下忍<rt>げにん</rt></ruby>としての<ruby>最初<rt>さいしょ</rt></ruby>の<ruby>日<rt>ひ</rt></ruby>、<ruby>村<rt>むら</rt></ruby>の<ruby>入口<rt>いりぐち</rt></ruby>に<ruby>立<rt>た</rt></ruby>ち、<br />
          <ruby>未来<rt>みらい</rt></ruby>への<ruby>期待<rt>きたい</rt></ruby>と<ruby>不安<rt>ふあん</rt></ruby>でいっぱいだ。<br />
          「<ruby>俺<rt>おれ</rt></ruby>の<ruby>名<rt>な</rt></ruby>は<ruby>忍者<rt>にんじゃ</rt></ruby>の<ruby>世界<rt>せかい</rt></ruby>に<ruby>伝説<rt>でんせつ</rt></ruby>となる。」
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div className="text-small text-gray" style={{ marginBottom: '8px' }}><ruby>忍者<rt>にんじゃ</rt></ruby>の<ruby>名前<rt>なまえ</rt></ruby>：</div>
          <input
            type="text"
            maxLength={20}
            placeholder="忍者の名を入力..."
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
          ✅ <ruby>忍<rt>しの</rt></ruby>びの<ruby>道<rt>みち</rt></ruby>を<ruby>歩<rt>ある</rt></ruby>む
        </button>
        <div className="text-small text-gray" style={{ marginTop: '16px' }}>
          <ruby>空欄<rt>くうらん</rt></ruby>の<ruby>場合<rt>ばあい</rt></ruby>は「<ruby>名無<rt>ななし</rt></ruby>しの<ruby>忍者<rt>にんじゃ</rt></ruby>」を<ruby>使用<rt>しよう</rt></ruby>します
        </div>
      </div>
    </div>
  );
}
