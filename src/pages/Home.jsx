import { SUPPORT_EMAIL } from '../core/constants';
import '../styles/hesbah.css';

export default function Home({ setSelectedGame }) {
  return (
    <div className="scr">
      <div style={{ textAlign: 'center', padding: '18px 0 14px' }}>
        <div style={{ fontSize: 42, marginBottom: 6 }}>🏟️</div>
        <div className="ptitle" style={{ fontSize: 24 }}>ساحة الألعاب</div>
        <div className="psub">ألعاب جماعية تفاعلية للرحلات والاجتماعات والمناسبات</div>
      </div>

      {/* بطاقة الألقاب */}
      <div
        className="home-game-card home-game-card--nicknames"
        onClick={() => setSelectedGame('nicknames')}
        onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(.98)'; }}
        onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 44 }}>🎭</div>
          <div style={{ flex: 1 }}>
            <div className="home-game-card__title">الألقاب</div>
            <div className="home-game-card__sub">أخفِ هويتك واكشف الآخرين قبل أن يكشفوك</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {['6-50 لاعب', 'متعدد الجولات', 'إثارة وتشويق'].map((t) => (
                <span key={t} className="tag tg" style={{ fontSize: 10 }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="home-game-card__arrow">←</div>
        </div>
      </div>

      {/* بطاقة لعبة القميري */}
      <div
        className="home-game-card home-game-card--fameeri"
        onClick={() => setSelectedGame('qumairi')}
        onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(.98)'; }}
        onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 44 }}>🦅</div>
          <div style={{ flex: 1 }}>
            <div className="home-game-card__title">القميري</div>
            <div className="home-game-card__sub">وزّع القميري على الأشجار واهجم مجموعات الخصوم</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {['2-6 مجموعات', '100 قميري', 'استراتيجية'].map((t) => (
                <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="home-game-card__arrow" style={{ fontSize: 20 }}>←</div>
        </div>
      </div>

      {/* بطاقة حَسْبة */}
      <div
        className="home-game-card home-game-card--hesbah"
        onClick={() => setSelectedGame('hesbah')}
        onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(.98)'; }}
        onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 44 }}>🎯</div>
          <div style={{ flex: 1 }}>
            <div className="home-game-card__title">حَسْبة</div>
            <div className="home-game-card__sub">
              اختر درجتك، أجب بذكاء، ونافس على التتويج
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {['15–30 سؤال', 'تأمين واشتعال', 'رهان حاسم'].map((t) => (
                <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="home-game-card__arrow">←</div>
        </div>
      </div>

      <div className="card2" style={{ borderStyle: 'dashed', textAlign: 'center', padding: '16px', marginBottom: 12 }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>🎲</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>المزيد قادم!</div>
        <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>ألعاب جماعية جديدة على الساحة</div>
      </div>

      <button className="btn bgh" style={{ marginTop: 4, fontSize: 12 }} onClick={() => window.open(`mailto:${SUPPORT_EMAIL}?subject=اقتراح لعبة جديدة`)}>
        💡 اقترح لعبة جديدة
      </button>
    </div>
  );
}
