import { useMemo } from 'react';
import { fmtMs } from '../../../core/helpers';

/**
 * شريط الكابينة للمتسابق — نفس هيكل مشرف المسابقة:
 * شرائح علوية + بانر وقت كبير (+ شريط إعادة الجوال عند الحاجة).
 */
export default function TitlesPlayCockpitShell({
  roomCode,
  activeCount,
  roundNum,
  displayName,
  identityNicks,
  countdown,
  onOpenStats,
  onCopyCode,
  isKioskMode,
  onReturnToHost,
}) {
  const cdi = useMemo(() => {
    if (countdown === null) return { label: '—', urgent: false };
    if (countdown <= 0) return { label: 'انتهى الوقت!', urgent: true };
    return { label: fmtMs(countdown), urgent: countdown < 5 * 60 * 1000 };
  }, [countdown]);

  const nickLbl =
    identityNicks?.length > 0
      ? identityNicks.map((n) => `"${n}"`).join(' · ')
      : '—';

  return (
    <div className="play-cockpit">
      <div className="host-status-bar">
        <button
          type="button"
          className="host-stat-chip"
          onClick={onCopyCode}
          title="نسخ رمز الغرفة"
        >
          <span className="host-stat-ico">📡</span>
          <span className="host-stat-val">{roomCode}</span>
          <span className="host-stat-lbl">الرمز</span>
        </button>
        <div className="host-stat-chip">
          <span className="host-stat-ico">👥</span>
          <span className="host-stat-val">{activeCount}</span>
          <span className="host-stat-lbl">نشطون</span>
        </div>
        <div className="host-stat-chip play-id-chip">
          <span className="host-stat-ico">👤</span>
          <span className="host-stat-val">{displayName || '—'}</span>
          <span className="host-stat-lbl play-id-nick">{nickLbl}</span>
        </div>
        <div className="host-stat-chip">
          <span className="host-stat-ico">🎯</span>
          <span className="host-stat-val">{roundNum || '—'}</span>
          <span className="host-stat-lbl">الجولة</span>
        </div>
        <button
          type="button"
          className="host-stat-chip"
          onClick={onOpenStats}
          title="إحصائيات الجولات"
        >
          <span className="host-stat-ico">📊</span>
          <span className="host-stat-val" style={{ fontSize: 11 }}>
            إحصاء
          </span>
          <span className="host-stat-lbl">السجل</span>
        </button>
      </div>

      <div className={`host-crown-banner play-timer-banner${cdi.urgent ? ' urg' : ''}`}>
        <div className={`play-timer-val${cdi.urgent ? ' urg' : ''}`}>
          {cdi.urgent && countdown > 0 ? '🔴 ' : '⏱️ '}
          {cdi.label}
        </div>
        <div className="host-crown-sub">متبقي للجولة {roundNum || '—'}</div>
      </div>

      {isKioskMode && (
        <div className="play-kiosk-bar">
          <span className="play-kiosk-lbl">📱 جوال المشرف — العب ثم أعد الجوال للمشرف</span>
          <button type="button" className="btn bg bxs play-kiosk-return" onClick={onReturnToHost}>
            👑 للمشرف
          </button>
        </div>
      )}
    </div>
  );
}
