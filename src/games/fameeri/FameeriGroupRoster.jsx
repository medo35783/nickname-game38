import FameeriGroupChat from './FameeriGroupChat';

/** أعضاء المجموعة + محادثتهم */
export default function FameeriGroupRoster({
  members,
  groupName,
  meUid,
  meMemberId,
  qRoom,
  groupId,
  meName,
  accent,
}) {
  const sorted = [...(members || [])].sort((a, b) => {
    if (a.role === 'leader') return -1;
    if (b.role === 'leader') return 1;
    return (a.name || '').localeCompare(b.name || '', 'ar');
  });
  const leader = sorted.find((m) => m.role === 'leader');

  return (
    <div className="fameeri-team-pane">
      <div className="card fameeri-team-roster">
        <div className="fameeri-team-roster__head">
          <div className="ctitle">👥 فريق {groupName || '—'}</div>
          {leader && (
            <div className="fameeri-team-roster__leader">
              <span className="fameeri-team-roster__leader-badge">👑 القائد</span>
              <span className="fameeri-team-roster__leader-name">{leader.name || '—'}</span>
            </div>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="fameeri-log-empty">لا أعضاء مسجّلين بعد</div>
        ) : (
          <ul className="fameeri-team-roster__list">
            {sorted.map((m) => {
              const isMe = m.id === meMemberId || (meUid && m.ownerUid === meUid);
              return (
                <li
                  key={m.id}
                  className={`fameeri-team-member${m.role === 'leader' ? ' fameeri-team-member--leader' : ''}${isMe ? ' fameeri-team-member--me' : ''}`}
                >
                  <span className="fameeri-team-member__avatar">{m.role === 'leader' ? '👑' : '👤'}</span>
                  <div className="fameeri-team-member__info">
                    <span className="fameeri-team-member__name">{m.name || '—'}</span>
                    <span className="fameeri-team-member__role">
                      {m.role === 'leader' ? 'قائد — يقرر الهجوم والدرع' : 'متسابق'}
                      {isMe ? ' · أنت' : ''}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {groupId && (
        <FameeriGroupChat
          qRoom={qRoom}
          groupId={groupId}
          me={{ uid: meUid, name: meName }}
          accent={accent}
          defaultOpen
          embedded
        />
      )}
    </div>
  );
}
