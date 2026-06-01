import { useEffect, useState } from 'react';

export default function FameeriAdminGroupHead({
  group,
  members,
  leader,
  assistMode,
  canManage,
  canDelete,
  onRename,
  onDelete,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.name);

  useEffect(() => {
    if (!editing) setDraft(group.name);
  }, [group.name, editing]);

  const saveRename = async () => {
    const ok = await onRename?.(draft);
    if (ok !== false) setEditing(false);
  };

  return (
    <div className="fameeri-admin-group-card__head">
      <div className="fameeri-admin-group-card__title">
        {editing ? (
          <div className="fameeri-admin-inline-form fameeri-admin-group-rename">
            <input
              className="inp"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveRename();
                if (e.key === 'Escape') {
                  setDraft(group.name);
                  setEditing(false);
                }
              }}
              autoFocus
            />
            <button type="button" className="btn bg bxs" disabled={!draft.trim()} onClick={() => void saveRename()}>
              ✓
            </button>
            <button
              type="button"
              className="btn bgh bxs"
              onClick={() => {
                setDraft(group.name);
                setEditing(false);
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <span className="fameeri-group-name">{group.name}</span>
        )}
        <span className="fameeri-admin-group-card__meta">
          {members.length} عضو{leader ? ` · 👑 ${leader.name}` : assistMode ? '' : ' · ⚠️ بدون قائد'}
        </span>
      </div>

      {canManage && !editing && (
        <div className="fameeri-admin-group-card__actions">
          <button type="button" className="btn bgh bxs" title="تغيير الاسم" onClick={() => setEditing(true)}>
            ✏️
          </button>
          {canDelete && (
            <button type="button" className="btn br bxs" title="حذف المجموعة" onClick={() => void onDelete?.()}>
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  );
}
