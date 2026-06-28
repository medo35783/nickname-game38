import HesbahTopNav from './HesbahTopNav';

export default function HesbahPendingJoinScreen({ roomCode, playerName, onBack }) {
  return (
    <div className="scr hesbah-theme hesbah-setup-screen">
      <div className="hesbah-sticky-chrome">
        <HesbahTopNav onBack={onBack} />
      </div>
      <div className="card hesbah-pending-join" style={{ textAlign: 'center', padding: '24px 16px' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⏳</div>
        <div className="ptitle" style={{ fontSize: 18 }}>
          بانتظار المشرف
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, margin: '12px 0' }}>
          طلب عودة باسم <strong>{playerName || '—'}</strong> إلى غرفة{' '}
          <strong className="room-code-inline">{roomCode}</strong>
          <br />
          المشرف يؤكد أنك أنت — لا تغلق الصفحة.
        </p>
        <div className="hesbah-pending-join__pulse" aria-hidden />
      </div>
    </div>
  );
}
