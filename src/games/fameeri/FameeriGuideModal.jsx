import { useState } from 'react';
import GameGuideModalShell from '../../shared/GameGuideModalShell';
import FameeriWeaponChips from './FameeriWeaponChips';

export default function FameeriGuideModal({ onClose }) {
  const [guideRole, setGuideRole] = useState('player');

  return (
    <GameGuideModalShell
      title="📖 دليل لعبة القميري"
      titleId="fameeri-guide-title"
      onClose={onClose}
      game="fameeri"
      accentVar="--fameeri-primary"
    >
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
            { n: 3, title: 'الهجوم والصيد', desc: 'القائد يختار مجموعة وشجرة وسلاحاً. السؤال يطابق صعوبة السلاح — إجابة «صح» تُخصم قمريات من شجرة الخصم حسب السلاح.' },
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

          <div style={{ marginTop: 4, marginBottom: 8, fontSize: 12, color: 'var(--fameeri-primary)', fontWeight: 700 }}>
            ⚔️ استخدامات كل سلاح
          </div>
          <FameeriWeaponChips variant="stock" className="mb2" />
          <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--muted)', lineHeight: 1.65 }}>
            إذا أصبت — يُخصم من شجرة الخصم (حسب السلاح):
          </div>
          <FameeriWeaponChips variant="hunt" className="mb2" />

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

          <div style={{ marginTop: 4, marginBottom: 8, fontSize: 12, color: 'var(--fameeri-primary)', fontWeight: 700 }}>
            ⚔️ الأسلحة والصيد
          </div>
          <FameeriWeaponChips variant="stock" className="mb2" />
          <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--muted)', lineHeight: 1.65 }}>
            إذا أصبت — يُخصم من شجرة الخصم (حسب السلاح):
          </div>
          <FameeriWeaponChips variant="hunt" className="mb2" />

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
    </GameGuideModalShell>
  );
}
