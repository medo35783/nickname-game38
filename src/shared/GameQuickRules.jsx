/** عرض القوانين السريعة — موحّد لكل الألعاب (ألوان حسب اللعبة) */
export default function GameQuickRules({
  rules,
  title = 'مراحل سريعة',
  game = null,
  className = '',
}) {
  if (!rules?.length) return null;

  const themeMod = game ? ` game-quick-rules-wrap--${game}` : '';

  return (
    <section
      className={`game-quick-rules-wrap${themeMod}${className ? ` ${className}` : ''}`}
      aria-label={title}
    >
      <div className="game-quick-rules__head">{title}</div>
      <ol className="game-quick-rules__list">
        {rules.map((rule, index) => (
          <li key={rule.text || index} className="game-quick-rules__item">
            <span className="game-quick-rules__num" aria-hidden="true">
              {index + 1}
            </span>
            <span className="game-quick-rules__icon" aria-hidden="true">
              {rule.icon}
            </span>
            <div className="game-quick-rules__body">
              <p className="game-quick-rules__text">{rule.text}</p>
              {rule.chips?.length > 0 && (
                <div className="game-quick-rules__chips">
                  {rule.chips.map((chip) => (
                    <span
                      key={chip.label}
                      className={`game-quick-rules__chip game-quick-rules__chip--${chip.tone || 'neutral'}`}
                    >
                      <span aria-hidden="true">{chip.icon}</span>
                      {chip.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
