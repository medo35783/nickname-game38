import { useState, useEffect } from 'react';
import { isWrittenTextQuestion } from './questionSession';

/**
 * عرض السؤال للمتسابق — القائد يختار ثم يعتمد بزر منفصل.
 * نص كتابي: حقل إدخال + اعتماد (بدون خيارات).
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
  const [leaderTextDraft, setLeaderTextDraft] = useState('');

  useEffect(() => {
    setLeaderDraft(null);
    setLeaderTextDraft('');
  }, [current?.id, current?.text, current?.drawnAt]);

  if (!current) return null;
  if (current.adminOnly) return null;
  if (!current.revealToPlayers) return null;

  const writtenText = isWrittenTextQuestion(current) || !!current.writtenText;
  const hasOptions = Array.isArray(current.options) && current.options.length > 0;
  const showOptions = !writtenText && current.revealOptions && hasOptions;
  const showWrittenInput = writtenText && current.revealOptions;
  const canInteract = interactive && (showOptions || showWrittenInput);
  const leaderLocked = isLeader && finalOpt !== null;

  const handleLeaderPick = (i) => {
    if (leaderLocked) return;
    setLeaderDraft(i);
  };

  const handleMemberPick = (i) => {
    onSuggest?.(i);
  };

  const handleLeaderTextConfirm = () => {
    const text = leaderTextDraft.trim();
    if (!text || leaderLocked) return;
    void onConfirm?.(text);
  };

  const finalText =
    writtenText && typeof finalOpt === 'string'
      ? finalOpt
      : writtenText && finalOpt != null
        ? String(finalOpt)
        : null;

  return (
    <div className="player-q-view">
      <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.7, color: 'var(--text)', textAlign: 'center' }}>
        {current.text || '—'}
      </div>

      {showWrittenInput && (
        <>
          {canInteract && isLeader && !leaderLocked && (
            <>
              <textarea
                className="inp player-q-view__text-inp"
                rows={3}
                placeholder="اكتب إجابة مجموعتك…"
                value={leaderTextDraft}
                onChange={(e) => setLeaderTextDraft(e.target.value)}
              />
              <button
                type="button"
                className="btn bg player-q-view__submit"
                disabled={!leaderTextDraft.trim()}
                onClick={handleLeaderTextConfirm}
              >
                📤 إرسال واعتماد للمشرف
              </button>
            </>
          )}
          {canInteract && isLeader && leaderLocked && finalText && (
            <p className="player-q-view__hint player-q-view__hint--ok">
              ✅ اعتمدت: «{finalText}» — بانتظار حكم المشرف
            </p>
          )}
          {canInteract && !isLeader && (
            <p className="player-q-view__hint">
              {finalText
                ? 'اعتمد القائد الإجابة — بانتظار حكم المشرف'
                : 'ناقشوا مع القائد — هو من يكتب ويعتمد الإجابة'}
            </p>
          )}
          {showWrittenInput && !canInteract && (
            <p className="player-q-view__hint">شاهدوا السؤال — بانتظار تفعيل حقل الإجابة من المشرف</p>
          )}
        </>
      )}

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
