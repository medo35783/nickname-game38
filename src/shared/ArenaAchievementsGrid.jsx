import { useMemo, useState } from 'react';
import {
  ARENA_ACHIEVEMENT_LIST,
  ARENA_ACHIEVEMENTS,
  ARENA_ACHIEVEMENT_CATEGORIES,
  countAchievementsByCategory,
} from '../core/arenaAchievements';
import '../styles/arena-badge.css';

/**
 * شبكة إنجازات شارة الساحة — مع فئات
 */
export default function ArenaAchievementsGrid({ unlockedIds = [], variant = 'default' }) {
  const unlocked = useMemo(() => new Set(unlockedIds), [unlockedIds]);
  const isLuxury = variant === 'luxury';
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    if (category === 'all') return ARENA_ACHIEVEMENT_LIST;
    return ARENA_ACHIEVEMENT_LIST.filter((def) => def.category === category);
  }, [category]);

  const catCounts = useMemo(
    () =>
      Object.fromEntries(
        ARENA_ACHIEVEMENT_CATEGORIES.map((c) => [c.id, countAchievementsByCategory(unlockedIds, c.id)])
      ),
    [unlockedIds]
  );

  return (
    <div className={`arena-ach-wrap${isLuxury ? ' arena-ach-wrap--luxury' : ''}`}>
      {isLuxury ? (
        <div className="arena-ach-cats" role="tablist" aria-label="فئات الإنجازات">
          {ARENA_ACHIEVEMENT_CATEGORIES.map((cat) => {
            const { open, total } = catCounts[cat.id] || { open: 0, total: 0 };
            const on = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={on}
                className={`arena-ach-cat${on ? ' arena-ach-cat--on' : ''}`}
                onClick={() => setCategory(cat.id)}
              >
                <span className="arena-ach-cat__icon">{cat.icon}</span>
                <span className="arena-ach-cat__label">{cat.label}</span>
                <span className="arena-ach-cat__count">
                  {open}/{total}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={`arena-ach-grid${isLuxury ? ' arena-ach-grid--luxury' : ''}`}>
        {filtered.map((def) => {
          const on = unlocked.has(def.id);
          return (
            <div
              key={def.id}
              className={`arena-ach-item${on ? ' arena-ach-item--on' : ' arena-ach-item--locked'}${isLuxury ? ' arena-ach-item--luxury' : ''}${def.rarity ? ` arena-ach-item--${def.rarity}` : ''}`}
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
    </div>
  );
}

/** عدد الإنجازات المفتوحة */
export function countUnlockedAchievements(unlockedIds = []) {
  return unlockedIds.filter((id) => ARENA_ACHIEVEMENTS[id]).length;
}
