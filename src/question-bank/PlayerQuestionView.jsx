import { useState, useEffect } from 'react';

/**
 * عرض السؤال للمتسابق — القائد يختار ثم يعتمد بزر منفصل.
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
  const [leaderDraft, setLeaderDraft] = useState(null);

  useEffect(() => {
    setLeaderDraft(null);
  }, [current?.id, current?.text, current?.drawnAt]);

  if (!current) return null;
  if (current.adminOnly) return null;
  if (!current.revealToPlayers) return null;

  const hasOptions = Array.isArray(current.options) && current.options.length > 0;
  const showOptions = current.revealOptions && hasOptions;
  const canInteract = interactive && showOptions;
  const leaderLocked = isLeader && finalOpt !== null;

  const handleLeaderPick = (i) => {
    if (leaderLocked) return;
    setLeaderDraft(i);
  };

  const handleMemberPick = (i) => {
    onSuggest?.(i);
  };

  return (
    <div className="player-q-view">
      <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.7, color: 'var(--text)', textAlign: 'center' }}>
        {current.text || '—'}
      </div>

      {showOptions && (
        <>
          <div className="player-q-view__grid">
            {current.options.map((opt, i) => {
              const isFinal = finalOpt === i;
              const isMine = myPick === i;
              const isDraft = isLeader && leaderDraft === i && !isFinal;
              const votes = tally && tally[i] ? tally[i] : 0;
              const rowClass = [
                'player-q-view__opt',
                isFinal ? 'player-q-view__opt--final' : '',
                isDraft || isMine ? 'player-q-view__opt--pick' : '',
              ]
                .filter(Boolean)
                .join(' ');

              const inner = (
                <>
                  {opt}
                  {isFinal && <span className="player-q-view__sent"> ✓ مُرسَل</span>}
                  {isDraft && <span className="player-q-view__draft"> · مسودة</span>}
                  {votes > 0 && <span className="player-q-view__votes">👍 {votes}</span>}
                </>
              );

              if (canInteract && isLeader) {
                return (
                  <button
                    key={i}
                    type="button"
                    className={rowClass}
                    style={{ borderColor: isDraft || isFinal ? accent : undefined }}
                    disabled={leaderLocked}
                    onClick={() => handleLeaderPick(i)}
                  >
                    {inner}
                  </button>
                );
              }
              if (canInteract) {
                return (
                  <button key={i} type="button" className={rowClass} onClick={() => handleMemberPick(i)}>
                    {inner}
                  </button>
                );
              }
              return (
                <div key={i} className={rowClass}>
                  {inner}
                </div>
              );
            })}
          </div>

          {canInteract && isLeader && !leaderLocked && (
            <>
              {leaderDraft !== null ? (
                <button
                  type="button"
                  className="btn bg player-q-view__submit"
                  onClick={() => void onConfirm?.(leaderDraft)}
                >
                  📤 إرسال واعتماد للمشرف
                </button>
              ) : (
                <p className="player-q-view__hint">👑 اختر الإجابة ثم اضغط «إرسال واعتماد»</p>
              )}
            </>
          )}

          {canInteract && isLeader && leaderLocked && (
            <p className="player-q-view__hint player-q-view__hint--ok">
              ✅ اعتمدت الإجابة وأرسلتها للمشرف — بانتظار حكمه (صح / خطأ)
            </p>
          )}

          {canInteract && !isLeader && (
            <p className="player-q-view__hint">
              {finalOpt !== null
                ? 'اعتمد القائد الإجابة — بانتظار حكم المشرف'
                : myPick !== null
                  ? '👍 سُجّل اقتراحك — بانتظار اعتماد القائد'
                  : 'اضغط الخيار الذي تقترحه ليراه القائد'}
            </p>
          )}

          {showOptions && !canInteract && (
            <p className="player-q-view__hint">
              {finalOpt !== null
                ? 'اعتمدت مجموعة المهاجِم — راقبوا المؤقت وحكم المشرف'
                : 'شاهدوا السؤال وناقشوا — الإجابة للمجموعة المحددة في هذه الجولة'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
