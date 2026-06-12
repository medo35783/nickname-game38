import { useMemo, useState } from 'react';
import { Q_WEAPONS } from '../../core/constants';
import {
  filterAttacks,
  fmtAttackTime,
  playerAttackResultMeta,
  sortedAttacks,
} from './fameeriAdminHelpers';
import FameeriAdminDuel from './FameeriAdminDuel';

function GroupLogEntry({ a, index, total, groupId }) {
  const meta = playerAttackResultMeta(a, groupId);
  const seq = total - index;
  const wDef = Q_WEAPONS.find((w) => w.id === a.weapon);
  const role =
    a.attackerId === groupId ? 'هجومنا' : a.targetId === groupId ? 'علينا' : null;

  return (
    <div className={`fameeri-admin-log-entry tone-${meta.tone}`}>
      <div className="fameeri-admin-log-entry__rail">
        <span className="fameeri-admin-log-entry__seq">#{seq}</span>
        {role && <span className="fameeri-group-log-entry__role">{role}</span>}
        {fmtAttackTime(a.timestamp) && (
          <span className="fameeri-admin-log-entry__time">{fmtAttackTime(a.timestamp)}</span>
        )}
      </div>
      <div className="fameeri-admin-log-entry__body">
        <FameeriAdminDuel
          attackerName={a.attackerName}
          targetName={a.targetName}
          tree={a.tree}
          weaponName={a.weaponName}
          weaponIcon={wDef?.icon}
          size="sm"
        />
        <div className={`fameeri-admin-log-entry__result tone-${meta.tone}`}>
          {meta.icon} {meta.label}
        </div>
      </div>
    </div>
  );
}

/** سجل مجموعتي — نفس شكل سجل المشرف، مقيّد بمجموعتك فقط */
export default function FameeriGroupLog({ attacks, groupId, groupName, limit = 20 }) {
  const [filterKey, setFilterKey] = useState('');

  const groupOnly = useMemo(
    () =>
      sortedAttacks(attacks).filter(
        (a) => a.attackerId === groupId || a.targetId === groupId
      ),
    [attacks, groupId]
  );

  const filtered = useMemo(() => {
    if (!groupId) return [];
    if (!filterKey) return groupOnly;
    return filterAttacks(groupOnly, filterKey);
  }, [groupOnly, filterKey, groupId]);

  const rows = filtered.slice(0, limit);

  const stats = useMemo(() => {
    const off = groupOnly.filter((a) => a.attackerId === groupId);
    const def = groupOnly.filter((a) => a.targetId === groupId);
    const hunted = off.filter((a) => a.result === 'success').reduce((s, a) => s + (a.hunted || 0), 0);
    const lost = def.filter((a) => a.result === 'success').reduce((s, a) => s + (a.hunted || 0), 0);
    return { off: off.length, def: def.length, hunted, lost };
  }, [groupOnly, groupId]);

  if (!groupId) {
    return (
      <div className="card fameeri-player-log fameeri-group-log">
        <div className="ctitle">📜 سجل مجموعتي</div>
        <div className="fameeri-log-empty">انتظر تحديد مجموعتك</div>
      </div>
    );
  }

  return (
    <div className="card fameeri-player-log fameeri-group-log fameeri-admin-log">
      <div className="fameeri-admin-log__head">
        <div>
          <div className="ctitle" style={{ margin: 0 }}>
            📜 سجل مجموعتي
          </div>
          <div className="fameeri-admin-log__sub">
            {groupName ? `${groupName} · ` : ''}
            {filterKey ? `${rows.length} من ${groupOnly.length}` : groupOnly.length} حدث
          </div>
        </div>
      </div>

      {groupOnly.length > 0 && (
        <div className="fameeri-group-log__summary">
          <span className="fameeri-admin-log-stat ok">⚔️ {stats.off} هجوم</span>
          <span className="fameeri-admin-log-stat ok">🎯 صاد {stats.hunted}</span>
          <span className="fameeri-admin-log-stat bad">💔 خسر {stats.lost}</span>
        </div>
      )}

      <div className="fameeri-admin-log__filter">
        <label className="lbl" htmlFor="fameeri-group-log-filter">
          عرض السجل
        </label>
        <select
          id="fameeri-group-log-filter"
          className="inp"
          value={filterKey}
          onChange={(e) => setFilterKey(e.target.value)}
        >
          <option value="">كل أحداثنا ({groupOnly.length})</option>
          <option value={`atk:${groupId}`}>هجماتنا فقط</option>
          <option value={`def:${groupId}`}>ما جاء علينا فقط</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="fameeri-admin-log-empty">
          {filterKey ? 'لا أحداث بهذا العرض' : 'لا أحداث بعد — اصطد قميري الخصم!'}
        </div>
      ) : (
        <div className="fameeri-admin-log-timeline">
          {rows.map((a, i) => (
            <GroupLogEntry
              key={`${a.timestamp}-${a.attackerId}-${a.targetId}-${i}`}
              a={a}
              index={i}
              total={rows.length}
              groupId={groupId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
