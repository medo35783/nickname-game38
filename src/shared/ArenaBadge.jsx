import { computeArenaTier } from '../core/arena.constants';

/**
 * عرض شارة الساحة — أيقونة + إطار المستوى + بيانات اختيارية
 */
export default function ArenaBadge({
  icon = '🎮',
  frame,
  points = 0,
  name,
  tierLabel,
  size = 64,
  showMeta = true,
  compact = false,
}) {
  const tier = computeArenaTier(points);
  const resolvedFrame = frame || tier.frame;

  return (
    <div className={`arena-badge${compact ? ' arena-badge--compact' : ''}`}>
      <div
        className={`arena-badge__ring arena-badge__ring--${resolvedFrame}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <span className="arena-badge__icon" style={{ fontSize: Math.round(size * 0.46) }}>
          {icon}
        </span>
      </div>
      {showMeta && (
        <div className="arena-badge__meta">
          {name ? <div className="arena-badge__name">{name}</div> : null}
          {!compact && (
            <div className="arena-badge__stats">
              <span className="arena-badge__tier">{tierLabel || tier.label}</span>
              {points > 0 ? (
                <>
                  <span className="arena-badge__sep">·</span>
                  <span className="arena-badge__pts">{points.toLocaleString('ar-SA')} نقطة</span>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
