import ArenaBadge from './ArenaBadge';
import '../styles/arena-badge.css';

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

/**
 * بطاقتا الشارة والإنجازات — واجهة فاخرة، جوهر حساب المتسابق
 */
export default function ArenaAccountShowcase({
  avatarIcon,
  avatarFrame,
  points,
  tierLabel,
  achUnlocked,
  achTotal,
  onIconOpen,
  onAchOpen,
}) {
  const achPct = achTotal > 0 ? Math.round((achUnlocked / achTotal) * 100) : 0;

  return (
    <section className="arena-showcase" aria-label="شارتك وإنجازاتك">
      <div className="arena-showcase__head">
        <span className="arena-showcase__spark" aria-hidden>
          ✦
        </span>
        <h3 className="arena-showcase__title">شارتي وإنجازاتي</h3>
      </div>

      <div className="arena-showcase__grid">
        <button
          type="button"
          className="arena-showcase-card arena-showcase-card--badge"
          onClick={onIconOpen}
        >
          <div className="arena-showcase-card__glow arena-showcase-card__glow--gold" aria-hidden />
          <div className="arena-showcase-card__visual">
            <ArenaBadge
              icon={avatarIcon}
              frame={avatarFrame}
              points={points}
              tierLabel={tierLabel}
              size={58}
              showMeta={false}
            />
          </div>
          <span className="arena-showcase-card__title">تخصيص الشارة</span>
          <span className="arena-showcase-card__sub">الأيقونة والإطار</span>
          <span className="arena-showcase-card__cta">تخصيص ‹</span>
        </button>

        <button
          type="button"
          className="arena-showcase-card arena-showcase-card--ach"
          onClick={onAchOpen}
        >
          <div className="arena-showcase-card__glow arena-showcase-card__glow--purple" aria-hidden />
          <div className="arena-showcase-card__visual arena-showcase-card__visual--ach">
            <div className="arena-showcase-ach-ring" style={{ '--pct': `${achPct}%` }}>
              <span className="arena-showcase-ach-ring__icon">🏅</span>
            </div>
            <span className="arena-showcase-ach-ring__count">
              {fmt(achUnlocked)}
              <small>/{fmt(achTotal)}</small>
            </span>
          </div>
          <span className="arena-showcase-card__title">الإنجازات</span>
          <span className="arena-showcase-card__sub">{fmt(achPct)}% مفتوح</span>
          <span className="arena-showcase-card__cta">استعرض ‹</span>
        </button>
      </div>
    </section>
  );
}
