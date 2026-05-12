import { useState } from 'react';
import { SUPPORT_EMAIL } from '../core/constants';

const COMMUNITY_SUGGESTIONS = [
  { id: 1, cat: 'تصميم', text: 'وضع داكن أكثر', date: '2025-03-10' },
  { id: 2, cat: 'لعبة', text: 'مؤقت صوتي عند النهاية', date: '2025-03-12' },
];

export default function Suggestions({ notify }) {
  const [suggForm, setSuggForm] = useState({ cat: 'لعبة', text: '' });

  return (
    <div className="scr">
      <div className="ptitle">💡 الاقتراحات</div>
      <div className="psub">شاركنا أفكارك — يُفتح تطبيق البريد تلقائياً</div>
      <div className="card">
        <div className="ctitle">📩 إرسال اقتراح</div>
        <div className="ig"><label className="lbl">التصنيف</label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {['لعبة', 'تصميم', 'إحصائيات', 'أسعار', 'أخرى'].map(c => (
              <button key={c} className={`btn bsm ${suggForm.cat === c ? 'bg' : 'bgh'}`} style={{ width: 'auto' }} onClick={() => setSuggForm(f => ({ ...f, cat: c }))}>{c}</button>
            ))}
          </div>
        </div>
        <div className="ig"><label className="lbl">اكتب اقتراحك</label>
          <textarea className="inp" placeholder="اقتراحك هنا..." value={suggForm.text} onChange={e => setSuggForm(f => ({ ...f, text: e.target.value }))} />
        </div>
        <button className="btn bg" onClick={() => {
          if (!suggForm.text.trim()) { notify('اكتب اقتراحك أولاً', 'error'); return; }
          const sub = encodeURIComponent(`اقتراح [${suggForm.cat}] — لعبة الألقاب`);
          const bod = encodeURIComponent(`التصنيف: ${suggForm.cat}\n\nالاقتراح:\n${suggForm.text}`);
          window.open(`mailto:${SUPPORT_EMAIL}?subject=${sub}&body=${bod}`);
          setSuggForm(f => ({ ...f, text: '' })); notify('✅ سيُفتح تطبيق البريد', 'success');
        }}>📤 فتح البريد للإرسال</button>
        <div style={{ marginTop: 10, padding: '9px 12px', background: 'rgba(79,163,224,.07)', border: '1px solid rgba(79,163,224,.2)', borderRadius: 8, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          إلى: <strong style={{ color: 'var(--blue)' }}>{SUPPORT_EMAIL}</strong>
        </div>
      </div>
      <div className="div">اقتراحات من المجتمع</div>
      {COMMUNITY_SUGGESTIONS.map(s => <div key={s.id} className="sugg-item"><div className="sugg-cat">{s.cat}</div><div className="sugg-text">{s.text}</div><div className="sugg-date">{s.date}</div></div>)}
    </div>
  );
}
