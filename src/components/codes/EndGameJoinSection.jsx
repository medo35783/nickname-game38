import { arenaPointsForRank } from '../../core/arena.constants';
import ArenaSignupPrompt from '../../shared/ArenaSignupPrompt';

/**
 * قسم مضمّن أسفل شاشة النتائج — دعوة للتسجيل دون إخفاء شاشة التتويج.
 */
export default function EndGameJoinSection({
  playerStats,
  isGuest = false,
  arenaReward = 0,
  onArenaSignup,
  onTryFree,
  onPackages,
}) {
  const rank = playerStats?.rank;
  const pendingArenaPoints =
    isGuest && rank != null ? arenaPointsForRank(rank) : 0;

  return (
    <section className="egjs" aria-label="انضم للساحة">
      {rank != null && (
        <div className="egjs__rank card">
          <div className="egjs__rank-label">ترتيبك في المسابقة</div>
          <div className="egjs__rank-num">{rank}</div>
        </div>
      )}

      {arenaReward > 0 && (
        <div className="egjs__arena card">
          <div className="egjs__arena-icon" aria-hidden>🏟️</div>
          <div className="egjs__arena-pts">+{arenaReward} نقطة ساحة</div>
          <p className="egjs__arena-hint">أُضيفت لشارتك في قاعة المجد</p>
        </div>
      )}

      {isGuest && typeof onArenaSignup === 'function' ? (
        <ArenaSignupPrompt
          variant="compact"
          pendingPoints={pendingArenaPoints}
          title="انضم معنا واحفظ تقدمك"
          onSignup={onArenaSignup}
          dismissLabel={null}
        />
      ) : null}

      <div className="egjs__pitch card">
        <div className="egjs__pitch-icon" aria-hidden>💎</div>
        <div className="egjs__pitch-title">هل استمتعت بالمسابقة؟</div>
        <p className="egjs__pitch-sub">
          أنشئ غرفتك الخاصة وادعُ من تحب — أو اشترك واستمتع بمزايا المشرف الكاملة
        </p>
      </div>

      <div className="egjs__actions">
        {typeof onTryFree === 'function' && (
          <button type="button" className="btn bg" onClick={onTryFree}>
            📝 إنشاء حساب — كن مشرفاً
          </button>
        )}
        {typeof onPackages === 'function' && (
          <button type="button" className="btn bo" onClick={onPackages}>
            💳 استكشف الباقات
          </button>
        )}
      </div>
    </section>
  );
}
