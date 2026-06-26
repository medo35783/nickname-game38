import { useEffect, useState } from 'react';
import { PLATFORM_NAME, SUPPORT_EMAIL } from '../core/constants';
import { auth } from '../firebase';
import { submitPlatformFeedback } from '../core/platformFeedback';
import ArenaHallOfFame from '../shared/ArenaHallOfFame';
import KnowledgeBankSpotlight from '../shared/KnowledgeBankSpotlight';
import GameTopNav from '../shared/GameTopNav';
import VoiceFeedStrip from '../components/voice/VoiceFeedStrip';
import '../styles/voice-hub.css';
import '../styles/knowledge-chest.css';
import '../styles/arena-badge.css';

const CONTACT_TYPES = {
  suggest: {
    icon: '✨',
    label: 'اقتراح',
    emailSubject: `اقتراح — ${PLATFORM_NAME}`,
    cats: ['لعبة', 'تصميم', 'إحصائيات', 'أسعار', 'أخرى'],
  },
  bug: {
    icon: '🔧',
    label: 'بلاغ مشكلة',
    emailSubject: `مشكلة — ${PLATFORM_NAME}`,
    cats: ['الألقاب', 'القميري', 'حَسْبة', 'تسجيل دخول', 'أخرى'],
  },
  ask: {
    icon: '💬',
    label: 'استفسار',
    emailSubject: `استفسار — ${PLATFORM_NAME}`,
    cats: ['عام', 'الأسعار', 'طريقة اللعب', 'أخرى'],
  },
};

const CONTACT = [
  { id: 'suggest', glyph: '✨', title: 'اقتراح', sub: 'فكرة أو تحسين', variant: 'violet' },
  { id: 'bug', glyph: '🔧', title: 'بلاغ', sub: 'مشكلة تقنية', variant: 'rose' },
  { id: 'ask', glyph: '💬', title: 'استفسار', sub: 'سؤال أو مساعدة', variant: 'cyan' },
];

/**
 * صوتك — بوابة المجتمع
 */
