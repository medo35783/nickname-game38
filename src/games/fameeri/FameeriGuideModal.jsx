import { useState } from 'react';

export default function FameeriGuideModal({ onClose }) {
  const [guideRole, setGuideRole] = useState('player');

  return (
    <div className="mbg fameeri-theme" style={{ alignItems: 'flex-start', paddingTop: 16, overflowY: 'auto' }}>
      <div
        style={{
          background: 'var(--card)',
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          padding: 20,
          maxWidth: 430,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: 'Cairo', fontSize: 18, fontWeight: 900, color: 'var(--fameeri-primary)' }}>📖 دليل صيد القميري</div>
          <button type="button" className="btn bgh bxs" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="role-toggle" style={{ marginBottom: 16 }}>
          <button type="button" className={`role-btn ${guideRole === 'player' ? 'active' : ''}`} onClick={() => setGuideRole('player')}>
            🎮 عضو مجموعة
          </button>
          <button type="button" className={`role-btn ${guideRole === 'admin' ? 'active' : ''}`} onClick={() => setGuideRole('admin')}>
            👑 مشرف
          </button>
        </div>

        {guideRole === 'player' && (
          <>
            {[
              { n: 1, title: 'انضم للغرفة', desc: 'رمز 4 أرقام من المشرف + اسمك. ينتظرك في مجموعة حتى يعيّنك المشرف.' },
              { n: 2, title: 'التوزيع السري', desc: 'القائد 👑 يوزّع 100 قميري على 11 شجرة — لا أحد يرى توزيع مجموعتك.' },
              { n: 3, title: 'الهجوم', desc: 'القائد 👑 يختار مجموعة وشجرة وسلاحاً. الأعضاء يقترحون — القائد يقرر.' },
              { n: 4, title: 'الدرع 🛡️', desc: 'مرة واحدة بالمباراة — بعد إجابة «صح» للمهاجم، لديك 10 ثوانٍ لتفعيله على الشجرة المُستهدفة.' },
              { n: 5, title: 'النتائج', desc: 'بعد كل هجوم يكشف المشرف النتيجة للجميع. من يبقى له قميري أكثر يفوز.' },
            ].map((s) => (
              <div key={s.n} className="step-card" style={{ marginBottom: 9 }}>
                <div className="step-num">{s.n}</div>
                <div className="step-body">
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 4, marginBottom: 12, fontSize: 12, color: 'var(--fameeri-primary)', fontWeight: 700 }}>⚠️ تذكّر</div>
            {[
              ['🔒', 'توزيع مجموعتك سري — لا تكشفه للخصم'],
              ['👑', 'غير القائد ينتظر قرار قائده في الهجوم والتوزيع'],
              ['⚡', 'وضع السرعة: الجميع يطلب الهجوم والمشرف يختار الفائز'],
            ].map(([ic, tx], i) => (
              <div key={i} className="rule-row">
                {ic} <span>{tx}</span>
              </div>
            ))}
          </>
        )}

        {guideRole === 'admin' && (
          <>
            {[
              { n: 1, title: 'أنشئ الغرفة', desc: '«إنشاء غرفة كمسؤول» — شارك الرمز (4 أرقام).' },
              { n: 2, title: 'المجموعات', desc: 'أنشئ مجموعات (حتى 6)، عيّن قائداً 👑 لكل مجموعة، وزّع الأعضاء.' },
              { n: 3, title: 'التوزيع ثم اللعب', desc: '«بدء التوزيع» — بعد اكتمال الجميع «بدء اللعبة».' },
              { n: 4, title: 'أثناء اللعب', desc: 'تتابع أو تختار الفائز في السرعة، مؤقت الهجوم، وكشف النتائج.' },
            ].map((s) => (
              <div key={s.n} className="step-card" style={{ marginBottom: 9 }}>
                <div className="step-num">{s.n}</div>
                <div className="step-body">
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 4, marginBottom: 12, fontSize: 12, color: 'var(--fameeri-primary)', fontWeight: 700 }}>🎲 أوضاع اللعب</div>
            {[
              ['🔄', 'تتابعي — دور مجموعة تلو الأخرى'],
              ['⚡', 'سرعة — طلبات متعددة واختيارك للفائز'],
              ['🛡️', 'درع — مرة واحدة، يُفعّل خلال 10 ثوانٍ بعد إجابة «صح»'],
            ].map(([ic, tx], i) => (
              <div key={i} className="rule-row">
                {ic} <span>{tx}</span>
              </div>
            ))}
          </>
        )}

        <button type="button" className="btn bg" style={{ marginTop: 16 }} onClick={onClose}>
          ✅ فهمت!
        </button>
      </div>
    </div>
  );
}
