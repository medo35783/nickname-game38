import { useMemo, useState } from 'react';
import { memberPresenceStatus } from './fameeriMemberPresence';

function MemberRow({ member, presenceMap, onAssignLeader, assigning }) {
  const status = memberPresenceStatus(member, presenceMap);
  const isLeader = member.role === 'leader';

  return (
    <div className={`fameeri-admin-team-member${isLeader ? ' fameeri-admin-team-member--leader' : ''}`}>
      <span className={`fameeri-admin-team-member__dot fameeri-admin-team-member__dot--${status.dot}`} />
      <div className="fameeri-admin-team-member__info">
        <span className="fameeri-admin-team-member__name">
          {isLeader ? '👑 ' : ''}
          {member.name || '—'}
        </span>
        <span className={`fameeri-admin-team-member__status fameeri-admin-team-member__status--${status.tone}`}>
          {isLeader ? 'قائد · ' : ''}
          {status.label}
        </span>
      </div>
      {!isLeader && onAssignLeader && (
        <button
          type="button"
          className="btn bg bxs fameeri-admin-team-member__promote"
          disabled={assigning}
          onClick={() => onAssignLeader(member)}
        >
          👑 قائد
        </button>
      )}
    </div>
  );
}

/** لوحة الفرق الدائمة للمشرف — حضور + أسماء + تعيين قائد */
export default function FameeriAdminTeamsPanel({
  qGList,
  membersByGroup,
  presenceMap = {},
  unassigned = [],
  assignGroupLeader,
  assistMode,
}) {
  const [open, setOpen] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [expanded, setExpanded] = useState(() => ({}));

  const allMembers = useMemo(
    () => [
      ...Object.values(membersByGroup).flat(),
      ...unassigned,
    ],
    [membersByGroup, unassigned]
  );

  const onlineCount = useMemo(
    () =>
      allMembers.filter((m) => memberPresenceStatus(m, presenceMap).tone === 'online').length,
    [allMembers, presenceMap]
  );

  const handleAssignLeader = async (groupId, member) => {
    if (!assignGroupLeader || assigning) return;
    if (!window.confirm(`تعيين "${member.name}" قائداً لهذه المجموعة؟`)) return;
    setAssigning(true);
    try {
      await assignGroupLeader(groupId, member);
    } finally {
      setAssigning(false);
    }
  };

  const toggleGroup = (gid) => {
    setExpanded((prev) => ({ ...prev, [gid]: !prev[gid] }));
  };

  if (qGList.length === 0 && unassigned.length === 0) return null;

  return (
    <div className={`card fameeri-admin-teams-panel${open ? ' fameeri-admin-teams-panel--open' : ''}`}>
      <button
        type="button"
        className="fameeri-admin-teams-panel__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="fameeri-admin-teams-panel__title-wrap">
          <span className="fameeri-admin-teams-panel__title">👥 الفرق والحضور</span>
          <span className="fameeri-admin-teams-panel__stats">
            <span className="fameeri-admin-teams-panel__stat online">● {onlineCount} متصل</span>
            <span className="fameeri-admin-teams-panel__stat offline">
              ○ {Math.max(0, allMembers.length - onlineCount)} غائب
            </span>
          </span>
        </div>
        <span className="fameeri-admin-teams-panel__chevron">{open ? '▼' : '◀'}</span>
      </button>

      {open && (
        <div className="fameeri-admin-teams-panel__body">
          {assistMode && (
            <p className="fameeri-admin-teams-panel__hint">
              📱 وضع بدون جوالات — المشرف يتحكم بالمجموعات مباشرة
            </p>
          )}

          {qGList.map((g) => {
            const members = membersByGroup[g.id] || [];
            const leader = members.find((m) => m.role === 'leader');
            const isExpanded = expanded[g.id] !== false;

            return (
              <div key={g.id} className="fameeri-admin-team-card">
                <button
                  type="button"
                  className="fameeri-admin-team-card__head"
                  onClick={() => toggleGroup(g.id)}
                >
                  <div className="fameeri-admin-team-card__name-row">
                    <span className="fameeri-group-name">{g.name}</span>
                    <span className="fameeri-admin-team-card__birds">{g.totalRemaining ?? 0} 🐦</span>
                  </div>
                  <div className="fameeri-admin-team-card__meta">
                    {leader ? (
                      <span>👑 {leader.name}</span>
                    ) : (
                      <span className="warn">⚠️ بدون قائد</span>
                    )}
                    <span>
                      {members.filter((m) => memberPresenceStatus(m, presenceMap).tone === 'online').length}/
                      {members.length} متصل
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="fameeri-admin-team-card__members">
                    {members.length === 0 ? (
                      <div className="fameeri-admin-roster__empty">لا أعضاء في هذه المجموعة</div>
                    ) : (
                      members
                        .sort((a, b) => (a.role === 'leader' ? -1 : b.role === 'leader' ? 1 : 0))
                        .map((m) => (
                          <MemberRow
                            key={m.id}
                            member={m}
                            presenceMap={presenceMap}
                            assigning={assigning}
                            onAssignLeader={
                              assignGroupLeader
                                ? () => void handleAssignLeader(g.id, m)
                                : null
                            }
                          />
                        ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {unassigned.length > 0 && (
            <div className="fameeri-admin-team-card fameeri-admin-team-card--unassigned">
              <div className="fameeri-admin-team-card__head fameeri-admin-team-card__head--static">
                <span className="fameeri-admin-team-card__name-row">
                  <span>⏳ بدون مجموعة</span>
                  <span>{unassigned.length}</span>
                </span>
              </div>
              <div className="fameeri-admin-team-card__members">
                {unassigned.map((m) => (
                  <MemberRow key={m.id} member={m} presenceMap={presenceMap} />
                ))}
              </div>
            </div>
          )}

          {allMembers.some((m) => !m.ownerUid) && (
            <p className="fameeri-admin-teams-panel__footnote">
              الأعضاء «بدون حساب» لا يظهر حضورهم تلقائياً — يعتمد المشرف على أسمائهم في اللوبي
            </p>
          )}
        </div>
      )}
    </div>
  );
}
