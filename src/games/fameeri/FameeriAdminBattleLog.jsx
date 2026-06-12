import { useMemo, useState } from 'react';
import { Q_WEAPONS } from '../../core/constants';
import { attackResultMeta, filterAttacks, fmtAttackTime, sortedAttacks } from './fameeriAdminHelpers';
import FameeriAdminDuel from './FameeriAdminDuel';
import FameeriAdminGroupRoster from './FameeriAdminGroupRoster';

function LogEntry({ a, index, total, groupId }) {
  const meta = attackResultMeta(a);
  const seq = total - index;
  const wDef = Q_WEAPONS.find((w) => w.id === a.weapon);
  const role =
    groupId && a.attackerId === groupId
      ? 'هجوم'
      : groupId && a.targetId === groupId
        ? 'دفاع'
        : null;

  return (
    <div className={`fameeri-admin-log-entry tone-${meta.tone}`}>
      <div className="fameeri-admin-log-entry__rail">
        <span className="fameeri-admin-log-entry__seq">#{seq}</span>
        {role && <span className="fameeri-admin-log-entry__role">{role}</span>}
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

export default function FameeriAdminBattleLog({ qGList, qAttacks, qMList = [] }) {
  const [view, setView] = useState('timeline');
  const [filterKey, setFilterKey] = useState('');

  const allSorted = useMemo(() => sortedAttacks(qAttacks), [qAttacks]);
  const totalAttacks = allSorted.length;

  const timelineRows = useMemo(
    () => filterAttacks(allSorted, filterKey),
    [allSorted, filterKey]
  );

  return (
    <div className="card fameeri-admin-log">
      <div className="fameeri-admin-log__head">
        <div>
          <div className="ctitle" style={{ margin: 0 }}>📜 سجل الهجمات</div>
          <div className="fameeri-admin-log__sub">
            {filterKey ? `${timelineRows.length} من ${totalAttacks}` : totalAttacks} هجمة
          </div>
        </div>
        <div className="fameeri-admin-log__views">
          <button
            type="button"
            className={`fameeri-admin-log-view${view === 'timeline' ? ' on' : ''}`}
            onClick={() => setView('timeline')}
          >
            ⏱️ زمني
          </button>
          <button
            type="button"
            className={`fameeri-admin-log-view${view === 'groups' ? ' on' : ''}`}
            onClick={() => setView('groups')}
          >
            👥 مجموعات
          </button>
        </div>
      </div>

      {view === 'timeline' && (
        <>
          <div className="fameeri-admin-log__filter">
            <label className="lbl" htmlFor="fameeri-log-filter">
              تصفية السجل
            </label>
            <select
              id="fameeri-log-filter"
              className="inp"
              value={filterKey}
              onChange={(e) => setFilterKey(e.target.value)}
            >
              <option value="">كل الهجمات ({totalAttacks})</option>
              <optgroup label="⚔️ هاجمت (مهاجِم)">
                {qGList.map((g) => (
                  <option key={`atk-${g.id}`} value={`atk:${g.id}`}>
                    {g.name} — هجماتها فقط
                  </option>
                ))}
              </optgroup>
              <optgroup label="🎯 استُهدفت (مدافع)">
                {qGList.map((g) => (
                  <option key={`def-${g.id}`} value={`def:${g.id}`}>
                    {g.name} — عليها فقط
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          {timelineRows.length === 0 ? (
            <div className="fameeri-admin-log-empty">
              {filterKey ? 'لا هجمات بهذا التصفية' : 'لا هجمات بعد — ستظهر هنا بعد أول حسم'}
            </div>
          ) : (
            <div className="fameeri-admin-log-timeline">
              {timelineRows.map((a, i) => (
                <LogEntry key={`${a.timestamp}-${a.attackerId}-${i}`} a={a} index={i} total={timelineRows.length} />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'groups' && (
        <div className="fameeri-admin-log-groups">
          {qGList.map((g) => {
            const members = qMList.filter((m) => m.groupId === g.id);
            const groupRows = allSorted.filter(
              (a) => a.attackerId === g.id || a.targetId === g.id
            );
            const off = groupRows.filter((a) => a.attackerId === g.id);
            const def = groupRows.filter((a) => a.targetId === g.id);
            const hunted = off
              .filter((a) => a.result === 'success')
              .reduce((s, a) => s + (a.hunted || 0), 0);
            const lost = def
              .filter((a) => a.result === 'success')
              .reduce((s, a) => s + (a.hunted || 0), 0);

            return (
              <div key={g.id} className="fameeri-admin-log-group-card">
                <div className="fameeri-admin-log-group-card__head">
                  <span className="fameeri-group-name">{g.name}</span>
                  <span className="fameeri-admin-log-group-card__score">{g.totalRemaining ?? 0} 🐦</span>
                </div>
                <div className="fameeri-admin-log-group-card__summary">
                  <span className="fameeri-admin-log-stat ok">⚔️ {off.length} هجوم</span>
                  <span className="fameeri-admin-log-stat ok">🎯 صاد {hunted}</span>
                  <span className="fameeri-admin-log-stat bad">💔 خسر {lost}</span>
                </div>
                {members.length > 0 && (
                  <div className="fameeri-admin-log-group-card__roster">
                    <FameeriAdminGroupRoster members={members} compact />
                  </div>
                )}
                {groupRows.length === 0 ? (
                  <div className="fameeri-admin-log-empty small">لا أحداث</div>
                ) : (
                  <div className="fameeri-admin-log-timeline fameeri-admin-log-timeline--nested">
                    {groupRows.map((a, i) => (
                      <LogEntry
                        key={`${g.id}-${a.timestamp}-${a.attackerId}-${i}`}
                        a={a}
                        index={i}
                        total={groupRows.length}
                        groupId={g.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
