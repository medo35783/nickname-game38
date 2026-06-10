import { ARENA_ACHIEVEMENT_LIST, ARENA_ACHIEVEMENTS } from '../core/arenaAchievements';
import '../styles/arena-badge.css';

/**
 * شبكة إنجازات شارة الساحة
 */
export default function ArenaAchievementsGrid({ unlockedIds = [], variant = 'default' }) {
  const unlocked = new Set(unlockedIds);
  const isLuxury = variant === 'luxury';

  return (
    <div className={`arena-ach-grid${isLuxury ? ' arena-ach-grid--luxury' : ''}`}>
      {ARENA_ACHIEVEMENT_LIST.map((def) => {
        const on = unlocked.has(def.id);
        return (
          <div
            key={def.id}
            className={`arena-ach-item${on ? ' arena-ach-item--on' : ' arena-ach-item--locked'}${isLuxury ? ' arena-ach-item--luxury' : ''}`}
            title={def.desc}
          >
            <span className="arena-ach-item__icon-wrap" aria-hidden>
              {on ? (
                <span className="arena-ach-item__icon">{def.icon}</span>
              ) : (
                <>
                  <span className="arena-ach-item__icon arena-ach-item__icon--ghost">{def.icon}</span>
                  <span className="arena-ach-item__lock-badge">🔒</span>
                </>
              )}
            </span>
            <span className="arena-ach-item__label">{def.label}</span>
            <span className="arena-ach-item__hint">{def.desc}</span>
            {on && isLuxury ? <span className="arena-ach-item__badge">مفتوح</span> : null}
          </div>
        );
      })}
    </div>
  );
}

/** عدد الإنجازات المفتوحة */
export function countUnlockedAchievements(unlockedIds = []) {
  return unlockedIds.filter((id) => ARENA_ACHIEVEMENTS[id]).length;
}
