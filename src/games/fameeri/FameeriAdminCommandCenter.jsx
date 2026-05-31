import { useState } from 'react';
import { Q_WEAPONS } from '../../core/constants';
import {
  getCorrectOptionIndex,
  optionLabel,
} from '../../question-bank/questionSession';
import AdminQuestionRevealControls from '../../question-bank/AdminQuestionRevealControls';
import FameeriAdminDuel from './FameeriAdminDuel';
import FameeriAdminAnswerVerdict from './FameeriAdminAnswerVerdict';

const TIMER_PRESETS = [15, 30, 45, 60];

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
  onDrawNext,
  onStartTimer,
  onStartSpeedTimer,
  onVerdictOk,
  onVerdictFail,
  onSpeedVerdictOk,
  onSpeedVerdictFail,
  accent = 'var(--fameeri-primary)',
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const attack = qCurrentAttack || shieldTargetAttack;
  const hasQuestion = !!qActiveQuestion;
  const adminOnly = qActiveQuestion?.adminOnly;
  const hasOptions = Array.isArray(qActiveQuestion?.options) && qActiveQuestion.options.length > 0;
  const revealed = !!qActiveQuestion?.revealToPlayers;
  const optionsRevealed = !hasOptions || !!qActiveQuestion?.revealOptions;
  const revealReady = revealed && optionsRevealed;
  const timerRunning = !!qTimer && !shieldWindow;
  const inShield = !!shieldWindow;

  const correctIdx = hasQuestion && hasOptions ? getCorrectOptionIndex(qActiveQuestion.options, qActiveAnswer) : -1;
  const correctLetter = correctIdx >= 0 ? optionLabel(correctIdx) : null;

  const step = (() => {
    if (inShield) return 4;
    if (timerRunning) return 4;
    if (revealReady && !qTimer) return 3;
    if (hasQuestion && !revealReady) return 2;
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
  const showSpeedVerdictDock = isSpeed && timerRunning && !qCurrentAttack && !inShield;
  const showVerdictDock = timerRunning && !inShield && (qCurrentAttack || (isSpeed && claimIds.length));
  const hasDock = (showVerdictDock && qCurrentAttack) || showSpeedVerdictDock;

  const wDef = attack ? Q_WEAPONS.find((w) => w.id === attack.weapon) : null;
  const groupName = (gid) => qGList.find((g) => g.id === gid)?.name || gid;

  return (
    <div className={`fameeri-cmd${hasDock ? ' fameeri-cmd--dock' : ''}`}>
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

      {/* السؤال — ملخص للمشرف */}
      {hasQuestion && (
        <div className="fameeri-cmd-question card" style={{ borderColor: accent }}>
          <div className="fameeri-cmd-question__head">
            <span className="fameeri-cmd-question__label">السؤال</span>
          </div>
          <p className="fameeri-cmd-question__text">{qActiveQuestion.text}</p>

          <FameeriAdminAnswerVerdict
            answerCtx={qAdminAnswerContext}
            qActiveAnswer={qActiveAnswer}
            qActiveQuestion={qActiveQuestion}
            accent={accent}
          />

          <button
            type="button"
            className="fameeri-cmd-details-toggle"
            onClick={() => setDetailsOpen((v) => !v)}
            aria-expanded={detailsOpen}
          >
            {detailsOpen ? '▲ إخفاء التفاصيل' : '▼ تفاصيل السؤال والخيارات'}
          </button>

          {detailsOpen && (
            <div className="fameeri-cmd-details">
              {hasOptions && (
                <div className="admin-q-options">
                  {qActiveQuestion.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`admin-q-option${i === correctIdx ? ' admin-q-option--correct' : ''}`}
                    >
                      <span className="admin-q-option__letter">{optionLabel(i)}</span>
                      <span className="admin-q-option__text">{opt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* الكشف — قبل المؤقت */}
      {hasQuestion && !adminOnly && !timerRunning && !inShield && (
        <div className="fameeri-cmd-reveal card">
          <div className="fameeri-cmd-reveal__title">
            {step === 2 ? '👁️ الخطوة 2 — كشف للمجموعات' : '👁️ التحكم بالكشف'}
          </div>
          <AdminQuestionRevealControls
            current={qActiveQuestion}
            onToggleRevealQuestion={onToggleRevealQuestion}
            onToggleRevealOptions={onToggleRevealOptions}
            onHideAll={onHideAll}
            compact
          />
        </div>
      )}

      {/* المؤقت — تجهيز أو يعمل */}
      {hasQuestion && !adminOnly && !inShield && (
        <div className={`fameeri-cmd-timer card${timerRunning ? ' live' : ''}`}>
          {!timerRunning && revealReady && (
            <>
              <div className="fameeri-cmd-timer__title">⏱️ الخطوة 3 — شغّل المؤقت</div>
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

          {!timerRunning && !revealReady && (
            <p className="fameeri-cmd-timer__wait">أظهر السؤال للمجموعات أولاً ثم ابدأ المؤقت</p>
          )}

          {timerRunning && (
            <>
              <div className="fameeri-cmd-timer__title">⏱️ الوقت المتبقي</div>
              <div className={`fameeri-cmd-timer__ring${countdownUrgent ? ' urgent' : ''}`}>
                <span className="fameeri-cmd-timer__num">
                  {countdown !== null ? (countdown > 0 ? countdown : '⏰') : '…'}
                </span>
              </div>
              <p className="fameeri-cmd-timer__hint">اضغط الحكم أسفل — ✅ صح أو ❌ خطأ</p>
            </>
          )}
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

      {/* شريط الحسم الثابت */}
      {showVerdictDock && qCurrentAttack && (
        <div className="fameeri-cmd-dock" role="group" aria-label="حكم المشرف">
          <button
            type="button"
            className={`fameeri-cmd-verdict fameeri-cmd-verdict--ok${qAdminAnswerContext?.autoVerdict === true ? ' suggested' : ''}`}
            onClick={onVerdictOk}
          >
            <span className="fameeri-cmd-verdict__icon">✅</span>
            <span className="fameeri-cmd-verdict__label">صح</span>
            <span className="fameeri-cmd-verdict__sub">نجاح الهجوم</span>
          </button>
          <div className="fameeri-cmd-dock__gap" aria-hidden />
          <button
            type="button"
            className={`fameeri-cmd-verdict fameeri-cmd-verdict--fail${qAdminAnswerContext?.autoVerdict === false ? ' suggested' : ''}`}
            onClick={onVerdictFail}
          >
            <span className="fameeri-cmd-verdict__icon">❌</span>
            <span className="fameeri-cmd-verdict__label">خطأ</span>
            <span className="fameeri-cmd-verdict__sub">فشل الهجوم</span>
          </button>
        </div>
      )}

      {showSpeedVerdictDock && (
        <div className="fameeri-cmd-dock" role="group" aria-label="حكم السرعة">
          <button
            type="button"
            className="fameeri-cmd-verdict fameeri-cmd-verdict--ok"
            disabled={claimIds.length > 1 && !speedWinSelect}
            onClick={onSpeedVerdictOk}
          >
            <span className="fameeri-cmd-verdict__icon">✅</span>
            <span className="fameeri-cmd-verdict__label">صح</span>
          </button>
          <div className="fameeri-cmd-dock__gap" aria-hidden />
          <button type="button" className="fameeri-cmd-verdict fameeri-cmd-verdict--fail" onClick={onSpeedVerdictFail}>
            <span className="fameeri-cmd-verdict__icon">❌</span>
            <span className="fameeri-cmd-verdict__label">خطأ</span>
          </button>
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
