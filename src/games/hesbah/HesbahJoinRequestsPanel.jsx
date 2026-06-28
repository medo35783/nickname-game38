/** طلبات عودة/انضمام بانتظار موافقة المشرف */
export default function HesbahJoinRequestsPanel({ requests, onApprove, onReject, busyId }) {
  const list = Object.entries(requests || {}).filter(([, r]) => r?.status === 'pending');
  if (!list.length) return null;

  return (
    <div className="card hesbah-join-requests">
      <div className="ctitle">🛡️ طلبات دخول ({list.length})</div>
      <p className="hesbah-join-requests__hint">
        من جوال آخر أو لاعب خرج — أكّد أنه الشخص الصحيح قبل القبول.
      </p>
      {list.map(([reqId, req]) => (
        <div key={reqId} className="hesbah-join-requests__row">
          <div className="hesbah-join-requests__info">
            <strong>{req.name}</strong>
            <span className="hesbah-join-requests__tag">
              {req.kind === 'left' ? '↩️ عودة بعد خروج' : '📱 نفس الاسم — جهاز آخر'}
            </span>
          </div>
          <div className="hesbah-join-requests__actions">
            <button
              type="button"
              className="btn bg bxs"
              disabled={busyId === reqId}
              onClick={() => void onApprove?.(reqId, req)}
            >
              {busyId === reqId ? '⏳' : '✅ قبول'}
            </button>
            <button
              type="button"
              className="btn bgh bxs"
              disabled={busyId === reqId}
              onClick={() => void onReject?.(reqId)}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
