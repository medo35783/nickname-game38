import { useEffect } from 'react';

/**
 * شاشة بعد انتهاء اللعبة للمتسابقين غير المشتركين — دعوة للاشتراك والباقات.
 *
 * @typedef {{ rank?: number; hits?: number; accuracy?: number; time?: string | number }} PlayerStats
 * @typedef {{ id: string; icon: string; durationLabel: string; price: number; days: number; badge?: string | null; planClass: string; feats: string[]; popular?: boolean; best?: boolean; cardStyle?: object }} SubscriptionPackage
 *
 * @param {object} props
 * @param {string} props.winner
 * @param {PlayerStats} [props.playerStats]
 * @param {() => void} props.onClose
 * @param {(pkg: SubscriptionPackage) => void} props.onSubscribe
 * @param {() => void} props.onTryFree
 * @param {() => void} [props.onNewGame] — إن لم يُمرَّر، يُستدعى `onClose` عند «لعبة جديدة»
 */
const SUB_FEATURES = [
  '✅ إنشاء غرف غير محدودة',
  '✅ كن المشرف وتحكم باللعبة',
  '✅ حفظ إحصائياتك وإنجازاتك',
  '✅ أولوية في الميزات الجديدة'
];

const DAY_PRICE_REF = 19;

/** @returns {number | null} */
function savingsPercent(days, price) {
  if (days <= 1) return null;
  const ref = days * DAY_PRICE_REF;
  if (ref <= 0) return null;
  return Math.round(((ref - price) / ref) * 100);
}

function formatTimeDisplay(time) {
  if (time == null || time === '') return '—';
  if (typeof time === 'string') return time;
  const s = Number(time);
  if (!Number.isFinite(s)) return String(time);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  if (m <= 0) return `${sec}ث`;
  return `${m}د ${sec}ث`;
}

const PACKAGES = [
  {
    id: '1d',
    icon: '🌟',
    durationLabel: 'يوم واحد',
    price: 19,
    days: 1,
    planClass: 'plan-silver',
    badge: null,
    cardStyle: { transform: 'none' },
    feats: ['وصول كامل طوال المدة', 'تفعيل فوري بعد الدفع', 'دعم عبر التطبيق']
  },
  {
    id: '3d',
    icon: '⭐',
    durationLabel: '3 أيام',
    price: 38,
    days: 3,
    planClass: 'plan-gold',
    badge: 'الأشهر',
    popular: true,
    cardStyle: {
      boxShadow: '0 0 0 2px rgba(240, 192, 64, 0.45), 0 12px 40px rgba(240, 192, 64, 0.12)',
      transform: 'scale(1.02)'
    },
    feats: ['أفضل توازن سعر ومدة', 'مثالي لعطلة نهاية الأسبوع', 'غرف غير محدودة', 'تحكم كامل كمشرف']
  },
  {
    id: '7d',
    icon: '💎',
    durationLabel: '7 أيام',
    price: 57,
    days: 7,
    planClass: 'plan-super',
    badge: 'الأفضل',
    best: true,
    cardStyle: {
      boxShadow: '0 0 0 2px rgba(155, 89, 182, 0.55), 0 14px 44px rgba(155, 89, 182, 0.18)',
      transform: 'scale(1.03)'
    },
    feats: ['أقصى وفر مقارنة باليومي', 'أسبوع كامل مع أصدقائك', 'إحصائيات وإنجازات محفوظة', 'أولوية في الميزات الجديدة']
  }
];

