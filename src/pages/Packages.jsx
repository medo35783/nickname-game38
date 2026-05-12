import { SUPPORT_EMAIL } from '../core/constants';

const PLANS = [
  { cls: 'plan-super', badge: { bg: 'var(--purple)', c: '#fff', label: '⭐ الأشهر' }, name: 'سوبر 🚀', nameColor: 'var(--purple)', feats: '✦ لاعبون غير محدودون\n✦ جلسات متزامنة متعددة\n✦ تقارير تفصيلية كاملة\n✦ دعم أولوية 24/7\n✦ جميع مميزات الذهبي والفضي' },
  { cls: 'plan-gold', badge: { bg: 'var(--gold)', c: '#07070f', label: '🏆 ذهبي' }, name: 'ذهبي ✨', nameColor: 'var(--gold)', feats: '✦ حتى 50 لاعب\n✦ إحصائيات متقدمة\n✦ سجل تاريخ الجلسات\n✦ ألقاب وأيقونات مخصصة' },
  { cls: 'plan-silver', badge: { bg: 'rgba(200,200,220,.4)', c: 'var(--text)', label: '🥈 فضي' }, name: 'فضي', nameColor: 'rgba(210,210,230,.9)', feats: '✦ حتى 20 لاعب\n✦ إحصائيات أساسية\n✦ غرفة واحدة نشطة' },
];

export default function Packages() {
  return (
    <div className="scr">
      <div className="ptitle">💎 باقات الاشتراك</div>
      <div className="psub">اشتراك شهري أو سنوي — الأسعار تُعلن قريباً</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>{['شهري', 'سنوي (وفّر 20%)'].map((t, i) => <button key={t} className={`btn ${i === 1 ? 'bo' : 'bgh'}`} style={{ flex: 1 }}>{t}</button>)}</div>
      {PLANS.map((p, i) => (
        <div key={i} className={`plan-card ${p.cls}`}>
          <div className="plan-badge" style={{ background: p.badge.bg, color: p.badge.c }}>{p.badge.label}</div>
          <div className="plan-name" style={{ color: p.nameColor }}>{p.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 6px' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>السعر:</span>
            <span style={{ background: 'rgba(255,255,255,.08)', color: 'var(--muted)', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>يُعلن قريباً</span>
          </div>
          <div className="plan-feat">{p.feats.split('\n').map((f, j) => <div key={j}>{f}</div>)}</div>
        </div>
      ))}
      <div className="card" style={{ textAlign: 'center', padding: '14px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🎉 سجّل اهتمامك الآن</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>كن أول من يعرف عند إطلاق الأسعار</div>
        <button className="btn bg bsm" style={{ width: 'auto', margin: '0 auto' }} onClick={() => window.open(`mailto:${SUPPORT_EMAIL}?subject=أريد الاشتراك — لعبة الألقاب&body=أرجو إشعاري عند إطلاق الباقات`)}>📧 أبلغني عند الإطلاق</button>
      </div>
    </div>
  );
}
