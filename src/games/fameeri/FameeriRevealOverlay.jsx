import { useState, useEffect, useMemo, useRef } from 'react';
import '../../styles/fameeri-reveal.css';
import FameeriMatchSummary from './FameeriMatchSummary';

const WEAPON_EMOJI = {
  showzel: '💥',
  omsagma: '🎯',
  nabeeta: '🪃',
};

function weaponEmoji(qReveal) {
  if (qReveal.weapon === 'showzel' || qReveal.weaponName?.includes('شوز')) return WEAPON_EMOJI.showzel;
  if (qReveal.weapon === 'omsagma' || qReveal.weaponName?.includes('صتم')) return WEAPON_EMOJI.omsagma;
  return WEAPON_EMOJI.nabeeta;
}

function RevealBackdrop({ resultType, phase }) {
  const flashOn = phase === 'weapon' || (phase === 'result' && resultType === 'success');
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${8 + ((i * 47) % 84)}%`,
        top: `${12 + ((i * 31) % 76)}%`,
        '--px': `${((i * 17) % 100) - 50}px`,
        '--py': `${-40 - ((i * 23) % 80)}px`,
        delay: `${(i % 6) * 0.08}s`,
      })),
    []
  );

  return (
    <div className="q-reveal__vfx" aria-hidden>
      <div className="q-reveal__vignette" />
      <div className="q-reveal__scanlines" />
      <div className="q-reveal__orb q-reveal__orb--1" />
      <div className="q-reveal__orb q-reveal__orb--2" />
      <div className={`q-reveal__flash${flashOn ? ' is-on' : ''}`} />
      {phase === 'result' && resultType === 'success' && (
        <>
          <div className="q-reveal__shockwave is-on" />
          <div className="q-reveal__particles">
            {particles.map((p) => (
              <span
                key={p.id}
                className="q-reveal__particle"
                style={{
                  left: p.left,
                  top: p.top,
                  '--px': p['--px'],
                  '--py': p['--py'],
                  animationDelay: p.delay,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PhaseProgress({ phase }) {
  const steps = ['suspense', 'weapon', 'result'];
  const idx = steps.indexOf(phase);
  return (
    <div className="q-reveal__progress" aria-hidden>
      {steps.map((s, i) => (
        <div
          key={s}
          className={[
            'q-reveal__progress-step',
            i < idx ? 'is-done' : '',
            i === idx ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </div>
  );
}

function DigitalCountdown({ active }) {
  const [tick, setTick] = useState(3);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (!active) return undefined;
    setTick(3);
    const t2 = setTimeout(() => setTick(2), 700);
    const t1 = setTimeout(() => setTick(1), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;
    setPop(true);
    const t = setTimeout(() => setPop(false), 300);
    return () => clearTimeout(t);
  }, [tick, active]);

  if (!active) return null;

  return (
    <div className="q-reveal-digital">
      <span className="q-reveal-digital__label">الكشف خلال</span>
      <span className={`q-reveal-digital__display${pop ? ' is-tick' : ''}`}>
        {String(tick).padStart(2, '0')}
      </span>
    </div>
  );
}

function WeaponFlash({ emoji }) {
  return (
    <div className="q-reveal-weapon-flash">
      <div className="q-shake">
        <div className="q-weapon-flash">{emoji}</div>
      </div>
    </div>
  );
}

/** بطاقة الحكم — بدون تكرار أسماء المجموعات (موجودة أعلى الشاشة) */
function RevealVerdictCard({ type, children }) {
  return (
    <div className={`q-reveal-result-card q-reveal-result-card--${type}`}>
      <div className="q-reveal-result-line">{children}</div>
    </div>
  );
}

function AnimatedHuntNum({ target }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!target || target <= 0) {
      setDisplay(0);
      return undefined;
    }
    const start = performance.now();
    const duration = 850;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      setDisplay(Math.round(eased * target));
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target]);

  return <div className="q-num q-reveal-hunt-num q-reveal-digital-num">−{display}</div>;
}

/**
 * مشهد كشف نتيجة الهجوم — سينمائي مع تشويق وعدّاد رقمي ومؤثرات بصرية.
 * عرض فقط — المراحل والتوقيت يتحكّم بها FameeriGame (suspense → weapon → result).
 */
export default function FameeriRevealOverlay({
  qReveal,
  showContinue = false,
  onContinue,
  showAdminChrome = true,
}) {
  if (!qReveal) return null;

  const wEmoji = weaponEmoji(qReveal);
  const resultType = qReveal.phase === 'result' ? qReveal.type : 'pending';
  const bgClass =
    resultType === 'success'
      ? 'q-reveal-bg-success'
      : resultType === 'shielded'
        ? 'q-reveal-bg-shield'
        : resultType === 'empty'
          ? 'q-reveal-bg-empty'
          : resultType === 'fail'
            ? 'q-reveal-bg-fail'
            : 'q-reveal-bg-pending';

  const birdStyles = useMemo(() => {
    const n = Math.min(qReveal.hunted || 0, 30);
    return Array.from({ length: n }, (_, i) => ({
      '--br': `${((i * 37) % 80) - 40}deg`,
      animationDelay: `${i * 0.06}s`,
    }));
  }, [qReveal.hunted, qReveal.phase]);

  return (
    <div className={`q-reveal ${bgClass}`} role="dialog" aria-modal="true" aria-label="كشف الهجوم">
      <RevealBackdrop resultType={resultType} phase={qReveal.phase} />
      {showAdminChrome && <PhaseProgress phase={qReveal.phase} />}

      <div className="q-reveal-legend">
        <div className="q-reveal-legend__ribbon">🎬 كشف الهجوم</div>

        <FameeriMatchSummary
          attackerName={qReveal.attackerName}
          targetName={qReveal.targetName}
          tree={qReveal.tree}
          weaponName={qReveal.weaponName || qReveal.weapon}
          weaponIcon={wEmoji}
          size="sm"
          variant="reveal"
        />
      </div>

      <div className={`q-scene${qReveal.phase === 'result' ? ' q-scene--result' : ''}`} key={qReveal.phase}>
        {qReveal.phase === 'suspense' && (
          <div className="q-reveal-suspense">
            <div className="q-reveal-tree-stage">
              <span className="q-reveal-tree-ring" />
              <span className="q-reveal-tree-ring" />
              <span className="q-reveal-tree-ring" />
              <div className="q-tree-big">🌳</div>
            </div>
            <div className="q-reveal-phase-title">حبس الأنفاس…</div>
            <div className="q-suspense">ماذا يخبئ شجر «{qReveal.tree}»؟</div>
            <DigitalCountdown active />
            <div className="q-reveal-dots" aria-hidden>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {qReveal.phase === 'weapon' && (
          <div className="q-reveal-weapon">
            <WeaponFlash emoji={wEmoji} />
            <div className="q-reveal-phase-title">إطلاق السلاح!</div>
            <div className="q-reveal-phase-sub">{qReveal.weaponName || qReveal.weapon}</div>
          </div>
        )}

        {qReveal.phase === 'result' && qReveal.type === 'success' && (
          <>
            <div className="q-reveal-result-head q-reveal-result-head--impact q-reveal-pop">🎯 إصابة!</div>
            <div className="q-birds">
              {birdStyles.map((style, i) => (
                <span key={i} className="q-bird" style={style}>
                  🐦
                </span>
              ))}
            </div>
            <AnimatedHuntNum target={qReveal.hunted} />
            <RevealVerdictCard type="success">
              تم اصطياد <strong className="q-reveal-hunt-count">{qReveal.hunted}</strong> قميري
            </RevealVerdictCard>
          </>
        )}

        {qReveal.phase === 'result' && qReveal.type === 'shielded' && (
          <>
            <div className="q-reveal-shield-scene">
              <div className="q-reveal-shield-burst" aria-hidden />
              <div className="q-reveal-shield-icon q-reveal-pop">🛡️</div>
              <div className="q-reveal-shield-spark" aria-hidden>
                ✨
              </div>
            </div>
            <div className="q-reveal-result-head q-reveal-result-head--shield q-reveal-result-head--impact q-reveal-pop">
              صد الهجوم!
            </div>
            <RevealVerdictCard type="shield">
              🛡️ الدرع صد الهجوم — لا صيد · السلاح أُهدر
            </RevealVerdictCard>
          </>
        )}

        {qReveal.phase === 'result' && qReveal.type === 'empty' && (
          <>
            <div className="q-reveal-empty-scene">
              <div className="q-empty-face">😂</div>
              <div className="q-reveal-dust" aria-hidden />
            </div>
            <div className="q-reveal-result-head q-reveal-result-head--empty q-reveal-result-head--impact">
              شجرة فارغة!
            </div>
            <RevealVerdictCard type="empty">لا قميري — الهجوم بلا كسب</RevealVerdictCard>
          </>
        )}

        {qReveal.phase === 'result' && qReveal.type === 'fail' && (
          <>
            <div className="q-reveal-fail-scene">
              <div className="q-reveal-miss-cross" aria-hidden>
                ✕
              </div>
              <div className="q-reveal-fail-icon q-reveal-pop">💨</div>
            </div>
            <div className="q-reveal-result-head q-reveal-result-head--fail q-reveal-result-head--impact">
              الهجوم لم يُحسب
            </div>
            <RevealVerdictCard type="fail">إجابة خاطئة — لا صيد</RevealVerdictCard>
          </>
        )}

        {qReveal.poisonMsg && <div className="q-reveal-poison">{qReveal.poisonMsg}</div>}
      </div>

      {showContinue && typeof onContinue === 'function' && qReveal.phase === 'result' && (
        <button className="btn bg mt3 q-reveal-continue" type="button" onClick={onContinue}>
          ▶️ متابعة
        </button>
      )}

      {!showContinue && qReveal.phase === 'result' && (
        <p className="q-reveal-player-wait">⏳ بانتظار المشرف…</p>
      )}
    </div>
  );
}
