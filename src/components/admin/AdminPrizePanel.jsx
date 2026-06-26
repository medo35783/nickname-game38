import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatCodeForDisplay } from '../../core/firebaseHelpers';
import {
  subscribePrizeAwards,
  deriveUnregisteredPrizeSessions,
  registerPrizeSession,
  updatePrizeAward,
  PRIZE_STATUS,
} from '../../core/prizeAwards';
import { openPrizeCertificateReport } from '../../core/prizeCertificateReport';

function gameLabel(type) {
  if (type === 'fameeri') return '🦅 القميري';
  if (type === 'hesbah' || type === 'sniper') return '🎯 الحسبة';
  if (type === 'titles') return '🎭 الألقاب';
  return type || '—';
}

/**
 * لوحة الجوائز B2B — جلسات مؤهلة · فائز · شهادة PDF · تسليم
 */
export default function AdminPrizePanel({ notify, codeRows = [], codeStatsById = {} }) {
  const [awards, setAwards] = useState([]);
  const [tab, setTab] = useState('eligible');
  const [winnerDraft, setWinnerDraft] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    const unsub = subscribePrizeAwards(setAwards);
    return unsub;
  }, []);

  const eligible = useMemo(
    () => deriveUnregisteredPrizeSessions(codeRows, codeStatsById, awards),
    [codeRows, codeStatsById, awards]
  );

  const handleRegister = async (session) => {
    setBusy(session.sessionKey);
    try {
      await registerPrizeSession(session);
      notify?.('تم تسجيل الجلسة في لوحة الجوائز', 'success');
      setTab('records');
    } catch {
      notify?.('تعذّر التسجيل', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleSaveWinner = async (award) => {
    const name = (winnerDraft[award.id] ?? award.winnerName ?? '').trim();
    if (!name) {
      notify?.('أدخل اسم الفائز', 'error');
      return;
    }
    setBusy(award.id);
    try {
      await updatePrizeAward(award.id, { winnerName: name, status: 'awarded' });
      notify?.('تم تحديد الفائز', 'success');
    } catch {
      notify?.('فشل الحفظ', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleDelivered = async (award) => {
    setBusy(`d-${award.id}`);
    try {
      await updatePrizeAward(award.id, { status: 'delivered' });
      notify?.('تم تسجيل التسليم', 'success');
    } catch {
      notify?.('تعذّر التحديث', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleCertificate = (award) => {
    const name = (winnerDraft[award.id] ?? award.winnerName ?? '').trim();
    const ok = openPrizeCertificateReport({ ...award, winnerName: name });
    if (ok) notify?.('شهادة الجائزة — اطبع أو احفظ PDF', 'success');
    else notify?.('حدّد اسم الفائز أولاً', 'error');
  };

  return (
    <div className="admin-prize-panel">
      <p className="admin-mkt-lead">
        ② جائزة الجولة برعاية — جلسات مؤهلة (5+ لاعبين، جولتان+) مع كشف فائز وشهادة للراعي.
      </p>

      <div className="admin-subtabs" role="tablist">
        <button
          type="button"
          className={`admin-subtab${tab === 'eligible' ? ' admin-subtab--on' : ''}`}
          onClick={() => setTab('eligible')}
        >
          ✨ مؤهلة ({eligible.length})
        </button>
        <button
          type="button"
          className={`admin-subtab${tab === 'records' ? ' admin-subtab--on' : ''}`}
          onClick={() => setTab('records')}
        >
          📋 السجل ({awards.length})
        </button>
      </div>

      {tab === 'eligible' ? (
        !eligible.length ? (
          <p className="admin-pulse-empty">لا جلسات مؤهلة جديدة — العب جلسة كاملة أولاً.</p>
        ) : (
          <ul className="admin-pulse-list">
            {eligible.map((s) => (
              <li key={s.sessionKey} className="admin-prize-eligible">
                <div className="admin-prize-eligible__head">
                  <strong>{gameLabel(s.gameType)}</strong>
                  <span>{s.dateLabel}</span>
                </div>
                <div className="admin-prize-eligible__meta">
                  <span>غرفة {s.roomCode}</span>
                  <span>{s.playerCount} لاعب · {s.totalRounds} جولة</span>
                  <span>مشرف: {s.adminName}</span>
                  {s.sponsorName ? <span>🤝 {s.sponsorName}</span> : null}
                  <span className="admin-pulse-code__val">{formatCodeForDisplay(s.code)}</span>
                </div>
                <button
                  type="button"
                  className="btn btn--sm btn--gold"
                  disabled={busy === s.sessionKey}
                  onClick={() => handleRegister(s)}
                >
                  + تسجيل للجائزة
                </button>
              </li>
            ))}
          </ul>
        )
      ) : !awards.length ? (
        <p className="admin-pulse-empty">لا سجلات جوائز بعد.</p>
      ) : (
        <ul className="admin-pulse-list">
          {awards.map((a) => {
            const st = PRIZE_STATUS[a.status] || PRIZE_STATUS.eligible;
            return (
              <li key={a.id} className="admin-prize-record">
                <div className="admin-prize-record__head">
                  <span>
                    {gameLabel(a.gameType)} · {a.roomCode}
                  </span>
                  <span className={`admin-hub-badge admin-hub-badge--${st.tone === 'gold' ? 'partial' : st.tone === 'ready' ? 'ready' : 'partial'}`}>
                    {st.label}
                  </span>
                </div>
                <div className="admin-prize-eligible__meta">
                  {a.sponsorName ? <span>🤝 {a.sponsorName}</span> : null}
                  {a.prizeOffer ? <span>🎁 {a.prizeOffer}</span> : null}
                  <span>{a.playerCount} لاعب · {a.totalRounds} جولة</span>
                </div>
                <div className="code-admin-note__row" style={{ marginTop: 8 }}>
                  <input
                    className="inp"
                    placeholder="اسم الفائز"
                    value={winnerDraft[a.id] ?? a.winnerName ?? ''}
                    onChange={(e) =>
                      setWinnerDraft((d) => ({ ...d, [a.id]: e.target.value }))
                    }
                    disabled={a.status === 'delivered'}
                  />
                  {a.status !== 'delivered' ? (
                    <button
                      type="button"
                      className="btn btn--sm btn--gold"
                      disabled={busy === a.id}
                      onClick={() => handleSaveWinner(a)}
                    >
                      حفظ
                    </button>
                  ) : null}
                </div>
                <div className="admin-feedback-card__actions">
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => handleCertificate(a)}
                  >
                    📄 شهادة PDF
                  </button>
                  {a.status !== 'delivered' ? (
                    <button
                      type="button"
                      className="btn btn--sm btn--gold"
                      disabled={busy === `d-${a.id}`}
                      onClick={() => handleDelivered(a)}
                    >
                      ✅ تم التسليم
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
