/**
 * تبديل الوضع النهاري / الليلي
 * @param {'compact'|'account'} variant
 */
export default function ThemeToggle({
  theme,
  followSystem,
  onToggle,
  onSetTheme,
  onFollowSystem,
  variant = 'compact',
}) {
  const isDark = theme === 'dark';
  const label = isDark ? 'الوضع الليلي' : 'الوضع النهاري';
  const nextHint = isDark ? 'التبديل إلى النهاري' : 'التبديل إلى الليلي';

  if (variant === 'account') {
    return (
      <div className="theme-settings">
        <p className="theme-settings-hint">
          {followSystem
            ? 'يتبع إعدادات جهازك تلقائياً'
            : `مفعّل يدوياً: ${label}`}
        </p>
        <div className="theme-settings-actions">
          <button
            type="button"
            className={`theme-seg${!isDark ? ' on' : ''}`}
            onClick={() => onSetTheme?.('light')}
            aria-pressed={!isDark}
          >
            <span className="theme-seg-ico" aria-hidden="true">
              ☀️
            </span>
            نهاري
          </button>
          <button
            type="button"
            className={`theme-seg${isDark ? ' on' : ''}`}
            onClick={() => onSetTheme?.('dark')}
            aria-pressed={isDark}
          >
            <span className="theme-seg-ico" aria-hidden="true">
              🌙
            </span>
            ليلي
          </button>
        </div>
        {!followSystem ? (
          <button type="button" className="theme-sync-btn" onClick={onFollowSystem}>
            ↻ مزامنة مع إعداد الجهاز
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={nextHint}
      title={nextHint}
    >
      <span className="theme-toggle-ico" aria-hidden="true">
        {isDark ? '☀️' : '🌙'}
      </span>
    </button>
  );
}
