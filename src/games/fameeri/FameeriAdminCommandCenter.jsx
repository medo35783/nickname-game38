import { useState } from 'react';
import { Q_WEAPONS } from '../../core/constants';
import {
  getCorrectOptionIndex,
  optionLabel,
  QSOURCE,
} from '../../question-bank/questionSession';
import AdminQuestionRevealControls from '../../question-bank/AdminQuestionRevealControls';
import AdminActingRevealControls from '../../question-bank/AdminActingRevealControls';
import FameeriAdminDuel from './FameeriAdminDuel';
import FameeriAttackDisplay from './FameeriAttackDisplay';
import FameeriAdminAnswerVerdict from './FameeriAdminAnswerVerdict';

const TIMER_PRESETS = [15, 30, 45, 60];

function CmdVerdictBar({ ariaLabel, ok, fail }) {
  return (
    <div className="fameeri-cmd-verdict-inline" role="group" aria-label={ariaLabel}>
      <div className="fameeri-cmd-verdict-inline__label">⚖️ الحكم</div>
      <div className="fameeri-cmd-verdict-inline__row">
      <button type="button" className={ok.className} disabled={ok.disabled} onClick={ok.onClick}>
        <span className="fameeri-cmd-verdict__icon" aria-hidden>✓</span>
        <span className="fameeri-cmd-verdict__text">
          <span className="fameeri-cmd-verdict__label">صح</span>
          {ok.sub && <span className="fameeri-cmd-verdict__sub">{ok.sub}</span>}
        </span>
      </button>
      <button type="button" className={fail.className} disabled={fail.disabled} onClick={fail.onClick}>
        <span className="fameeri-cmd-verdict__icon" aria-hidden>✗</span>
        <span className="fameeri-cmd-verdict__text">
          <span className="fameeri-cmd-verdict__label">خطأ</span>
          {fail.sub && <span className="fameeri-cmd-verdict__sub">{fail.sub}</span>}
        </span>
      </button>
      </div>
    </div>
  );
}

/**
 * لوحة تحكم المشرف أثناء الهجوم — تدفق واحد: سؤال → كشف → مؤقت → حسم.
 */
