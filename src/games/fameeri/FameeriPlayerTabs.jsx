/** تبويبات شاشة اللاعب — مجموعتي / الفريق / الهجوم */
export default function FameeriPlayerTabs({ active, onChange, groupBadge, teamBadge, battleBadge }) {
  const tabs = [
    { id: 'group', label: '🌳 مجموعتي', badge: groupBadge },
    { id: 'team', label: '👥 الفريق', badge: teamBadge },
    { id: 'battle', label: '⚔️ الهجوم', badge: battleBadge },
  ];

  return (
    <nav className="fameeri-player-tabs" aria-label="تبويبات اللعب">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`fameeri-player-tab${active === t.id ? ' on' : ''}`}
          onClick={() => onChange(t.id)}
          aria-selected={active === t.id}
        >
          <span className="fameeri-player-tab__label">{t.label}</span>
          {t.badge ? <span className="fameeri-player-tab__badge">{t.badge}</span> : null}
        </button>
      ))}
    </nav>
  );
}
