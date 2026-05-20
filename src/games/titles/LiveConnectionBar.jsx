/** شريط حالة الاتصال بالغرفة — يطمئن المتسابق أن التحديث تلقائي. */
export default function LiveConnectionBar({ connected, roomCode }) {
  if (!roomCode) return null;
  return (
    <div className={`live-bar${connected ? ' on' : ' off'}`} role="status" aria-live="polite">
      <span className={`live-dot${connected ? ' on' : ''}`} />
      {connected ? <span>متصل بالغرفة · التحديث تلقائي</span> : <span>جاري إعادة الاتصال…</span>}
    </div>
  );
}
