import { useState, useRef, useEffect } from 'react';

/** أيقونة معلومات صغيرة — شرح عند الطلب فقط */
export function SniperInfoBtn({ content, label = 'معلومات' }) {
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
    <span className="sniper-i" ref={ref}>
      <button
        type="button"
        className={`sniper-i__btn ${open ? 'is-on' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label}
        title={label}
      >
        i
      </button>
      {open && (
        <div className="sniper-i__pop" role="tooltip">
          {typeof content === 'string' ? <p>{content}</p> : content}
        </div>
      )}
    </span>
  );
}

/** عنوان مختصر + i */
export function SniperPanelTitle({ children, help, helpLabel = 'معلومات', className = '' }) {
  return (
    <div className={`sniper-sec-head ${className}`.trim()}>
      <span className="sniper-sec-head__label">{children}</span>
      {help && <SniperInfoBtn content={help} label={helpLabel} />}
    </div>
  );
}

export default SniperInfoBtn;

export const SNIPER_TOOLS_HELP = (
  <ul className="sniper-i__list">
    <li>اضغط للتفعيل/الإلغاء — لا يبدأ المؤقت.</li>
    <li>
      <strong>🙈</strong> عميان: التصنيف فقط للاعبين.
    </li>
    <li>
      <strong>⚡</strong> سرعة: 10 ث ثابتة.
    </li>
    <li>
      <strong>✖️2</strong> مضاعف: ضعف النقاط الصحيحة.
    </li>
  </ul>
);

export const SNIPER_HOST_PARTICIPATE_HELP = (
  <ul className="sniper-i__list">
    <li>
      <strong>إدارة فقط:</strong> ترى كل الإجابات فوراً.
    </li>
    <li>
      <strong>أشارك:</strong> عداد ثم بطاقات مثل اللاعبين.
    </li>
    <li>عرضية — بلا نقاط.</li>
  </ul>
);

export const SNIPER_LIVE_OPS_HELP = 'إرسال اللاعبين يظهر هنا فوراً — هم يرون بعضهم بعد إرسالهم.';

export const SNIPER_LIVE_HOST_HELP = 'بعد إرسال إجابتك تُفعَّل البطاقات الحية.';

export const SNIPER_HOST_ANSWER_HELP = 'للعرض والمقارنة — لا تُحسب نقاطاً.';

export const SNIPER_SUBMIT_COUNTER_HELP = 'أرسل إجابتك أولاً لتفعيل البطاقات.';
