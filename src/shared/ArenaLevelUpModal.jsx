import { useEffect } from 'react';
import { ARENA_ACHIEVEMENTS } from '../core/arenaAchievements';
import { ARENA_TIER_THRESHOLDS, iconsUnlockedForPoints } from '../core/arena.constants';
import ArenaBadge from './ArenaBadge';
import '../styles/arena-badge.css';

const TIER_EMOJI = {
  bronze: '🥉',
  silver: '⚪',
  gold: '🥇',
  legend: '💫',
};

/**
 * احتفال ترقية المستوى أو إنجاز جديد
 */
export default function ArenaLevelUpModal({ celebration, onClose }) {
  useEffect(() => {
    if (!celebration) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [celebration, onClose]);

  if (!celebration) return null;

  const {
    tierUpgraded,
    newTier,
    newTierLabel,
    pointsAwarded = 0,
    totalPoints = 0,
    newAchievements = [],
    displayName,
    avatarIcon = '🎮',
  } = celebration;

  const hasAchievements = newAchievements.length > 0;
  const tierDef = ARENA_TIER_THRESHOLDS.find((t) => t.id === newTier);
  const unlockedIcons = iconsUnlockedForPoints(totalPoints).slice(-3);

  const stop = (e) => e.stopPropagation();

  return (
    <div className="arena-lvl-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="arena-lvl-card" onClick={stop}>
        <div className="arena-lvl-confetti" aria-hidden>
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} className="arena-lvl-confetti__bit" style={{ '--i': i }} />
          ))}
        </div>

        {tierUpgraded ? (
          <>
            <div className="arena-lvl-emoji">{TIER_EMOJI[newTier] || '🏟️'}</div>
            <h2 className="arena-lvl-title">ترقية مستوى!</h2>
            <p className="arena-lvl-sub">
              وصلت لمستوى <strong>{newTierLabel || tierDef?.label}</strong>
            </p>
          </>
        ) : (
          <>
            <div className="arena-lvl-emoji">🏅</div>
            <h2 className="arena-lvl-title">إنجاز جديد!</h2>
          </>
        )}

        <div className="arena-lvl-badge-wrap">
          <ArenaBadge
            icon={avatarIcon}
            frame={tierDef?.frame || newTier}
            points={totalPoints}
            name={displayName || 'محارب الساحة'}
            tierLabel={newTierLabel}
            size={72}
          />
        </div>

        {pointsAwarded > 0 ? (
          <div className="arena-lvl-points">+{pointsAwarded} نقطة ساحة</div>
        ) : null}

        {hasAchievements ? (
          <ul className="arena-lvl-achievements">
            {newAchievements.map((id) => {
              const def = ARENA_ACHIEVEMENTS[id];
              if (!def) return null;
              return (
                <li key={id}>
                  <span aria-hidden>{def.icon}</span>
                  <span>
                    <strong>{def.label}</strong>
                    <small>{def.desc}</small>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {tierUpgraded && unlockedIcons.length > 0 ? (
          <div className="arena-lvl-unlock">
            <div className="arena-lvl-unlock__label">أيقونات مفتوحة</div>
            <div className="arena-lvl-unlock__icons">
              {unlockedIcons.map((ic) => (
                <span key={ic}>{ic}</span>
              ))}
            </div>
          </div>
        ) : null}

        <button type="button" className="btn bg arena-lvl-cta" onClick={onClose}>
          رائع! 🎉
        </button>
      </div>
    </div>
  );
}
