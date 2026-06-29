import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { db, ref, onValue, update, remove } from '../../core/firebaseHelpers';
import {
  collectOpenRooms,
  collectStuckRooms,
  collectEndedRooms,
  countRoomRoots,
  isLegacyRoomCode,
  purgeRoomList,
  estimateRtdbFootprint,
  deriveHealthStatus,
} from '../../core/adminHealthHelpers';
import { ROOM_CODE_LEN } from '../../core/roomCode';
import {
  subscribePlatformSettings,
  setMaintenanceMode,
  updatePlatformSettings,
} from '../../core/platformSettings';
import { useSecurityEvents } from '../../hooks/useSecurityEvents';
import AdminHealthKpi from './AdminHealthKpi';
import AdminCollapsibleSection from './AdminCollapsibleSection';
import AdminSecurityEvents from './AdminSecurityEvents';
import AdminHealthRoomRow from './AdminHealthRoomRow';

/**
 * لوحة الصحة — KPI بصري · أقسام قابلة للطي · تصدير أمان
 */
export default function AdminHealthPanel({ notify }) {
  const [roomSnaps, setRoomSnaps] = useState({ rooms: {}, qrooms: {}, srooms: {} });
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(null);
  const [maintMsg, setMaintMsg] = useState('');
  const [maxPlayersInput, setMaxPlayersInput] = useState(0);

  const { stats: securityStats } = useSecurityEvents(notify);

  useEffect(() => {
    let alive = true;
    const unsubs = [];

    const authUnsub = onAuthStateChanged(auth, (user) => {
      unsubs.forEach((fn) => fn());
      unsubs.length = 0;
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      ['rooms', 'qrooms', 'srooms'].forEach((rootKey) => {
        const r = ref(db, rootKey);
        const handler = (snap) => {
          if (!alive) return;
          setRoomSnaps((prev) => ({ ...prev, [rootKey]: snap.val() || {} }));
          setLoading(false);
        };
        unsubs.push(onValue(r, handler));
      });
    });

    const settingsUnsub = subscribePlatformSettings((val) => {
      if (!alive) return;
      setSettings(val);
      setMaintMsg(val.maintenanceMessage || '');
      setMaxPlayersInput(Number(val.maxPlayersPerRoom) || 0);
    });
    unsubs.push(settingsUnsub);

    return () => {
      alive = false;
      authUnsub();
      unsubs.forEach((fn) => fn());
    };
  }, []);

  const openRooms = useMemo(() => collectOpenRooms(roomSnaps), [roomSnaps]);
  const stuckRooms = useMemo(() => collectStuckRooms(roomSnaps), [roomSnaps]);
  const endedRooms = useMemo(() => collectEndedRooms(roomSnaps), [roomSnaps]);
  const rootCounts = useMemo(() => countRoomRoots(roomSnaps), [roomSnaps]);
  const rtdbFootprint = useMemo(() => estimateRtdbFootprint(roomSnaps), [roomSnaps]);

  const healthStatus = useMemo(
    () =>
      deriveHealthStatus({
        maintenanceMode: settings?.maintenanceMode,
        stuckCount: stuckRooms.length,
        security24h: securityStats.last24h,
      }),
    [settings?.maintenanceMode, stuckRooms.length, securityStats.last24h]
  );

  const legacyStuckCount = useMemo(
    () => stuckRooms.filter((room) => room.legacyCode).length,
    [stuckRooms]
  );

  const deleteAllOpen = useCallback(async () => {
    if (!openRooms.length) return;
    if (
      !window.confirm(
        `حذف ${openRooms.length} غرفة مفتوحة نهائياً من Firebase؟\n\nاستخدم «إنهاء» إن أردت إغلاق المسابقة مع الإبقاء على السجل.`
      )
    ) {
      return;
    }
    setBulkBusy('open');
    try {
      const { deleted, failed } = await purgeRoomList(openRooms);
      if (failed) {
        notify?.(`تم حذف ${deleted} — فشل ${failed}`, 'error');
      } else {
        notify?.(`تم حذف ${deleted} غرفة`, 'success');
      }
    } catch {
      notify?.('تعذّر الحذف الجماعي', 'error');
    } finally {
      setBulkBusy(null);
    }
  }, [notify, openRooms]);

  const roomActionError = useCallback((action, room, err) => {
    if (isLegacyRoomCode(room.roomCode)) {
      return `تعذّر ${action}: رمز الغرفة ${room.roomCode} قديم (ليس ${ROOM_CODE_LEN} أرقام). انشر قواعد Firebase المحدّثة ثم أعد المحاولة، أو احذفها من Firebase Console.`;
    }
    const denied = `${err?.code || ''} ${err?.message || ''}`.toLowerCase().includes('permission');
    if (denied) {
      return `تعذّر ${action}: صلاحيات Firebase. تأكد أن حسابك في عقدة admins وانشر firebase-database-rules.json.`;
    }
    return `تعذّر ${action}. تحقق من الاتصال ثم أعد المحاولة.`;
  }, []);

  const endRoom = useCallback(
    async (room) => {
      if (!window.confirm(`إنهاء الغرفة ${room.roomCode} (${room.gameLabel})؟`)) return;
      setBusyId(room.id);
      try {
        await update(ref(db, `${room.root}/${room.roomCode}/game`), {
          phase: 'ended',
          sessionEnd: Date.now(),
          endedByAdmin: true,
        });
        notify?.('تم إنهاء الغرفة', 'success');
      } catch (err) {
        notify?.(roomActionError('إنهاء الغرفة', room, err), 'error');
      } finally {
        setBusyId(null);
      }
    },
    [notify, roomActionError]
  );

  const deleteRoom = useCallback(
    async (room) => {
      if (!window.confirm(`حذف الغرفة ${room.roomCode} نهائياً من Firebase؟`)) return;
      setBusyId(room.id);
      try {
        await remove(ref(db, `${room.root}/${room.roomCode}`));
        notify?.('تم حذف الغرفة', 'success');
      } catch (err) {
        notify?.(roomActionError('حذف الغرفة', room, err), 'error');
      } finally {
        setBusyId(null);
      }
    },
    [notify, roomActionError]
  );

  const deleteAllStuck = useCallback(async () => {
    if (!stuckRooms.length) return;
    if (
      !window.confirm(
        `حذف ${stuckRooms.length} غرفة (اشتراكها منتهٍ) نهائياً من Firebase؟\n\nلن يُغلق أي مسابقة جارية — هذا للغرف اليتيمة فقط.`
      )
    ) {
      return;
    }
    setBulkBusy('stuck');
    try {
      const { deleted, failed } = await purgeRoomList(stuckRooms);
      if (failed) {
        notify?.(`تم حذف ${deleted} غرفة — فشل ${failed}. انشر قواعد Firebase إن لم تُنشر بعد.`, 'error');
      } else {
        notify?.(`تم حذف ${deleted} غرفة`, 'success');
      }
    } catch {
      notify?.('تعذّر حذف الغرف دفعة واحدة', 'error');
    } finally {
      setBulkBusy(null);
    }
  }, [notify, stuckRooms]);

  const deleteAllEnded = useCallback(async () => {
    if (!endedRooms.length) return;
    if (!window.confirm(`حذف ${endedRooms.length} غرفة منتهية من Firebase؟`)) return;
    setBulkBusy('ended');
    try {
      const { deleted, failed } = await purgeRoomList(endedRooms);
      if (failed) {
        notify?.(`تم حذف ${deleted} — فشل ${failed}`, 'error');
      } else {
        notify?.(`تم حذف ${deleted} غرفة منتهية`, 'success');
      }
    } catch {
      notify?.('تعذّر حذف الغرف المنتهية', 'error');
    } finally {
      setBulkBusy(null);
    }
  }, [notify, endedRooms]);

  const toggleMaintenance = async () => {
    const next = !settings?.maintenanceMode;
    try {
      await setMaintenanceMode(next, maintMsg);
      notify?.(next ? '🛠️ وضع الصيانة مفعّل' : '✅ المنصة متاحة', 'success');
    } catch {
      notify?.('تعذّر تحديث الإعدادات', 'error');
    }
  };

  const saveSettings = async () => {
    const maxPlayers = Math.min(500, Math.max(0, Math.floor(Number(maxPlayersInput) || 0)));
    try {
      await updatePlatformSettings({
        maintenanceMessage: maintMsg,
        maxPlayersPerRoom: maxPlayers,
      });
      notify?.('تم حفظ الإعدادات', 'success');
    } catch {
      notify?.('فشل الحفظ', 'error');
    }
  };

  return (
    <div className="admin-health-panel">
      <AdminHealthKpi
        healthStatus={healthStatus}
        openCount={openRooms.length}
        orphanCount={stuckRooms.length}
        endedCount={endedRooms.length}
        security24h={securityStats.last24h}
        maintenanceMode={!!settings?.maintenanceMode}
        rtdbLabel={rtdbFootprint.label}
        roomTotal={rootCounts.total}
        maxPlayersPerRoom={Number(settings?.maxPlayersPerRoom) || 0}
      />

      <div className="admin-pulse-breakdown admin-health-game-counts">
        <span className="admin-pulse-chip">🎭 ألقاب: {rootCounts.rooms}</span>
        <span className="admin-pulse-chip">🦅 قميري: {rootCounts.qrooms}</span>
        <span className="admin-pulse-chip">🎯 حسبة: {rootCounts.srooms}</span>
      </div>

      <AdminCollapsibleSection
        title="غرف مفتوحة الآن"
        icon="🎮"
        badge={openRooms.length}
        tone={openRooms.length > 0 ? 'warn' : ''}
        defaultOpen={openRooms.length > 0}
        hint="كل غرفة لم تُنهَ بعد — أغلقها من هنا (مشرف منصة بدون كود يظهر هنا مباشرة)"
        actions={
          openRooms.length > 0 ? (
            <button
              type="button"
              className="btn btn--sm btn--danger"
              disabled={!!bulkBusy || !!busyId}
              onClick={() => void deleteAllOpen()}
            >
              {bulkBusy === 'open' ? '…' : 'حذف الكل'}
            </button>
          ) : null
        }
      >
        {loading ? (
          <p className="admin-pulse-empty">جاري الفحص…</p>
        ) : !openRooms.length ? (
          <p className="admin-pulse-empty">لا غرف مفتوحة — القاعدة نظيفة.</p>
        ) : (
          <ul className="admin-pulse-list">
            {openRooms.map((room) => (
              <AdminHealthRoomRow
                key={room.id}
                room={room}
                busyId={busyId}
                onEnd={endRoom}
                onDelete={deleteRoom}
                showHostBadge
              />
            ))}
          </ul>
        )}
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="إعدادات المنصة"
        icon="🛠️"
        defaultOpen
        hint="الصيانة وحد اللاعبين لكل غرفة"
      >
        <label className="admin-form-field admin-form-field--full">
          <span>رسالة الصيانة</span>
          <input
            className="inp"
            value={maintMsg}
            onChange={(e) => setMaintMsg(e.target.value)}
            maxLength={300}
          />
        </label>
        <label className="admin-form-field admin-form-field--full">
          <span>حد اللاعبين للغرفة (0 = بدون حد)</span>
          <input
            className="inp"
            type="number"
            min={0}
            max={500}
            value={maxPlayersInput}
            onChange={(e) => setMaxPlayersInput(e.target.value === '' ? 0 : Number(e.target.value))}
          />
        </label>
        <div className="admin-mkt-actions">
          <button
            type="button"
            className={`btn ${settings?.maintenanceMode ? 'btn--ghost' : 'btn--danger'}`}
            onClick={toggleMaintenance}
          >
            {settings?.maintenanceMode ? 'إيقاف الصيانة' : 'تفعيل الصيانة'}
          </button>
          <button type="button" className="btn btn--gold" onClick={saveSettings}>
            حفظ الإعدادات
          </button>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="غرف يتيمة (اشتراك منتهٍ)"
        icon="⚠️"
        badge={stuckRooms.length}
        tone="warn"
        defaultOpen={false}
        hint="فقط غرف انتهى اشتراكها منذ +24 ساعة، أو غرف قديمة بلا كود أقدم من 8 أيام — ليست غرف الأدمن الحالية"
        actions={
          stuckRooms.length > 0 ? (
            <button
              type="button"
              className="btn btn--sm btn--danger"
              disabled={!!bulkBusy || !!busyId}
              onClick={() => void deleteAllStuck()}
            >
              {bulkBusy === 'stuck' ? '…' : `حذف الكل`}
            </button>
          ) : null
        }
      >
        {legacyStuckCount > 0 ? (
          <p className="admin-pulse-card__hint">
            {legacyStuckCount} غرفة برمز قديم — انشر قواعد Firebase أو احذف يدوياً
          </p>
        ) : null}
        {!stuckRooms.length ? (
          <p className="admin-pulse-empty">
            لا غرف يتيمة — غرفك كمشرف منصة تُدار من «غرف مفتوحة الآن» أعلاه.
          </p>
        ) : (
          <ul className="admin-pulse-list">
            {stuckRooms.map((room) => (
              <AdminHealthRoomRow
                key={room.id}
                room={room}
                busyId={busyId}
                onEnd={endRoom}
                onDelete={deleteRoom}
              />
            ))}
          </ul>
        )}
      </AdminCollapsibleSection>

      {endedRooms.length > 0 ? (
        <AdminCollapsibleSection
          title="غرف منتهية"
          icon="🧹"
          badge={endedRooms.length}
          defaultOpen={false}
          hint="يمكن حذفها لتنظيف قاعدة البيانات"
          actions={
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              disabled={!!bulkBusy || !!busyId}
              onClick={() => void deleteAllEnded()}
            >
              {bulkBusy === 'ended' ? '…' : 'حذف الكل'}
            </button>
          }
        >
          <ul className="admin-pulse-list admin-pulse-list--compact">
            {endedRooms.map((room) => (
              <li key={room.id} className="admin-health-room admin-health-room--compact">
                <span>
                  {room.gameIcon} {room.roomCode}
                </span>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  disabled={busyId === room.id}
                  onClick={() => deleteRoom(room)}
                >
                  حذف
                </button>
              </li>
            ))}
          </ul>
        </AdminCollapsibleSection>
      ) : null}

      <AdminCollapsibleSection
        title="مراقبة الأمان"
        icon="🛡️"
        badge={securityStats.last24h}
        tone={securityStats.last24h >= 5 ? 'warn' : ''}
        defaultOpen={securityStats.last24h > 0}
        hint={`آخر 80 حدث — ${securityStats.codeFails} فشل أكواد · ${securityStats.lockouts} حظر`}
      >
        <AdminSecurityEvents notify={notify} embedded />
      </AdminCollapsibleSection>
    </div>
  );
}
