/**
 * مؤشرات صحة المنصة — شريط بصري
 */
export default function AdminHealthKpi({
  healthStatus,
  openCount,
  orphanCount,
  endedCount,
  security24h,
  maintenanceMode,
  rtdbLabel,
  roomTotal,
  maxPlayersPerRoom,
}) {
  const items = [
    {
      key: 'platform',
      icon: healthStatus.tone === 'ok' ? '🟢' : healthStatus.tone === 'caution' ? '🟡' : '🔴',
      label: 'المنصة',
      value: healthStatus.label,
      tone: healthStatus.tone,
    },
    {
      key: 'open',
      icon: openCount > 0 ? '🟡' : '🟢',
      label: 'غرف مفتوحة',
      value: openCount,
      tone: openCount > 0 ? 'caution' : 'ok',
    },
    {
      key: 'orphan',
      icon: orphanCount > 0 ? '🔴' : '🟢',
      label: 'يتيمة (اشتراك)',
      value: orphanCount,
      tone: orphanCount > 0 ? 'warn' : 'ok',
    },
    {
      key: 'security',
      icon: security24h >= 5 ? '🔴' : security24h > 0 ? '🟡' : '🟢',
      label: 'أمان (24س)',
      value: security24h,
      tone: security24h >= 5 ? 'warn' : security24h > 0 ? 'caution' : 'ok',
    },
    {
      key: 'maintenance',
      icon: maintenanceMode ? '🛠️' : '⚙️',
      label: 'الصيانة',
      value: maintenanceMode ? 'مفعّلة' : 'معطّلة',
      tone: maintenanceMode ? 'warn' : 'ok',
    },
    {
      key: 'rtdb',
      icon: '📊',
      label: 'بيانات الغرف',
      value: rtdbLabel,
      sub: `${roomTotal} غرفة`,
      tone: 'neutral',
    },
    {
      key: 'players',
      icon: '👥',
      label: 'حد اللاعبين',
      value: maxPlayersPerRoom > 0 ? maxPlayersPerRoom : '∞',
      tone: 'neutral',
    },
  ];

  return (
    <div className="admin-health-kpi" role="list">
      {items.map((item) => (
        <div
          key={item.key}
          role="listitem"
          className={`admin-health-kpi__cell admin-health-kpi__cell--${item.tone}`}
        >
          <span className="admin-health-kpi__icon" aria-hidden>
            {item.icon}
          </span>
          <div className="admin-health-kpi__lbl">{item.label}</div>
          <div className="admin-health-kpi__val">{item.value}</div>
          {item.sub ? <div className="admin-health-kpi__sub">{item.sub}</div> : null}
        </div>
      ))}
      {endedCount > 0 ? (
        <div className="admin-health-kpi__foot">🧹 {endedCount} غرفة منتهية يمكن تنظيفها</div>
      ) : null}
    </div>
  );
}
