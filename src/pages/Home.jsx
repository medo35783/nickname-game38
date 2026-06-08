import '../styles/hesbah.css';
import '../styles/knowledge-chest.css';
import { formatOtherSessionsHint, getAllActiveSessions } from '../shared/gameSessionRegistry';
import { setLastPlayedGame } from '../question-bank/qbank.helpers';

const GAME_BANK_TYPE = {
  nicknames: 'titles',
  qumairi: 'qumayri',
  hesbah: 'hesbah',
};

export default function Home({ setSelectedGame, onOpenContribute, onSuggestGame, bankTotal }) {
  const activeSessions = getAllActiveSessions();

  return (
    <div className="scr">
      {activeSessions.length > 0 && (
        <div className="game-multi-session-hint" style={{ marginBottom: 14 }}>
          جلسات نشطة: {formatOtherSessionsHint(activeSessions)} — افتح اللعبة واضغط «العودة للغرفة»
        </div>
      )}
      <div style={{ textAlign: 'center', padding: '18px 0 14px' }}>
        <div style={{ fontSize: 42, marginBottom: 6 }}>🏟️</div>
        <div className="ptitle" style={{ fontSize: 24 }}>ساحة الألعاب</div>
        <div className="psub">ألعاب جماعية تفاعلية للرحلات والاجتماعات والمناسبات</div>
      </div>

      <div
        className="home-game-card home-game-card--nicknames"
        onClick={() => {
          setLastPlayedGame(GAME_BANK_TYPE.nicknames);
          setSelectedGame('nicknames');
        }}
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

      <div
        className="home-game-card home-game-card--fameeri"
        onClick={() => {
          setLastPlayedGame(GAME_BANK_TYPE.qumairi);
          setSelectedGame('qumairi');
        }}
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

      <div
        className="home-game-card home-game-card--hesbah"
        onClick={() => {
          setLastPlayedGame(GAME_BANK_TYPE.hesbah);
          setSelectedGame('hesbah');
        }}
        onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(.98)'; }}
        onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 44 }}>🎯</div>
          <div style={{ flex: 1 }}>
            <div className="home-game-card__title">حَسْبة</div>
            <div className="home-game-card__sub">اختر درجتك، أجب بذكاء، ونافس على التتويج</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {['15–30 سؤال', 'تأمين واشتعال', 'رهان حاسم'].map((t) => (
                <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="home-game-card__arrow">←</div>
        </div>
      </div>

      <div className="qbank-section">
        <div className="qbank-section__label">بنك الأسئلة المركزي</div>
        <button type="button" className="qbank-entry" onClick={() => onOpenContribute?.()}>
          <span className="qbank-entry__badge">ساهم معنا</span>
          <div className="qbank-entry__icon">🗂️</div>
          <div className="qbank-entry__body">
            <div className="qbank-entry__title">اقترح سؤالاً للبنك</div>
            <div className="qbank-entry__sub">
              ساعدنا نوسّع بنك الأسئلة — يُراجع ويُصنَّف ويُستخدم في الألعاب
            </div>
            {bankTotal != null ? (
              <div className="qbank-entry__meta">{bankTotal} سؤال جاهز في البنك</div>
            ) : null}
          </div>
          <span className="qbank-entry__chevron">‹</span>
        </button>
      </div>

      <div className="home-suggest-section">
        <div className="home-coming-teaser">
          <div className="home-coming-teaser__icon">🎲</div>
          <div className="home-coming-teaser__title">المزيد قادم!</div>
          <div className="home-coming-teaser__sub">ألعاب جماعية جديدة على الساحة</div>
        </div>

        <button type="button" className="home-suggest-entry" onClick={() => onSuggestGame?.()}>
          <div className="home-suggest-entry__icon">💡</div>
          <div className="home-suggest-entry__body">
            <div className="home-suggest-entry__title">اقترح لعبة جديدة</div>
            <div className="home-suggest-entry__sub">صوّتك — شاركنا فكرتك ونوصلها للفريق</div>
          </div>
          <span className="home-suggest-entry__chevron">‹</span>
        </button>
      </div>
    </div>
  );
}
