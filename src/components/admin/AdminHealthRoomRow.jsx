/**
 * صف غرفة واحدة — إنهاء / حذف
 */
export default function AdminHealthRoomRow({
  room,
  busyId,
  onEnd,
  onDelete,
  showHostBadge = false,
}) {
  return (
    <li className="admin-health-room">
      <div className="admin-health-room__main">
        <span>
          {room.gameIcon} {room.gameLabel} · <code>{room.roomCode}</code>
          {room.legacyCode ? (
            <span className="admin-pulse-chip admin-pulse-chip--warn">رمز قديم</span>
          ) : null}
          {showHostBadge ? (
            <span className={`admin-health-host-badge admin-health-host-badge--${room.hostTone || 'admin'}`}>
              {room.hostLabel}
            </span>
          ) : null}
          {room.isOrphanCandidate ? (
            <span className="admin-pulse-chip admin-pulse-chip--warn">يتيمة</span>
          ) : null}
        </span>
        <span className="admin-health-room__age">
          {room.ageHours != null ? `${room.ageHours} س` : '—'}
        </span>
      </div>
      <div className="admin-health-room__meta">
        {room.phaseLabel}
        {room.playerCount != null ? ` · ${room.playerCount} لاعب` : ''}
        {room.sessionStart
          ? ` · بدأت ${new Date(room.sessionStart).toLocaleString('ar-SA', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}`
          : ''}
      </div>
      <div className="admin-health-room__actions">
        <button
          type="button"
          className="btn btn--sm btn--gold"
          disabled={busyId === room.id}
          onClick={() => onEnd(room)}
        >
          إنهاء
        </button>
        <button
          type="button"
          className="btn btn--sm btn--danger"
          disabled={busyId === room.id}
          onClick={() => onDelete(room)}
        >
          حذف
        </button>
      </div>
    </li>
  );
}
