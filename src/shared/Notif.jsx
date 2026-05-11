export default function Notif({ msg }) {
  if (!msg) return null;
  const c = { success: 'ns', error: 'ne', info: 'ni', gold: 'ng' };
  return <div className={`notif ${c[msg.type] || 'ni'}`}>{msg.text}</div>;
}
