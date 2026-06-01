import { useState } from 'react';
import { Q_WEAPONS } from '../../core/constants';
import {
  getCorrectOptionIndex,
  optionLabel,
} from '../../question-bank/questionSession';
import AdminQuestionRevealControls from '../../question-bank/AdminQuestionRevealControls';
import AdminActingRevealControls from '../../question-bank/AdminActingRevealControls';
import FameeriAdminDuel from './FameeriAdminDuel';
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
    if (hasQuestion && !revealStepDone) return 2;
    if (hasQuestion) return 3;
    return 1;
  })();

  const steps = [
    { id: 1, label: 'السؤال', icon: '❓' },
    { id: 2, label: 'الكشف', icon: '👁️' },
    { id: 3, label: 'المؤقت', icon: '⏱️' },
    { id: 4, label: 'الحسم', icon: '⚖️' },
  ];

  const countdown = inShield ? shieldCountdown : qCountdown;
  const countdownUrgent = countdown !== null && countdown <= 5 && countdown > 0;
  const timerExpired = timerRunning && countdown !== null && countdown <= 0;
  const showSpeedVerdict = isSpeed && !qCurrentAttack && claimIds.length > 0 && !inShield;
  const showAttackVerdict = !inShield && !!qCurrentAttack && hasQuestion;

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
      <div className="fameeri-cmd-steps card">
        {steps.map((s, i) => (
          <div key={s.id} className="fameeri-cmd-steps__item-wrap">
            <div
              className={`fameeri-cmd-step${step === s.id ? ' active' : ''}${step > s.id ? ' done' : ''}`}
            >
              <span className="fameeri-cmd-step__icon">{step > s.id ? '✓' : s.icon}</span>
              <span className="fameeri-cmd-step__label">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`fameeri-cmd-steps__line${step > s.id ? ' done' : ''}`} />}
          </div>
        ))}
      </div>

      {/* الهجوم */}
      {attack && (
        <div className="fameeri-cmd-attack card">
          <div className="fameeri-cmd-attack__badge">⚔️ هجوم نشط</div>
          <FameeriAdminDuel
            attackerName={attack.attackerName}
            targetName={attack.targetName}
            tree={attack.tree}
            weaponName={attack.weaponName || wDef?.name}
            weaponIcon={wDef?.icon}
            size="lg"
          />
        </div>
      )}

      {/* بدون سؤال — اطلب السحب */}
      {attack && !hasQuestion && onDrawNext && (
        <div className="fameeri-cmd-prompt card">
          <div className="fameeri-cmd-prompt__title">الخطوة 1 — اسحب سؤالاً</div>
          <p className="fameeri-cmd-prompt__text">
            السلاح <strong>{wDef?.icon} {wDef?.name}</strong> يحدد مستوى السؤال
          </p>
          <button type="button" className="btn bg fameeri-cmd-prompt__btn" onClick={onDrawNext}>
            ❓ سحب سؤال للهجوم
          </button>
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
                const isCorrect = i === correctIdx;
                const isLeader = leaderPick && leaderPick.opt === i;
                return (
                  <div
                    key={i}
                    className={`admin-q-option${isCorrect ? ' admin-q-option--correct' : ''}${isLeader && !isCorrect ? ' admin-q-option--leader' : ''}`}
                  >
                    <span className="admin-q-option__letter">{optionLabel(i)}</span>
                    <span className="admin-q-option__text">{opt}</span>
                    {isCorrect && <span className="admin-q-option__badge">✓</span>}
                  </div>
                );
              })}
            </div>
          )}

          {(leaderPick || correctText || qActiveAnswer) && (
            <p
              className={`fameeri-cmd-question__key${leaderPick ? (leaderPick.correct ? ' ok' : ' miss') : ''}`}
            >
              🔑{' '}
              {leaderPick
                ? 'الإجابة المعتمدة'
                : adminOnly
                  ? 'الإجابة المتوقعة'
                  : 'الإجابة الصحيحة'}
              :{' '}
              <strong>
                {leaderPick
                  ? `${leaderPick.letter || ''}${leaderPick.letter ? ' — ' : ''}${leaderPick.optText}`
                  : hasOptions && correctLetter
                    ? `${correctLetter} — ${correctText}`
                    : qActiveAnswer || correctText}
              </strong>
            </p>
          )}

          {pendingLeader && !leaderPick && (
            <p className="fameeri-cmd-question__pending">⏳ بانتظار اعتماد القائد — {pendingLeader}</p>
          )}

          {qAdminAnswerContext &&
            (qAdminAnswerContext.manualOnly || (qAdminAnswerContext.answering?.length ?? 0) > 0) && (
              <>
                <button
                  type="button"
                  className="fameeri-cmd-details-toggle"
                  onClick={() => setTeamsDetailOpen((v) => !v)}
                  aria-expanded={teamsDetailOpen}
                >
                  {teamsDetailOpen ? '▲ إخفاء حالة المجموعات' : '▼ حالة المجموعات والاقتراحات'}
                </button>
                {teamsDetailOpen && (
                  <div className="fameeri-cmd-details">
                    <FameeriAdminAnswerVerdict
                      answerCtx={qAdminAnswerContext}
                      qActiveAnswer={qActiveAnswer}
                      qActiveQuestion={qActiveQuestion}
                      accent={accent}
                      embedded
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

      {/* المؤقت — تجهيز أو يعمل */}
      {hasQuestion && !inShield && (
        <div className={`fameeri-cmd-timer card${timerRunning ? ' live' : ''}`}>
          {!timerRunning && (
            <>
              <div className="fameeri-cmd-timer__title">
                {adminOnly ? '🎭 المؤقت والحكم' : '⏱️ المؤقت والحكم'}
              </div>
              <p className="fameeri-cmd-timer__hint" style={{ marginBottom: 10 }}>
                {adminOnly
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
