/** أعضاء المجموعة للمشرف — قائد + متسابقون */
export default function FameeriAdminGroupRoster({ members = [], compact = false, emptyLabel = 'لا أعضاء' }) {
  const sorted = [...members].sort((a, b) => {
    if (a.role === 'leader') return -1;
    if (b.role === 'leader') return 1;
    return (a.name || '').localeCompare(b.name || '', 'ar');
  });

  if (sorted.length === 0) {
    return <div className="fameeri-admin-roster__empty">{emptyLabel}</div>;
  }

  if (compact) {
    return (
      <div className="fameeri-admin-roster fameeri-admin-roster--compact">
        {sorted.map((m) => (
          <span
            key={m.id}
            className={`fameeri-admin-roster__chip${m.role === 'leader' ? ' fameeri-admin-roster__chip--leader' : ''}`}
          >
            {m.role === 'leader' ? '👑' : '👤'} {m.name || '—'}
          </span>
        ))}
      </div>
    );
  }

  return (
    <ul className="fameeri-admin-roster">
      {sorted.map((m) => (
        <li
          key={m.id}
          className={`fameeri-admin-roster__row${m.role === 'leader' ? ' fameeri-admin-roster__row--leader' : ''}`}
        >
          <span className="fameeri-admin-roster__ico">{m.role === 'leader' ? '👑' : '👤'}</span>
          <span className="fameeri-admin-roster__name">{m.name || '—'}</span>
          <span className="fameeri-admin-roster__role">
            {m.role === 'leader' ? 'قائد' : 'متسابق'}
          </span>
        </li>
      ))}
    </ul>
  );
}