export default function FameeriAdminCommandCenter({
  qCurrentAttack,
  qActiveQuestion,
  qActiveAnswer,
  qAdminGroupAnswers = [],
  qAdminAnswerContext = null,
  qAdminPendingGroups = [],
  qCountdown,
  shieldCountdown,
  shieldWindow,
  shieldTargetAttack,
  shieldTargetGroup,
  qTimer,
  isSpeed,
  speedClaims,
  claimIds = [],
  speedBatchActive = false,
  qGList = [],
  speedWinSelect,
  setSpeedWinSelect,
  canStartSpeedTimer,
  qCustomTimer,
  setQCustomTimer,
  onToggleRevealQuestion,
  onToggleRevealOptions,
  onHideAll,
  onStartActingChallenge,
  onEndActingChallenge,
  onDrawNext,
  poolHasQuestions = false,
  questionSource = null,
  onOpenQuestionSetup,
  onCancelAttack,
  onStartTimer,
  onStartSpeedTimer,
  onVerdictOk,
  onVerdictFail,
  onSpeedVerdictOk,
  onSpeedVerdictFail,
  accent = 'var(--fameeri-primary)',
}) {
  const [teamsDetailOpen, setTeamsDetailOpen] = useState(false);

  const attack = qCurrentAttack || shieldTargetAttack;
  const hasQuestion = !!qActiveQuestion;
  const adminOnly = qActiveQuestion?.adminOnly;
  const hasOptions = Array.isArray(qActiveQuestion?.options) && qActiveQuestion.options.length > 0;
  const revealed = !!qActiveQuestion?.revealToPlayers;
  const optionsRevealed = !hasOptions || !!qActiveQuestion?.revealOptions;
  const revealStepDone = adminOnly ? revealed : revealed && optionsRevealed;
  const timerRunning = !!qTimer && !shieldWindow;
  const inShield = !!shieldWindow;
  const isExternalMode = questionSource === QSOURCE.EXTERNAL;
  const manualFlow = !!attack && !hasQuestion;
  const externalFlow = isExternalMode && manualFlow;
  const stuckFlow = manualFlow && !isExternalMode;

  const correctIdx = hasQuestion && hasOptions ? getCorrectOptionIndex(qActiveQuestion.options, qActiveAnswer) : -1;
  const correctLetter = correctIdx >= 0 ? optionLabel(correctIdx) : null;
  const correctText =
    correctIdx >= 0 && qActiveQuestion?.options?.[correctIdx] != null
      ? qActiveQuestion.options[correctIdx]
      : qActiveAnswer || '';
  const leaderPick = qAdminAnswerContext?.primary?.submitted ? qAdminAnswerContext.primary : null;
  const pendingLeader = qAdminAnswerContext?.pendingNames?.length
    ? qAdminAnswerContext.pendingNames.join(' · ')
    : null;

  const step = (() => {
    if (inShield) return 4;
    if (timerRunning) return 4;
    if (externalFlow) return 3;
    if (hasQuestion && !revealStepDone) return 2;
    if (hasQuestion) return 3;
    return 1;
  })();

  const steps = isExternalMode
    ? [
        { id: 3, label: 'المؤقت', icon: '⏱️' },
        { id: 4, label: 'الحسم', icon: '⚖️' },
      ]
    : [
        { id: 1, label: 'السؤال', icon: '❓' },
        { id: 2, label: 'الكشف', icon: '👁️' },
        { id: 3, label: 'المؤقت', icon: '⏱️' },
        { id: 4, label: 'الحسم', icon: '⚖️' },
      ];

  const activeStep = isExternalMode
    ? inShield || timerRunning
      ? 4
      : 3
    : step;

  const countdown = inShield ? shieldCountdown : qCountdown;
  const countdownUrgent = countdown !== null && countdown <= 5 && countdown > 0;
  const timerExpired = timerRunning && countdown !== null && countdown <= 0;
  const showSpeedVerdict = isSpeed && !qCurrentAttack && claimIds.length > 0 && !inShield;
  const showAttackVerdict = !inShield && !!qCurrentAttack && (hasQuestion || manualFlow);

  const wDef = attack ? Q_WEAPONS.find((w) => w.id === attack.weapon) : null;
  const groupName = (gid) => qGList.find((g) => g.id === gid)?.name || gid;

  const attackVerdictBar = showAttackVerdict && qCurrentAttack && (
    <CmdVerdictBar
      ariaLabel="حكم المشرف"
      ok={{
        className: `fameeri-cmd-verdict fameeri-cmd-verdict--ok${qAdminAnswerContext?.autoVerdict === true ? ' suggested' : ''}`,
        onClick: onVerdictOk,
        sub: 'نجاح الهجوم',
      }}
      fail={{
        className: `fameeri-cmd-verdict fameeri-cmd-verdict--fail${qAdminAnswerContext?.autoVerdict === false ? ' suggested' : ''}`,
        onClick: onVerdictFail,
        sub: 'فشل الهجوم',
      }}
    />
  );

  const speedVerdictBar = showSpeedVerdict && (
    <CmdVerdictBar
      ariaLabel="حكم السرعة"
      ok={{
        className: 'fameeri-cmd-verdict fameeri-cmd-verdict--ok',
        onClick: onSpeedVerdictOk,
        disabled: claimIds.length > 1 && !speedWinSelect,
      }}
      fail={{
        className: 'fameeri-cmd-verdict fameeri-cmd-verdict--fail',
        onClick: onSpeedVerdictFail,
      }}
    />
  );

  return (
    <div className="fameeri-cmd">
      {/* مسار المراحل */}
      <div className={`fameeri-cmd-steps card${isExternalMode ? ' fameeri-cmd-steps--external' : ''}`}>
        {steps.map((s, i) => (
          <div key={s.id} className="fameeri-cmd-steps__item-wrap">
            <div
              className={`fameeri-cmd-step${activeStep === s.id ? ' active' : ''}${activeStep > s.id ? ' done' : ''}`}
            >
              <span className="fameeri-cmd-step__icon">{activeStep > s.id ? '✓' : s.icon}</span>
              <span className="fameeri-cmd-step__label">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`fameeri-cmd-steps__line${activeStep > s.id ? ' done' : ''}`} />}
          </div>
        ))}
      </div>

      {/* الهجوم */}
      {attack && (
        <FameeriAttackDisplay
          attack={{
            ...attack,
            weaponName: attack.weaponName || wDef?.name,
          }}
          badge="⚔️ هجوم نشط"
          size="lg"
          className="card fameeri-cmd-attack"
        />
      )}

      {/* وضع «الأسئلة معي» — حكم يدوي بالتصميم */}
      {externalFlow && (
        <div className="fameeri-cmd-external card">
          <div className="fameeri-cmd-external__title">⏱️ الأسئلة معك — بدون عرض</div>
          <p className="fameeri-cmd-external__text">
            اطرح سؤالك شفهياً أو من ورقتك، ثم شغّل المؤقت بالأسفل واحكم <strong>صح</strong> أو <strong>خطأ</strong>.
            المجموعات لا ترى أسئلة على الشاشة.
          </p>
          {onCancelAttack && (
            <button type="button" className="btn bgh bxs" onClick={onCancelAttack}>
              ↩️ إلغاء الهجوم
            </button>
          )}
        </div>
      )}

      {/* بدون سؤال — مسار إنقاذ (البنك/الكتابة فقط) */}
      {stuckFlow && (
        <div className="fameeri-cmd-stuck card">
          <div className="fameeri-cmd-stuck__title">⚠️ لم يُسحب سؤال بعد</div>
          <p className="fameeri-cmd-stuck__text">
            {!poolHasQuestions
              ? 'مخزون الأسئلة غير متاح على هذا الجهاز — أعد إعداد البنك أو تابع بالحكم اليدوي.'
              : !onDrawNext
                ? 'تعذّر ربط السؤال بالسلاح — يمكنك إعادة المحاولة أو المتابعة يدوياً.'
                : 'اضغط سحب سؤال، أو شغّل المؤقت واحكم يدوياً بالأسفل.'}
          </p>
          <div className="fameeri-cmd-stuck__actions">
            {onDrawNext && (
              <button type="button" className="btn bg fameeri-cmd-prompt__btn" onClick={onDrawNext}>
                ❓ سحب سؤال للهجوم
              </button>
            )}
            {onOpenQuestionSetup && !poolHasQuestions && (
              <button type="button" className="btn bb bsm" onClick={onOpenQuestionSetup}>
                🧠 إعداد الأسئلة
              </button>
            )}
            {onCancelAttack && (
              <button type="button" className="btn bgh bsm" onClick={onCancelAttack}>
                ↩️ إلغاء الهجوم
              </button>
            )}
          </div>
        </div>
      )}

      {/* السؤال — واضح للمشرف: نص → خيارات → مفتاح الإجابة */}
      {hasQuestion && (
        <div className="fameeri-cmd-question card" style={{ borderColor: accent }}>
          <div className="fameeri-cmd-question__head">
            <span className="fameeri-cmd-question__label">السؤال</span>
          </div>
          <p className="fameeri-cmd-question__text">{qActiveQuestion.text}</p>

          {hasOptions && (
            <div className="admin-q-options fameeri-cmd-question__options">
              {qActiveQuestion.options.map((opt, i) => {
                const isCorrectAnswer = correctIdx >= 0 && i === correctIdx;
                const isLeaderChoice = leaderPick && leaderPick.opt === i;
                const leaderOk = isLeaderChoice && leaderPick.correct;
                const leaderMiss = isLeaderChoice && !leaderPick.correct;
                const optionClass = [
                  'admin-q-option',
                  leaderMiss ? 'admin-q-option--leader-wrong' : '',
                  leaderOk || (isCorrectAnswer && !leaderPick) ? 'admin-q-option--correct' : '',
                  isCorrectAnswer && leaderMiss ? 'admin-q-option--correct-hint' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div key={i} className={optionClass}>
                    <span className="admin-q-option__letter">{optionLabel(i)}</span>
                    <span className="admin-q-option__text">{opt}</span>
                    {isLeaderChoice && (
                      <span
                        className={`admin-q-option__badge admin-q-option__badge--leader${leaderOk ? ' ok' : ' miss'}`}
                      >
                        {leaderOk ? '👑 ✓ القائد' : '👑 ✗ القائد'}
                      </span>
                    )}
                    {isCorrectAnswer && !isLeaderChoice && (
                      <span className="admin-q-option__badge">✓ الصحيحة</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {leaderPick && (
            <p className={`fameeri-cmd-question__leader${leaderPick.correct ? ' ok' : ' miss'}`}>
              👑 اختيار القائد{leaderPick.by ? ` (${leaderPick.by})` : ''}:{' '}
              <strong>
                {leaderPick.letter ? `${leaderPick.letter} — ` : ''}
                {leaderPick.optText}
              </strong>
              {leaderPick.correct ? ' ✅' : ' ❌'}
            </p>
          )}

          {(correctIdx >= 0 || qActiveAnswer || correctText) && !adminOnly && (
            <div className="admin-q-answer-key fameeri-cmd-question__answer-key">
              <div className="admin-q-answer-key__label">🔑 الإجابة الصحيحة (للمشرف)</div>
              <div className="admin-q-answer-key__value">
                {correctLetter && (
                  <span className="admin-q-answer-key__letter">{correctLetter}</span>
                )}
                <span>{correctText || qActiveAnswer}</span>
              </div>
            </div>
          )}

          {adminOnly && qActiveAnswer && (
            <div className="admin-q-answer-key fameeri-cmd-question__answer-key">
              <div className="admin-q-answer-key__label">🔑 الإجابة المتوقعة (للمشرف)</div>
              <div className="admin-q-answer-key__value">
                {correctLetter && (
                  <span className="admin-q-answer-key__letter">{correctLetter}</span>
                )}
                <span>{qActiveAnswer}</span>
              </div>
            </div>
          )}

          {pendingLeader && !leaderPick && (
            <p className="fameeri-cmd-question__pending">⏳ بانتظار اعتماد القائد — {pendingLeader}</p>
          )}

          {qAdminAnswerContext?.answering?.some((g) =>
            g.memberPicks?.some((p) => p.role !== 'leader')
          ) && (
            <>
              <button
                type="button"
                className="fameeri-cmd-details-toggle"
                onClick={() => setTeamsDetailOpen((v) => !v)}
                aria-expanded={teamsDetailOpen}
              >
                {teamsDetailOpen ? '▲ إخفاء اقتراحات الأعضاء' : '▼ اقتراحات الأعضاء (اختياري)'}
              </button>
              {teamsDetailOpen && (
                <div className="fameeri-cmd-details">
                  <FameeriAdminAnswerVerdict
                    answerCtx={qAdminAnswerContext}
                    qActiveAnswer={qActiveAnswer}
                    qActiveQuestion={qActiveQuestion}
                    accent={accent}
                    embedded
                    suggestionsOnly
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* كشف — أسئلة الجوالات أو تحدي التمثيل */}
      {hasQuestion && !timerRunning && !inShield && (
        <div className="fameeri-cmd-reveal card">
          <div className="fameeri-cmd-reveal__title">
            {step === 2
              ? adminOnly
                ? '🎭 الخطوة 2 — بدء التحدي'
                : '👁️ الخطوة 2 — كشف للمجموعات'
              : adminOnly
                ? '🎭 التحكم بالتحدي'
                : '👁️ التحكم بالكشف'}
          </div>
          {adminOnly ? (
            <AdminActingRevealControls
              current={qActiveQuestion}
              onStartChallenge={onStartActingChallenge}
              onEndChallenge={onEndActingChallenge}
              compact
            />
          ) : (
            <AdminQuestionRevealControls
              current={qActiveQuestion}
              onToggleRevealQuestion={onToggleRevealQuestion}
              onToggleRevealOptions={onToggleRevealOptions}
              onHideAll={onHideAll}
              compact
            />
          )}
        </div>
      )}

      {/* المؤقت — تجهيز أو يعمل (مع أو بدون سؤال) */}
      {(hasQuestion || manualFlow) && !inShield && (
        <div className={`fameeri-cmd-timer card${timerRunning ? ' live' : ''}`}>
          {!timerRunning && (
            <>
              <div className="fameeri-cmd-timer__title">
                {manualFlow ? '⏱️ حكم يدوي' : adminOnly ? '🎭 المؤقت والحكم' : '⏱️ المؤقت والحكم'}
              </div>
              <p className="fameeri-cmd-timer__hint" style={{ marginBottom: 10 }}>
                {externalFlow
                  ? 'اطرح سؤالك شفهياً — شغّل المؤقت (اختياري) ثم احكم بالأسفل.'
                  : manualFlow
                  ? 'لا يوجد سؤال — شغّل المؤقت إن رغبت ثم احكم بالأسفل (صح / خطأ).'
                  : adminOnly
                    ? 'المؤقت مستقل عن الكشف — شغّله متى شئت ثم احكم بالأسفل.'
                    : 'إظهار السؤال/الخيارات اختياري — شغّل المؤقت واحكم بالأسفل.'}
              </p>
              <div className="fameeri-admin-pills">
                {TIMER_PRESETS.map((s) => (
                  <button key={s} type="button" className="btn bg bsm" onClick={() => onStartTimer?.(s)}>
                    {s}ث
                  </button>
                ))}
              </div>
              <div className="fameeri-admin-inline-form" style={{ marginTop: 8 }}>
                <input
                  type="number"
                  className="inp"
                  placeholder="ثوانٍ"
                  value={qCustomTimer ?? ''}
                  onChange={(e) => setQCustomTimer?.(e.target.value)}
                />
                <button
                  type="button"
                  className="btn bg bsm"
                  onClick={() => {
                    const s = parseInt(qCustomTimer, 10) || 30;
                    onStartTimer?.(s);
                  }}
                >
                  ▶️ بدء
                </button>
              </div>
            </>
          )}

          {timerRunning && (
            <>
              <div className="fameeri-cmd-timer__title">
                {timerExpired ? '⏰ انتهى الوقت — احكم الآن' : '⏱️ الوقت المتبقي'}
              </div>
              <div className={`fameeri-cmd-timer__ring${countdownUrgent || timerExpired ? ' urgent' : ''}`}>
                <span className="fameeri-cmd-timer__num">
                  {countdown !== null ? (countdown > 0 ? countdown : '⏰') : '…'}
                </span>
              </div>
              <p className="fameeri-cmd-timer__hint">
                {timerExpired
                  ? '⏰ انتهى الوقت — احكم بالأسفل'
                  : 'يمكنك الحكم في أي وقت من الأزرار بالأسفل'}
              </p>
            </>
          )}
          {attackVerdictBar}
        </div>
      )}

      {/* وضع السرعة — طلبات قبل المؤقت */}
      {isSpeed && !qCurrentAttack && claimIds.length > 0 && !speedBatchActive && !inShield && (
        <div className="fameeri-cmd-speed card">
          <div className="fameeri-cmd-speed__title">📨 طلبات السرعة ({claimIds.length})</div>
          {Object.entries(speedClaims || {}).map(([gid, c]) => (
            <div key={gid} className="fameeri-admin-claim-row">
              <FameeriAdminDuel
                attackerName={c.attackerName}
                targetName={c.targetName}
                tree={c.tree}
                weaponName={c.weaponName}
                size="sm"
              />
            </div>
          ))}
          {claimIds.length > 1 && (
            <div className="ig" style={{ marginTop: 10 }}>
              <label className="lbl">المجموعة الفائزة عند «صح»</label>
              <select
                className="inp"
                value={speedWinSelect}
                onChange={(e) => setSpeedWinSelect?.(e.target.value)}
              >
                <option value="">— اختر —</option>
                {claimIds.map((gid) => (
                  <option key={gid} value={gid}>
                    {groupName(gid)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!canStartSpeedTimer && claimIds.length > 1 && (
            <p className="fameeri-cmd-timer__wait">اختر المجموعة الفائزة لتفعيل المؤقت</p>
          )}
        </div>
      )}

      {/* وضع السرعة — مؤقت */}
      {isSpeed && !qCurrentAttack && !hasQuestion && claimIds.length > 0 && !inShield && (
        <div className={`fameeri-cmd-timer card${timerRunning ? ' live' : ''}`}>
          {!timerRunning && (
            <>
              <div className="fameeri-cmd-timer__title">⚡ حسم السرعة — المؤقت</div>
              <div className="fameeri-admin-pills">
                {[10, 20, 35].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="btn bg bsm"
                    disabled={!canStartSpeedTimer}
                    onClick={() => onStartSpeedTimer?.(s)}
                  >
                    {s}ث
                  </button>
                ))}
              </div>
            </>
          )}
          {timerRunning && (
            <div className={`fameeri-cmd-timer__ring${countdownUrgent ? ' urgent' : ''}`}>
              <span className="fameeri-cmd-timer__num">
                {countdown !== null ? (countdown > 0 ? countdown : '⏰') : '…'}
              </span>
            </div>
          )}
          {speedVerdictBar}
        </div>
      )}

      {/* نافذة الدرع */}
      {inShield && (
        <div className="fameeri-cmd-shield card">
          <div className="fameeri-cmd-shield__title">🛡️ نافذة الدرع</div>
          <div className={`fameeri-cmd-timer__ring shield${countdownUrgent ? ' urgent' : ''}`}>
            <span className="fameeri-cmd-timer__num">
              {countdown !== null ? (countdown > 0 ? countdown : '⏰') : '…'}
            </span>
          </div>
          <p className="fameeri-cmd-shield__hint">
            {shieldTargetGroup?.name} — فرصة تفعيل الدرع (مرة واحدة)
          </p>
          {shieldTargetGroup?.shield === attack?.tree && (
            <div className="fameeri-cmd-shield__active">🛡️ الدرع مُفعّل على 🌳{attack?.tree}</div>
          )}
        </div>
      )}

    </div>
  );
}

export function isCommandCenterActive({
  qCurrentAttack,
  qActiveQuestion,
  shieldWindow,
  isSpeed,
  claimIds,
  qTimer,
  speedBatchActive,
}) {
  return !!(
    qCurrentAttack ||
    qActiveQuestion ||
    shieldWindow ||
    (isSpeed && (claimIds?.length || qTimer || speedBatchActive))
  );
}
