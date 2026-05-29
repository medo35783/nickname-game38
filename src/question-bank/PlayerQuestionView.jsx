/**
 * عرض السؤال للمتسابق / شاشة العرض — مكوّن مشترك.
 * يظهر فقط حين يفعّل المشرف «إظهار السؤال»، وبدون الإجابة الصحيحة أبدًا.
 *
 * وضع تفاعلي (interactive): يسمح لأعضاء المجموعة المهاجِمة باقتراح إجابة،
 * وللقائد باعتمادها نهائيًا (تظهر للمشرف الذي يحكم صح/خطأ يدويًا).
 */
export default function PlayerQuestionView({
  current,
  accent = 'var(--gold)',
  interactive = false,
  isLeader = false,
  myPick = null,
  finalOpt = null,
  tally = null,
  onSuggest,
  onConfirm,
}) {
  if (!current) return null;
  if (current.adminOnly) return null;
  if (!current.revealToPlayers) return null;

  const hasOptions = Array.isArray(current.options) && current.options.length > 0;
  const showOptions = current.revealOptions && hasOptions;
  const canInteract = interactive && showOptions;

  return (
    <div className="card" style={{ border: `1.5px solid ${accent}`, background: 'rgba(240,192,64,.06)' }}>
      <div className="ctitle" style={{ margin: '0 0 6px' }}>❓ السؤال</div>
      <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.7, color: 'var(--text)', textAlign: 'center' }}>
        {current.text || '—'}
      </div>

      {showOptions && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            {current.options.map((opt, i) => {
              const isFinal = finalOpt === i;
              const isMine = myPick === i;
              const votes = tally && tally[i] ? tally[i] : 0;
              const baseStyle = {
                position: 'relative',
                padding: '12px 8px',
                borderRadius: 10,
                background: isFinal ? 'rgba(46,204,113,.16)' : 'var(--surface)',
                border: isFinal
                  ? '2px solid var(--green)'
                  : isMine
                  ? `2px solid ${accent}`
                  : '1px solid var(--border-faint)',
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text)',
                cursor: canInteract ? 'pointer' : 'default',
                width: '100%',
              };
              const content = (
                <>
                  {opt}
                  {isFinal && <span style={{ marginInlineStart: 4 }}>✅</span>}
                  {votes > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        insetInlineEnd: 6,
                        top: 6,
                        fontSize: 10,
                        fontWeight: 800,
                        color: accent,
                        background: 'var(--bg)',
                        borderRadius: 999,
                        padding: '1px 6px',
                        border: `1px solid ${accent}`,
                      }}
                    >
                      👍 {votes}
                    </span>
                  )}
                </>
              );
              return canInteract ? (
                <button
                  key={i}
                  type="button"
                  style={baseStyle}
                  onClick={() => {
                    if (isLeader) onConfirm?.(i);
                    else onSuggest?.(i);
                  }}
                >
                  {content}
                </button>
              ) : (
                <div key={i} style={baseStyle}>
                  {content}
                </div>
              );
            })}
          </div>

          {showOptions && !canInteract && (
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 10, lineHeight: 1.6 }}>
              {finalOpt !== null
                ? 'اعتمد القائد الإجابة — بانتظار حكم المشرف'
                : 'هذه الجولة لمجموعة المهاجِم فقط — راقبوا المؤقت والسؤال'}
            </div>
          )}
          {canInteract && (
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 10, lineHeight: 1.6 }}>
              {isLeader
                ? finalOpt !== null
                  ? '✅ تم اعتماد إجابتكم — بإمكانك تغييرها بالضغط على خيار آخر'
                  : '👑 أنت القائد: اضغط الخيار لاعتماده كإجابة نهائية للمجموعة'
                : finalOpt !== null
                ? 'اعتمد القائد الإجابة — بانتظار حكم المشرف'
                : myPick !== null
                ? '👍 سُجّل اقتراحك — بانتظار اعتماد القائد'
                : 'اضغط الخيار الذي تقترحه ليراه قائد مجموعتك'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
