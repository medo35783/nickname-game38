/**
 * شريط مختصر لإعداد بنك الأسئلة — جديد / إعادة / مسح / ابدأ
 */
export default function BankUsageStrip({
  accent = 'var(--gold)',
  usedCount = 0,
  freshCount = 0,
  totalMatching = 0,
  replayMode = 'new',
  onReplayModeChange,
  onClear,
  onStart,
  loading = false,
  startLabel = '▶ ابدأ',
  warning = null,
}) {
  return (
    <div className="card2" style={{ marginTop: 10, padding: 10, fontSize: 11 }}>
      <div style={{ color: 'var(--muted)', lineHeight: 1.6, marginBottom: 8 }}>
        ظهر سابقاً: <strong style={{ color: 'var(--text)' }}>{usedCount}</strong>
        {' · '}جديد: <strong style={{ color: accent }}>{freshCount}</strong>
        {' · '}الإجمالي: <strong style={{ color: 'var(--text)' }}>{totalMatching}</strong>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${replayMode === 'new' ? 'bg' : 'bgh'} bsm`}
          style={{ flex: 1, minWidth: 88 }}
          onClick={() => onReplayModeChange('new')}
        >
          🆕 جديد
        </button>
        <button
          type="button"
          className={`btn ${replayMode === 'repeat' ? 'bg' : 'bgh'} bsm`}
          style={{ flex: 1, minWidth: 88 }}
          onClick={() => onReplayModeChange('repeat')}
        >
          🔁 إعادة
        </button>
        <button type="button" className="btn br bsm" style={{ flex: 1, minWidth: 88 }} onClick={onClear}>
          ♻️ مسح
        </button>
        <button
          type="button"
          className="btn bg bsm"
          style={{ flex: 1, minWidth: 88 }}
          disabled={loading}
          onClick={onStart}
        >
          {loading ? '⏳…' : startLabel}
        </button>
      </div>
      {warning ? (
        <div style={{ fontSize: 10, color: 'var(--gold)', marginTop: 8, lineHeight: 1.55 }}>{warning}</div>
      ) : null}
    </div>
  );
}
