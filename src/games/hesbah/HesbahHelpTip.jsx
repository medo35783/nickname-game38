import { useState, useRef, useEffect } from 'react';

/** أيقونة معلومات صغيرة — شرح عند الطلب فقط */
export function HesbahInfoBtn({ content, label = 'معلومات' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  if (!content) return null;

  return (
    <span className="hesbah-i" ref={ref}>
      <button
        type="button"
        className={`hesbah-i__btn ${open ? 'is-on' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label}
        title={label}
      >
        i
      </button>
      {open && (
        <div className="hesbah-i__pop" role="tooltip">
          {typeof content === 'string' ? <p>{content}</p> : content}
        </div>
      )}
    </span>
  );
}

/** عنوان مختصر + i */
export function HesbahPanelTitle({ children, help, helpLabel = 'معلومات', className = '' }) {
  return (
    <div className={`hesbah-sec-head ${className}`.trim()}>
      <span className="hesbah-sec-head__label">{children}</span>
      {help && <HesbahInfoBtn content={help} label={helpLabel} />}
    </div>
  );
}

export default HesbahInfoBtn;

export const HESBAH_TOOLS_HELP = (
  <ul className="hesbah-i__list">
    <li>كرت واحد نشط لكل جولة — يُفعَّل بعد بدء المؤقت.</li>
    <li>
      <strong>🔥 2X</strong> خطر مضاعف: الخطأ أو التكرار يخصم ضعف الدرجة.
    </li>
    <li>
      <strong>🔥</strong> خطر: الخطأ أو التكرار يخصم الدرجة.
    </li>
    <li>
      <strong>💎 X3</strong> ثلاثي: ×3 للإجابة الصحيحة.
    </li>
    <li>
      <strong>🎲</strong> حظ: درجة عشوائية عند الإرسال.
    </li>
    <li>
      <strong>⚔️</strong> حصار: أعلى درجة عالية تلقائياً.
    </li>
    <li>
      <strong>🕶️</strong> ظلام: لا بطاقات حية حتى اكتمال الإجابات أو انتهاء الوقت.
    </li>
  </ul>
);

export const HESBAH_PLAYER_POWERS_HELP = (
  <ul className="hesbah-i__list">
    <li>
      <strong>🛡️ درع</strong> — مرة واحدة: إذا تكررت مع شخص واحد فقط تُحمى.
    </li>
    <li>
      <strong>✏️ تعديل</strong> — مرة واحدة: غيّر إجابتك بعد الإرسال.
    </li>
    <li>
      <strong>💪 ثقة X2</strong> — مرة واحدة: إذا صحت ×2 على درجتك.
    </li>
  </ul>
);

export const HESBAH_HOST_PARTICIPATE_HELP = (
  <ul className="hesbah-i__list">
    <li>
      <strong>إدارة فقط:</strong> ترى الأسماء والإجابات فوراً.
    </li>
    <li>
      <strong>أشارك:</strong> ترى الأسماء والمؤشرات — وبعد إرسالك تظهر الإجابات.
    </li>
    <li>عرضية — بلا نقاط.</li>
  </ul>
);

export const HESBAH_LIVE_OPS_HELP = 'نصوص الإجابات تظهر هنا فور إرسالها — قائمة الأسماء أعلاه تُحدَّث مباشرة.';

export const HESBAH_LIVE_HOST_HELP = 'بعد إرسال إجابتك تُفعَّل بطاقات الإجابات هنا.';

export const HESBAH_HOST_ANSWER_HELP = 'للعرض والمقارنة — لا تُحسب نقاطاً.';

export const HESBAH_ROSTER_HELP = '✓ أرسل · ⏳ لم يرسل بعد. في وضع «أشارك» تبقى النصوص مخفية حتى ترسل إجابتك.';
