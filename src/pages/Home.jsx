import '../styles/hesbah.css';
import { formatOtherSessionsHint, getAllActiveSessions } from '../shared/gameSessionRegistry';
import { setLastPlayedGame } from '../question-bank/qbank.helpers';

const GAME_BANK_TYPE = {
  nicknames: 'titles',
  qumairi: 'qumayri',
  hesbah: 'hesbah',
};

/** ساحة الألعاب — الألعاب + بوابة صوتك */
export default function Home({ setSelectedGame, onOpenVoiceSuggest }) {
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
        onTouchStart={(e) => {
          e.currentTarget.style.transform = 'scale(.98)';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 44 }}>🎭</div>
          <div style={{ flex: 1 }}>
            <div className="home-game-card__title">الألقاب</div>
            <div className="home-game-card__sub">أخفِ هويتك واكشف الآخرين قبل أن يكشفوك</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {['6-50 لاعب', 'متعدد الجولات', 'إثارة وتشويق'].map((t) => (
                <span key={t} className="tag tg" style={{ fontSize: 10 }}>
                  {t}
                </span>
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
        onTouchStart={(e) => {
          e.currentTarget.style.transform = 'scale(.98)';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 44 }}>🦅</div>
          <div style={{ flex: 1 }}>
            <div className="home-game-card__title">القميري</div>
            <div className="home-game-card__sub">وزّع القميري على الأشجار واهجم مجموعات الخصوم</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {['2-6 مجموعات', '100 قميري', 'استراتيجية'].map((t) => (
                <span key={t} className="tag" style={{ fontSize: 10 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="home-game-card__arrow" style={{ fontSize: 20 }}>
            ←
          </div>
        </div>
      </div>

      <div
        className="home-game-card home-game-card--hesbah"
        onClick={() => {
          setLastPlayedGame(GAME_BANK_TYPE.hesbah);
          setSelectedGame('hesbah');
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.transform = 'scale(.98)';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 44 }}>🎯</div>
          <div style={{ flex: 1 }}>
            <div className="home-game-card__title">حَسْبة</div>
            <div className="home-game-card__sub">اختر درجتك، أجب بذكاء، ونافس على التتويج</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {['15–30 سؤال', 'تأمين واشتعال', 'رهان حاسم'].map((t) => (
                <span key={t} className="tag" style={{ fontSize: 10 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="home-game-card__arrow">←</div>
        </div>
      </div>

      <section className="home-teaser-zone" aria-label="قادم وصوتك">
        <div className="home-coming-teaser">
          <span className="home-coming-teaser__glow" aria-hidden />
          <span className="home-coming-teaser__badge">قريباً</span>
          <div className="home-coming-teaser__icon" aria-hidden>
            🎲
          </div>
          <div className="home-coming-teaser__title">المزيد قادم!</div>
          <div className="home-coming-teaser__sub">ألعاب جماعية جديدة على الساحة — استعدوا للمفاجآت</div>
        </div>

        <button
          type="button"
          className="home-suggest-entry"
          onClick={() => onOpenVoiceSuggest?.()}
        >
          <span className="home-suggest-entry__shine" aria-hidden />
          <span className="home-suggest-entry__icon" aria-hidden>
            💡
          </span>
          <span className="home-suggest-entry__body">
            <span className="home-suggest-entry__title">اقترح لعبة جديدة</span>
            <span className="home-suggest-entry__sub">
              صوتك يهمنا — شاركنا فكرتك ونوصلها للفريق
            </span>
          </span>
          <span className="home-suggest-entry__chevron" aria-hidden>
            ←
          </span>
        </button>
      </section>
    </div>
  );
}
