import { SUPPORT_EMAIL } from '../core/constants';

export default function Home({ setSelectedGame }) {
  return (
    <div className="scr">
      <div style={{ textAlign: 'center', padding: '18px 0 14px' }}>
        <div style={{ fontSize: 42, marginBottom: 6 }}>🏟️</div>
        <div className="ptitle" style={{ fontSize: 24 }}>ساحة الألعاب</div>
        <div className="psub">ألعاب جماعية تفاعلية للرحلات والاجتماعات والمناسبات</div>
      </div>

      {/* بطاقة لعبة الألقاب */}
      <div onClick={() => setSelectedGame('nicknames')} style={{ background: 'linear-gradient(135deg,rgba(240,192,64,.12),rgba(255,140,0,.06))', border: '2px solid rgba(240,192,64,.3)', borderRadius: 16, padding: '18px 16px', marginBottom: 12, cursor: 'pointer', transition: 'all .2s' }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(.98)'; }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 44 }}>🎭</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Cairo', fontSize: 18, fontWeight: 900, color: 'var(--gold)' }}>لعبة الألقاب</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.6 }}>أخفِ هويتك واكشف الآخرين قبل أن يكشفوك</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {['6-50 لاعب', 'متعدد الجولات', 'إثارة وتشويق'].map(t => (
                <span key={t} className="tag tg" style={{ fontSize: 10 }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 20, color: 'var(--gold)' }}>←</div>
        </div>
      </div>

      {/* بطاقة لعبة القميري */}
      <div onClick={() => setSelectedGame('qumairi')} style={{ background: 'linear-gradient(135deg,rgba(46,204,113,.1),rgba(26,138,80,.05))', border: '2px solid rgba(46,204,113,.25)', borderRadius: 16, padding: '18px 16px', marginBottom: 12, cursor: 'pointer', transition: 'all .2s' }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(.98)'; }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 44 }}>🦅</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Cairo', fontSize: 18, fontWeight: 900, color: 'var(--green)' }}>صيد القميري</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.6 }}>وزّع القميري على الأشجار واهجم مجموعات الخصوم</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {['2-6 مجموعات', '100 قميري', 'استراتيجية'].map(t => (
                <span key={t} className="tag tv" style={{ fontSize: 10 }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ fontSize: 20, color: 'var(--green)' }}>←</div>
          </div>
        </div>
      </div>

      {/* قريباً — ألعاب أخرى */}
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px dashed rgba(255,255,255,.1)', borderRadius: 16, padding: '16px', marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>🎲</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>المزيد من الألعاب قادمة!</div>
        <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>ترقبوا ألعاب جماعية جديدة ومثيرة</div>
      </div>

      <button className="btn bgh" style={{ marginTop: 4, fontSize: 12 }} onClick={() => window.open(`mailto:${SUPPORT_EMAIL}?subject=اقتراح لعبة جديدة`)}>
        💡 اقترح لعبة جديدة
      </button>
    </div>
  );
}
