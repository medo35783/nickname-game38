import { useEffect, useState } from 'react';
import { shareArenaVictoryImage, downloadArenaVictoryImage } from '../../core/arenaVictoryShare';
import {
  SUBSCRIPTION_PACKAGES,
  SUBSCRIPTION_FEATURES,
  getEffectivePrice,
  hasActivePromo,
  promoDiscountPercent,
  savingsPercent
} from '../../core/subscriptionPackages';
import { arenaPointsForRank } from '../../core/arena.constants';
import ArenaSignupPrompt from '../../shared/ArenaSignupPrompt';
import PackagePlanBadges, { badgesForPackage } from './PackagePlanBadges';

/**
 * شاشة بعد انتهاء اللعبة للمتسابقين غير المشتركين — دعوة للاشتراك والباقات.
 *
 * @typedef {{ rank?: number; hits?: number; accuracy?: number; time?: string | number }} PlayerStats
 * @typedef {import('../../core/subscriptionPackages').SubscriptionPackage} SubscriptionPackage
 *
 * @param {object} props
 * @param {string} props.winner
 * @param {PlayerStats} [props.playerStats]
 * @param {() => void} props.onClose
 * @param {(pkg: SubscriptionPackage) => void} props.onSubscribe
 * @param {() => void} props.onTryFree
 * @param {() => void} [props.onNewGame] — إن لم يُمرَّر، يُستدعى `onClose` عند «لعبة جديدة»
 * @param {() => void} [props.onContribute] — فتح بنك الأسئلة
 * @param {() => void} [props.onArenaSignup] — فتح حسابي للتسجيل
 * @param {boolean} [props.isGuest] — ضيف (عرض نقاط معلّقة)
 * @param {number} [props.arenaReward] — نقاط أُضيفت للمسجّل
 * @param {object} [props.arenaShare] — بيانات بطاقة المجد
 * @param {(text: string, type?: string) => void} [props.notify]
 */

const SUB_FEATURES = SUBSCRIPTION_FEATURES;
const PACKAGES = SUBSCRIPTION_PACKAGES;

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

export default function EndGameJoinPrompt({
  winner,
  playerStats,
  onClose,
  onSubscribe,
  onTryFree,
  onNewGame,
  onContribute,
  onArenaSignup,
  isGuest = false,
  arenaReward = 0,
  arenaShare = null,
  notify,
}) {
  const [shareBusy, setShareBusy] = useState(false);
  const handleNewGame = onNewGame ?? onClose;
  const pendingArenaPoints =
    isGuest && playerStats?.rank != null ? arenaPointsForRank(playerStats.rank) : 0;

  const handleShareArena = async (preferShare = true) => {
    if (!arenaShare || shareBusy) return;
    setShareBusy(true);
    try {
      const fn = preferShare ? shareArenaVictoryImage : downloadArenaVictoryImage;
      const mode = await fn(arenaShare);
      notify?.(mode === 'share' ? '✅ تم فتح المشاركة' : '📥 تم حفظ بطاقة المجد', 'success');
    } catch {
      notify?.('تعذّر إنشاء البطاقة', 'error');
    } finally {
      setShareBusy(false);
    }
  };

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

        {arenaReward > 0 ? (
          <div
            className="card"
            style={{
              marginBottom: 12,
              textAlign: 'center',
              background: 'linear-gradient(145deg, rgba(240,192,64,.12), rgba(15,15,34,.95))',
              borderColor: 'rgba(240,192,64,.35)',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 4 }}>🏟️</div>
            <div style={{ fontFamily: "'Cairo', sans-serif", fontSize: 16, fontWeight: 900, color: 'var(--gold)' }}>
              +{arenaReward} نقطة ساحة
            </div>
            <div className="psub" style={{ marginTop: 6, marginBottom: 0, fontSize: 12 }}>
              أُضيفت لشارتك — تظهر في قاعة المجد
            </div>
            {arenaShare ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn bg bsm"
                  style={{ flex: 1, minWidth: 120 }}
                  disabled={shareBusy}
                  onClick={() => void handleShareArena(true)}
                >
                  {shareBusy ? '⏳…' : '📤 شارك بطاقة مجدك'}
                </button>
                <button
                  type="button"
                  className="btn bgh bsm"
                  style={{ flex: 1, minWidth: 100 }}
                  disabled={shareBusy}
                  onClick={() => void handleShareArena(false)}
                >
                  💾 حفظ
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {!isGuest && arenaShare && arenaReward <= 0 && playerStats?.rank != null ? (
          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="btn bo bsm"
              style={{ width: '100%' }}
              disabled={shareBusy}
              onClick={() => void handleShareArena(true)}
            >
              {shareBusy ? '⏳…' : '📤 شارك بطاقة مجدك'}
            </button>
          </div>
        ) : null}

        {isGuest && typeof onArenaSignup === 'function' ? (
          <div style={{ marginBottom: 12 }}>
            <ArenaSignupPrompt
              variant="compact"
              pendingPoints={pendingArenaPoints}
              localQuestionCount={0}
              onSignup={onArenaSignup}
              onDismiss={onClose}
              dismissLabel="لاحقاً"
              title="ثبّت مجدك في الساحة"
            />
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
            const promo = hasActivePromo(pkg);
            const effective = getEffectivePrice(pkg);
            const save = savingsPercent(pkg.days, effective);
            const promoPct = promoDiscountPercent(pkg);
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
                <PackagePlanBadges badges={badgesForPackage(pkg)} />
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 40, lineHeight: 1, display: 'block' }}>{pkg.icon}</span>
                  <div className="plan-name" style={{ marginTop: 6 }}>
                    {pkg.durationLabel}
                  </div>
                  <div className="pkg-price-row" style={{ marginTop: 4 }}>
                    {promo && (
                      <>
                        <span className="pkg-price-original">{pkg.price}</span>
                        {promoPct != null && (
                          <span className="pkg-promo-badge">-{promoPct}%</span>
                        )}
                      </>
                    )}
                    <span className="pkg-price-num" style={{ fontSize: 28 }}>{effective}</span>
                    <span className="pkg-price-currency">ريال</span>
                  </div>
                  {promo && <div className="pkg-promo-note">عرض مؤقت</div>}
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

        {onContribute ? (
          <button
            type="button"
            className="btn bgh"
            style={{ width: '100%', marginBottom: 12, fontSize: 12 }}
            onClick={onContribute}
          >
            📋 اقترح سؤالاً لبنك الأسئلة
          </button>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" className="btn bg" style={{ width: '100%' }} onClick={onTryFree}>
            📝 إنشاء حساب — كن مشرفاً
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