export default function EndGameJoinPrompt({
  winner,
  playerStats,
  onClose,
  onSubscribe,
  onTryFree,
  onNewGame
}) {
  const handleNewGame = onNewGame ?? onClose;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="exit-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="egjp-title"
      style={{
        justifyContent: 'flex-start',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px 14px 28px'
      }}
      onClick={onClose}
    >
      <div
        onClick={stop}
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          position: 'relative'
        }}
      >
        <button
          type="button"
          className="btn bgh bxs"
          onClick={onClose}
          aria-label="إغلاق"
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
        >
          ✕
        </button>

        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <div className="exit-icon" style={{ fontSize: 72, lineHeight: 1 }}>
            🎉
          </div>
          <h2
            id="egjp-title"
            className="ptitle"
            style={{ fontSize: 26, marginTop: 14, marginBottom: 6, color: 'var(--gold)', WebkitTextFillColor: 'unset', background: 'none' }}
          >
            اللعبة انتهت!
          </h2>
          <p className="psub" style={{ marginBottom: 12, fontSize: 14, color: 'var(--text)' }}>
            🏆 الفائز: <strong style={{ color: 'var(--gold)' }}>{winner || '—'}</strong>
          </p>
        </div>

        {playerStats && (playerStats.rank != null || playerStats.hits != null || playerStats.accuracy != null || playerStats.time != null) ? (
          <div className="card" style={{ marginBottom: 12, background: 'linear-gradient(145deg, rgba(79,163,224,.08), rgba(15,15,34,.95))', borderColor: 'rgba(79,163,224,.25)' }}>
            <div className="ctitle" style={{ marginBottom: 10 }}>
              📊 أداؤك في الجولة
            </div>
            <div className="sg sg3" style={{ marginBottom: 0 }}>
              <div className="sbox">
                <div className="snum">{playerStats.rank ?? '—'}</div>
                <div className="slbl">الترتيب</div>
              </div>
              <div className="sbox">
                <div className="snum">{playerStats.hits ?? '—'}</div>
                <div className="slbl">الإصابات</div>
              </div>
              <div className="sbox">
                <div className="snum">
                  {playerStats.accuracy != null && playerStats.accuracy !== '' ? `${Number(playerStats.accuracy).toFixed(0)}%` : '—'}
                </div>
                <div className="slbl">الدقة</div>
              </div>
            </div>
            <div className="sbox mt2" style={{ marginBottom: 0 }}>
              <div className="snum" style={{ fontSize: 18 }}>
                {formatTimeDisplay(playerStats.time)}
              </div>
              <div className="slbl">الوقت</div>
            </div>
          </div>
        ) : null}

        <div
          className="card ann ag"
          style={{
            textAlign: 'center',
            marginBottom: 12,
            background: 'linear-gradient(135deg, rgba(155,89,182,.12), rgba(240,192,64,.06))',
            borderColor: 'rgba(155, 89, 182, 0.35)'
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 6 }}>💎</div>
          <div style={{ fontFamily: "'Cairo', sans-serif", fontSize: 17, fontWeight: 900, color: 'var(--text)', marginBottom: 6 }}>
            هل استمتعت باللعبة؟
          </div>
          <div className="psub" style={{ marginBottom: 0, fontSize: 13 }}>
            🎮 احصل على اشتراكك الخاص وأنشئ غرفة مع من تحب!
          </div>
        </div>

        <div className="card2" style={{ marginBottom: 12 }}>
          {SUB_FEATURES.map((line) => (
            <div key={line} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.9, fontWeight: 600 }}>
              {line}
            </div>
          ))}
        </div>

        <div className="ctitle" style={{ marginBottom: 10, justifyContent: 'center' }}>
          💳 اختر باقتك
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
          {PACKAGES.map((pkg) => {
            const save = savingsPercent(pkg.days, pkg.price);
            return (
              <div
                key={pkg.id}
                className={`plan-card ${pkg.planClass}`}
                style={{
                  ...pkg.cardStyle,
                  marginBottom: 0,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {pkg.badge ? (
                  <span
                    className="plan-badge badge"
                    style={
                      pkg.best
                        ? { background: 'rgba(155, 89, 182, 0.25)', color: '#e8d4ff', border: '1px solid rgba(155, 89, 182, 0.55)', right: 10, left: 'auto' }
                        : { background: 'rgba(240, 192, 64, 0.2)', color: 'var(--gold)', border: '1px solid rgba(240, 192, 64, 0.45)', right: 10, left: 'auto' }
                    }
                  >
                    {pkg.badge}
                  </span>
                ) : null}
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 40, lineHeight: 1, display: 'block' }}>{pkg.icon}</span>
                  <div className="plan-name" style={{ marginTop: 6 }}>
                    {pkg.durationLabel}
                  </div>
                  <div style={{ fontFamily: "'Cairo', sans-serif", fontSize: 28, fontWeight: 900, color: 'var(--gold)', marginTop: 4 }}>
                    {pkg.price}{' '}
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)' }}>ريال</span>
                  </div>
                  {save != null && save > 0 ? (
                    <div className="tag tv" style={{ marginTop: 8 }}>
                      وفر {save}% مقارنة باليومي
                    </div>
                  ) : (
                    <div className="tag tm" style={{ marginTop: 8 }}>
                      نقطة انطلاق ممتازة
                    </div>
                  )}
                </div>
                <ul
                  style={{
                    margin: '0 0 12px 0',
                    padding: '0 20px 0 0',
                    fontSize: 12,
                    color: 'var(--muted)',
                    lineHeight: 1.85,
                    textAlign: 'right'
                  }}
                >
                  {pkg.feats.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button type="button" className="btn bg" onClick={() => onSubscribe(pkg)}>
                  🛒 اشترك الآن
                </button>
              </div>
            );
          })}
        </div>

        <div
          className="card2"
          style={{
            textAlign: 'center',
            marginBottom: 14,
            border: '1px solid rgba(46, 204, 113, 0.22)',
            background: 'rgba(46, 204, 113, 0.06)'
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 6 }}>🔒</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', marginBottom: 4 }}>دفع آمن ومشفّر</div>
          <div className="psub" style={{ marginBottom: 0, fontSize: 12 }}>
            لا نخزّن بيانات بطاقتك على خوادمنا. المعاملة تتم عبر بوابة دفع معتمدة — تفعيل فوري بعد الإتمام.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" className="btn bv bsm" style={{ width: '100%' }} onClick={onTryFree}>
            🎁 جرّب مجاناً
          </button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn bgh bsm" style={{ flex: 1, minWidth: 120 }} onClick={onClose}>
              🏠 الرئيسية
            </button>
            <button type="button" className="btn bo bsm" style={{ flex: 1, minWidth: 120 }} onClick={handleNewGame}>
              🔄 لعبة جديدة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
