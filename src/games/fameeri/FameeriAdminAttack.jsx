import { useState } from 'react';
import { ref as dbRef, update } from 'firebase/database';
import { db } from '../../core/firebase';
import { Q_TREES, Q_WEAPONS } from '../../core/constants';

/**
 * شن الهجوم نيابةً عن مجموعة (وضع بدون جوالات).
 * mode='sequential' : المهاجِم = مجموعة الدور (ثابت) — يكتب currentAttack.
 * mode='speed'      : المشرف يختار المجموعة المهاجِمة — يكتب speedClaims/{attackerId}.
 */
export default function FameeriAdminAttack({
  mode = 'sequential',
  attacker,
  groups = [],
  qRoom,
  sandstorm,
  notify,
  accent = 'var(--fameeri-primary)',
}) {
  const [atkGroupId, setAtkGroupId] = useState(mode === 'sequential' ? attacker?.id || '' : '');
  const [target, setTarget] = useState('');
  const [tree, setTree] = useState('');
  const [weapon, setWeapon] = useState('');

  const attackerGroup = mode === 'sequential' ? attacker : groups.find((g) => g.id === atkGroupId);
  const others = groups.filter((g) => g.id !== attackerGroup?.id);
  const weapons = Q_WEAPONS.filter((w) => (attackerGroup?.weapons?.[w.id] || 0) > 0);
  const canSubmit = attackerGroup && target && weapon && (tree || sandstorm);

  const reset = () => {
    setTarget('');
    setTree('');
    setWeapon('');
    if (mode === 'speed') setAtkGroupId('');
  };

  const submit = async () => {
    if (!canSubmit) return;
    const tg = groups.find((g) => g.id === target);
    const w = Q_WEAPONS.find((x) => x.id === weapon);
    const finalTree = sandstorm ? Q_TREES[Math.floor(Math.random() * Q_TREES.length)] : tree;
    const base = {
      attackerId: attackerGroup.id,
      attackerName: attackerGroup.name,
      targetId: target,
      targetName: tg?.name || '',
      tree: finalTree,
      weapon,
      weaponName: w?.name || '',
      time: Date.now(),
    };
    try {
      if (mode === 'speed') {
        await update(dbRef(db, `qrooms/${qRoom}/game/speedClaims/${attackerGroup.id}`), base);
        if (typeof notify === 'function') notify('⚔️ أُضيف هجوم نيابةً', 'gold');
      } else {
        await update(dbRef(db, `qrooms/${qRoom}/game`), { currentAttack: base });
        if (typeof notify === 'function') notify('⚔️ هجوم', 'gold');
      }
      reset();
    } catch {
      if (typeof notify === 'function') notify('تعذر تنفيذ الهجوم', 'error');
    }
  };

  const pillRow = (items, isOn, onPick, opts = {}) => (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', ...(opts.style || {}) }}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          className={`btn ${isOn(it.key) ? 'bg' : 'bgh'} bxs`}
          style={{ width: 'auto', fontSize: opts.fontSize || 11 }}
          onClick={() => onPick(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(79,163,224,.07)', border: '1px solid rgba(79,163,224,.3)' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: accent, marginBottom: 6 }}>
        🎮 شن الهجوم نيابةً{mode === 'sequential' && attacker ? ` عن ${attacker.name}` : ''}
      </div>

      {mode === 'speed' && (
        <>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>المجموعة المهاجِمة</div>
          {pillRow(
            groups.map((g) => ({ key: g.id, label: g.name })),
            (k) => atkGroupId === k,
            (k) => { setAtkGroupId(k); setTarget(''); setWeapon(''); },
            { style: { marginBottom: 4 } }
          )}
        </>
      )}

      {attackerGroup && (
        <>
          <div style={{ fontSize: 10, color: 'var(--muted)', margin: '4px 0 3px' }}>الهدف</div>
          {pillRow(others.map((g) => ({ key: g.id, label: g.name })), (k) => target === k, setTarget)}

          {target && !sandstorm && (
            <>
              <div style={{ fontSize: 10, color: 'var(--muted)', margin: '6px 0 3px' }}>الشجرة</div>
              {pillRow(Q_TREES.map((t) => ({ key: t, label: t })), (k) => tree === k, setTree, { fontSize: 10 })}
            </>
          )}
          {target && sandstorm && (
            <div style={{ fontSize: 11, color: accent, margin: '6px 0' }}>🌪️ العاصفة — الشجرة عشوائية</div>
          )}

          {target && (
            <>
              <div style={{ fontSize: 10, color: 'var(--muted)', margin: '6px 0 3px' }}>السلاح</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {weapons.length ? (
                  weapons.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className={`btn ${weapon === w.id ? 'bg' : 'bgh'} bsm`}
                      style={{ flex: 1 }}
                      onClick={() => setWeapon(w.id)}
                    >
                      {w.icon} {w.name}
                    </button>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--red)' }}>لا أسلحة متبقية لهذه المجموعة</span>
                )}
              </div>
            </>
          )}

          <button type="button" className="btn br mt2" disabled={!canSubmit} onClick={() => void submit()}>
            ⚔️ {mode === 'speed' ? 'أضف الهجوم' : 'هاجم'}
          </button>
        </>
      )}
    </div>
  );
}