export default function VoicePage({
  notify,
  onOpenContribute,
  onGoAccount,
  onBack,
  isGuest = true,
  bankTotal = null,
  initialPortal = null,
  communitySuggestions = [],
}) {
  const [activePortal, setActivePortal] = useState(initialPortal || null);
  const [contactType, setContactType] = useState('suggest');
  const [form, setForm] = useState({ cat: CONTACT_TYPES.suggest.cats[0], text: '' });

  useEffect(() => {
    if (initialPortal) setActivePortal(initialPortal);
  }, [initialPortal]);

  const openContact = (id) => {
    setContactType(id);
    setForm((f) => ({ ...f, cat: CONTACT_TYPES[id].cats[0] }));
    setActivePortal((prev) => (prev === id ? null : id));
  };

  const cfg = CONTACT_TYPES[contactType];

  const sendMail = async () => {
    if (!form.text.trim()) {
      notify?.('اكتب رسالتك أولاً', 'error');
      return;
    }

    const user = auth.currentUser;
    if (user && !user.isAnonymous) {
      try {
        await submitPlatformFeedback({
          type: contactType,
          category: form.cat,
          text: form.text,
          uid: user.uid,
          email: user.email,
        });
        setForm((f) => ({ ...f, text: '' }));
        notify?.('✅ وصلنا رسالتك — شكراً!', 'success');
        return;
      } catch {
        notify?.('تعذّر الإرسال المباشر — جاري فتح البريد…', 'error');
      }
    }

    const sub = encodeURIComponent(cfg.emailSubject);
    const bod = encodeURIComponent(`النوع: ${cfg.label}\nالتصنيف: ${form.cat}\n\n${form.text}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${sub}&body=${bod}`;
    setForm((f) => ({ ...f, text: '' }));
    notify?.('✅ جاري فتح البريد…', 'success');
  };

  return (
    <div className="scr voice-hub">
      {onBack ? <GameTopNav onBack={onBack} variant="arena" /> : null}
      <header className="voice-hub__hero">
        <div className="voice-hub__orbs" aria-hidden>
          <span className="voice-hub__orb voice-hub__orb--1" />
          <span className="voice-hub__orb voice-hub__orb--2" />
          <span className="voice-hub__orb voice-hub__orb--3" />
        </div>
        <div className="voice-hub__icon">💬</div>
        <h1 className="voice-hub__title">
          <span>صوتك</span>
        </h1>
        <p className="voice-hub__sub">
          هنا تُسمع أفكارك وتُحفظ مساهماتك
        </p>
        <p className="voice-hub__sub voice-hub__sub--detail">
          شارك سؤالاً في بنك المعرفة، قدّم اقتراحك أو استفسارك، وتابع من يتصدّر{' '}
          <strong>قاعة المجد</strong> كل أسبوع
        </p>
      </header>

      <section className="voice-section" aria-label="الأبرز">
        <div className="voice-section__label">الأبرز</div>
        <div className="voice-spotlight">
          <button
            type="button"
            className={`voice-spotlight__card voice-spotlight__card--hof${activePortal === 'hof' ? ' voice-spotlight__card--active' : ''}`}
            onClick={() => setActivePortal((p) => (p === 'hof' ? null : 'hof'))}
          >
            <span className="voice-spotlight__glow voice-spotlight__glow--spin" aria-hidden />
            <span className="voice-spotlight__glyph voice-spotlight__trophy" aria-hidden>
              🏆
            </span>
            <span className="voice-spotlight__title">قاعة المجد</span>
            <span className="voice-spotlight__sub">أبطال الأسبوع</span>
            <span className="voice-spotlight__cta">عرض المتصدرين</span>
          </button>

          <KnowledgeBankSpotlight
            onClick={() => onOpenContribute?.()}
            bankTotal={bankTotal}
            className="kb-spotlight--cell"
          />
        </div>
      </section>

      {activePortal === 'hof' ? (
        <section className="voice-panel">
          <div className="voice-panel__head">
            <span className="voice-panel__title">🏆 قاعة المجد</span>
            <button
              type="button"
              className="voice-panel__close"
              aria-label="إغلاق"
              onClick={() => setActivePortal(null)}
            >
              ✕
            </button>
          </div>
          <ArenaHallOfFame onGoAccount={onGoAccount} isGuest={isGuest} />
        </section>
      ) : null}

      <section className="voice-section voice-section--community" aria-label="المجتمع">
        <div className="voice-section__label">المجتمع</div>
        <p className="voice-section__hint">تواصل معنا — اختر نوع رسالتك</p>

        <div className="voice-bento voice-bento--contact">
          {CONTACT.map((p) => (
            <button
              key={p.id}
              type="button"
              className={[
                'voice-portal',
                'voice-portal--compact',
                `voice-portal--${p.variant}`,
                activePortal === p.id ? 'voice-portal--active' : '',
              ].join(' ')}
              onClick={() => openContact(p.id)}
            >
              <span className="voice-portal__glyph">{p.glyph}</span>
              <span className="voice-portal__body">
                <span className="voice-portal__title">{p.title}</span>
                <span className="voice-portal__sub">{p.sub}</span>
              </span>
            </button>
          ))}
        </div>

        {activePortal && CONTACT_TYPES[activePortal] ? (
          <section className="voice-panel voice-panel--nested">
            <div className="voice-panel__head">
              <span className="voice-panel__title">
                {CONTACT_TYPES[activePortal].icon} {CONTACT_TYPES[activePortal].label}
              </span>
              <button
                type="button"
                className="voice-panel__close"
                aria-label="إغلاق"
                onClick={() => setActivePortal(null)}
              >
                ✕
              </button>
            </div>
            <div className="voice-form-cats">
              {cfg.cats.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`voice-chip${form.cat === c ? ' voice-chip--on' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, cat: c }))}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="voice-form-field">
              <label className="lbl" htmlFor="voice-msg">
                رسالتك
              </label>
              <textarea
                id="voice-msg"
                rows={4}
                placeholder="اكتب هنا…"
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              />
            </div>
            <button type="button" className="voice-form-submit" onClick={sendMail}>
              📤 إرسال عبر البريد
            </button>
          </section>
        ) : null}
      </section>

      <VoiceFeedStrip communitySuggestions={communitySuggestions} />
    </div>
  );
}
