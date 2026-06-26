import '../styles/hesbah.css';
import '../styles/home-game-icons.css';
import { formatOtherSessionsHint, getAllActiveSessions } from '../shared/gameSessionRegistry';
import { setLastPlayedGame } from '../question-bank/qbank.helpers';
import La3ibzBrandMark from '../shared/La3ibzBrandMark';
import HomeGameIcon from '../shared/HomeGameIcons';
import PwaInstallCard from '../components/layout/PwaInstallCard';
import LobbyPromoStrip from '../shared/LobbyPromoStrip';

const GAME_BANK_TYPE = {
  nicknames: 'titles',
  qumairi: 'qumayri',
  hesbah: 'hesbah',
};

/** لعيب زون — الألعاب + بوابة صوتك */
export default function Home({ setSelectedGame, onOpenVoiceSuggest, notify }) {
  const activeSessions = getAllActiveSessions();

  return (
    <div className="scr">
      {activeSessions.length > 0 && (
        <div className="game-multi-session-hint" style={{ marginBottom: 14 }}>
          جلسات نشطة: {formatOtherSessionsHint(activeSessions)} — افتح اللعبة واضغط «العودة للغرفة»
        </div>
      )}
      <div className="home-brand-wrap">
        <La3ibzBrandMark variant="hero" />
      </div>

      <PwaInstallCard notify={notify} compact />

      <LobbyPromoStrip />

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
        <div className="home-game-card__row">
          <HomeGameIcon game="nicknames" />
          <div className="home-game-card__body">
            <div className="home-game-card__title">الألقاب</div>
            <div className="home-game-card__sub">أخفِ هويتك واكشف الآخرين قبل أن يكشفوك</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {['6-50 لاعب', 'متعدد الجولات', 'إثارة وتشويق'].map((t) => (
                <span key={t} className="tag" style={{ fontSize: 10 }}>
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
        <div className="home-game-card__row">
          <HomeGameIcon game="fameeri" />
          <div className="home-game-card__body">
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
        <div className="home-game-card__row">
          <HomeGameIcon game="hesbah" />
          <div className="home-game-card__body">
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
        <div className="home-teaser-card">
          <span className="home-teaser-card__glow" aria-hidden />

          <div className="home-teaser-card__soon">
            <span className="home-teaser-card__badge">قريباً</span>
            <div className="home-teaser-card__icon" aria-hidden>
              🎲
            </div>
            <div className="home-teaser-card__title">المزيد قادم!</div>
            <div className="home-teaser-card__sub">ألعاب جماعية جديدة على الساحة — استعدوا للمفاجآت</div>
          </div>

          <div className="home-teaser-card__spectrum" aria-hidden />

          <button
            type="button"
            className="home-teaser-card__suggest"
            onClick={() => onOpenVoiceSuggest?.()}
          >
            <span className="home-teaser-card__suggest-shine" aria-hidden />
            <span className="home-teaser-card__suggest-icon" aria-hidden>
              💡
            </span>
            <span className="home-teaser-card__suggest-body">
              <span className="home-teaser-card__suggest-title">اقترح لعبة جديدة</span>
              <span className="home-teaser-card__suggest-sep" aria-hidden>·</span>
              <span className="home-teaser-card__suggest-sub">
                صوتك يهمنا — شاركنا فكرتك ونوصلها للفريق
              </span>
            </span>
            <span className="home-teaser-card__suggest-chevron" aria-hidden>
              ←
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
