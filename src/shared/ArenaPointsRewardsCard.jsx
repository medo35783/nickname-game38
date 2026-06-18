import { useMemo } from 'react';
import {
  ARENA_POINTS_EARNING,
  ARENA_POINTS_REWARDS,
  computeArenaTier,
  nextTierProgress,
} from '../core/arena.constants';
import '../styles/arena-badge.css';

/**
 * بطاقة مقابل النقاط — كيف تكسبها وماذا تفتح
 */
export default function ArenaPointsRewardsCard({ points = 0, variant = 'full' }) {
  const tier = computeArenaTier(points);
  const progress = nextTierProgress(points);
  const currentReward = useMemo(() => {
    let row = ARENA_POINTS_REWARDS[0];
    for (const r of ARENA_POINTS_REWARDS) {
      if (points >= r.minPoints) row = r;
    }
    return row;
  }, [points]);

  const isCompact = variant === 'compact';

  return (
    <div className={`arena-rewards-card${isCompact ? ' arena-rewards-card--compact' : ''}`}>
      <div className="arena-rewards-card__head">
        <span className="arena-rewards-card__icon">{currentReward.icon}</span>
        <div>
          <div className="arena-rewards-card__title">مقابل نقاط الساحة</div>
          <div className="arena-rewards-card__sub">
            مستواك: <strong>{tier.label}</strong>
            {progress.next ? (
              <>
                {' '}
                — {progress.remaining} نقطة للـ{progress.next.label}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {progress.next ? (
        <div className="arena-tier-bar arena-rewards-card__bar">
          <div className="arena-tier-bar__track">
            <div
              className="arena-tier-bar__fill"
              style={{ width: `${Math.round(progress.progress * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="arena-rewards-section">
        <div className="arena-rewards-section__label">🎁 ما الذي تفتحه بالنقاط</div>
        <div className="arena-rewards-tiers">
          {ARENA_POINTS_REWARDS.map((row) => {
            const unlocked = points >= row.minPoints;
            return (
              <div
                key={row.tierId}
                className={`arena-rewards-tier${unlocked ? ' arena-rewards-tier--on' : ''}`}
              >
                <span className="arena-rewards-tier__icon">{row.icon}</span>
                <div className="arena-rewards-tier__body">
                  <strong>
                    {row.label} — {row.minPoints.toLocaleString('ar-SA')}+
                  </strong>
                  <span>{row.frame} · {row.iconCount} أيقونة</span>
                  {!isCompact ? (
                    <ul className="arena-rewards-tier__perks">
                      {row.perks.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {unlocked ? <span className="arena-rewards-tier__check">✓</span> : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="arena-rewards-section">
        <div className="arena-rewards-section__label">⚡ كيف تكسب النقاط</div>
        <div className="arena-rewards-earn">
          {ARENA_POINTS_EARNING.map((row) => (
            <div key={row.label} className="arena-rewards-earn__row">
              <span className="arena-rewards-earn__icon">{row.icon}</span>
              <span className="arena-rewards-earn__label">{row.label}</span>
              <span className="arena-rewards-earn__pts">
                +{typeof row.points === 'number' ? row.points : row.points}
              </span>
            </div>
          ))}
        </div>
        <p className="arena-rewards-footnote">
          المشرف يكسب أكثر مع كل لاعب — كلما جمعت أكثر، زادت أيقوناتك وإطار شارتك في الساحة.
        </p>
      </div>
    </div>
  );
}
