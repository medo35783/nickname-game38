import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { db, ref, onValue, update, remove } from '../../core/firebaseHelpers';
import {
  collectStuckRooms,
  collectEndedRooms,
  countRoomRoots,
  formatRoomAge,
  isLegacyRoomCode,
  purgeRoomList,
} from '../../core/adminHealthHelpers';
import { formatPulseDateTime } from '../../core/adminPulseHelpers';
import {
  subscribePlatformSettings,
  setMaintenanceMode,
  updatePlatformSettings,
} from '../../core/platformSettings';

/**
 * المرحلة 5 — الصحة التقنية
 */
export default function AdminHealthPanel({ notify }) {
  const [roomSnaps, setRoomSnaps] = useState({ rooms: {}, qrooms: {}, srooms: {} });
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(null);
  const [maintMsg, setMaintMsg] = useState('');

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
    });
    unsubs.push(settingsUnsub);

    return () => {
      alive = false;
      authUnsub();
      unsubs.forEach((fn) => fn());
    };
  }, []);

  const stuckRooms = useMemo(() => collectStuckRooms(roomSnaps), [roomSnaps]);
  const endedRooms = useMemo(() => collectEndedRooms(roomSnaps), [roomSnaps]);
  const rootCounts = useMemo(() => countRoomRoots(roomSnaps), [roomSnaps]);

  const legacyStuckCount = useMemo(
    () => stuckRooms.filter((room) => room.legacyCode).length,
    [stuckRooms]
  );

  const roomActionError = useCallback((action, room, err) => {
    if (isLegacyRoomCode(room.roomCode)) {
      return `تعذّر ${action}: رمز الغرفة ${room.roomCode} قديم (ليس 4 أرقام). انشر قواعد Firebase المحدّثة ثم أعد المحاولة، أو احذفها من Firebase Console.`;
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
    try {
      await updatePlatformSettings({
        maintenanceMessage: maintMsg,
        maxPlayersPerRoom: settings?.maxPlayersPerRoom || 0,
      });
      notify?.('تم حفظ الإعدادات', 'success');
    } catch {
      notify?.('فشل الحفظ', 'error');
    }
  };

  return (
    <div className="admin-health-panel">
      <div className="admin-pulse-grid admin-pulse-grid--3">
        <div className="admin-pulse-card admin-pulse-card--warn">
          <div className="admin-pulse-card__head">
            <span aria-hidden>⚠️</span>
            <strong>غرف للمراجعة</strong>
            <span className="admin-pulse-card__count">{stuckRooms.length}</span>
          </div>
          <p className="admin-pulse-card__hint">
            بعد انتهاء الاشتراك + 24 ساعة — لا إغلاق تلقائي
          </p>
          {legacyStuckCount > 0 ? (
            <p className="admin-pulse-card__hint">
              {legacyStuckCount} غرفة برمز قديم (غير 4 أرقام) — تحتاج نشر قواعد Firebase أو حذف يدوي
            </p>
          ) : null}
        </div>
        <div className="admin-pulse-card">
          <div className="admin-pulse-card__head">
            <span aria-hidden>🗄️</span>
            <strong>إجمالي الغرف</strong>
            <span className="admin-pulse-card__count">{rootCounts.total}</span>
          </div>
          <div className="admin-pulse-breakdown">
            <span className="admin-pulse-chip">🎭 {rootCounts.rooms}</span>
            <span className="admin-pulse-chip">🦅 {rootCounts.qrooms}</span>
            <span className="admin-pulse-chip">🎯 {rootCounts.srooms}</span>
          </div>
        </div>
        <div className="admin-pulse-card">
          <div className="admin-pulse-card__head">
            <span aria-hidden>🛠️</span>
            <strong>وضع الصيانة</strong>
          </div>
          <p className="admin-pulse-card__hint">
            {settings?.maintenanceMode ? 'مفعّل — المستخدمون يرون تنبيهاً' : 'معطّل'}
          </p>
        </div>
      </div>

      <div className="admin-pulse-card" style={{ marginTop: 12 }}>
        <div className="admin-pulse-card__head">
          <span aria-hidden>🛠️</span>
          <strong>إعدادات المنصة</strong>
        </div>
        <label className="admin-form-field admin-form-field--full">
          <span>رسالة الصيانة</span>
          <input
            className="inp"
            value={maintMsg}
            onChange={(e) => setMaintMsg(e.target.value)}
            maxLength={300}
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
            حفظ الرسالة
          </button>
        </div>
      </div>

      <div className="admin-pulse-card admin-pulse-card--warn" style={{ marginTop: 12 }}>
        <div className="admin-pulse-card__head">
          <span aria-hidden>🔥</span>
          <strong>غرف للمراجعة (اشتراك منتهٍ)</strong>
          {stuckRooms.length > 0 ? (
            <button
              type="button"
              className="btn btn--sm btn--danger"
              disabled={!!bulkBusy || !!busyId}
              onClick={() => void deleteAllStuck()}
            >
              {bulkBusy === 'stuck' ? 'جاري الحذف…' : `حذف الكل (${stuckRooms.length})`}
            </button>
          ) : null}
        </div>
        <p className="admin-pulse-card__hint">
          تظهر فقط بعد انتهاء اشتراك المشرف + 24 ساعة. لا يُغلق شيء تلقائياً على المسابقات الجارية.
        </p>

        {loading ? (
          <p className="admin-pulse-empty">جاري الفحص…</p>
        ) : !stuckRooms.length ? (
          <p className="admin-pulse-empty">لا توجد غرف للمراجعة — ممتاز!</p>
        ) : (
          <ul className="admin-pulse-list">
            {stuckRooms.map((room) => (
              <li key={room.id} className="admin-health-room">
                <div className="admin-health-room__main">
                  <span>
                    {room.gameIcon} {room.gameLabel} · <code>{room.roomCode}</code>
                    {room.legacyCode ? (
                      <span className="admin-pulse-chip admin-pulse-chip--warn">رمز قديم</span>
                    ) : null}
                  </span>
                  <span className="admin-health-room__age">{formatRoomAge(room.ageHours)}</span>
                </div>
                <div className="admin-health-room__meta">
                  {room.phaseLabel}
                  {room.sessionStart ? ` · بدأت ${formatPulseDateTime(room.sessionStart)}` : ''}
                </div>
                <div className="admin-health-room__actions">
                  <button
                    type="button"
                    className="btn btn--sm btn--gold"
                    disabled={busyId === room.id}
                    onClick={() => endRoom(room)}
                  >
                    إنهاء
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    disabled={busyId === room.id}
                    onClick={() => deleteRoom(room)}
                  >
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {endedRooms.length > 0 ? (
        <div className="admin-pulse-card" style={{ marginTop: 12 }}>
          <div className="admin-pulse-card__head">
            <span aria-hidden>🧹</span>
            <strong>غرف منتهية ({endedRooms.length})</strong>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              disabled={!!bulkBusy || !!busyId}
              onClick={() => void deleteAllEnded()}
            >
              {bulkBusy === 'ended' ? 'جاري الحذف…' : `حذف الكل (${endedRooms.length})`}
            </button>
          </div>
          <p className="admin-pulse-card__hint">يمكن حذفها لتنظيف قاعدة البيانات</p>
          <ul className="admin-pulse-list" style={{ maxHeight: 160 }}>
            {endedRooms.slice(0, 8).map((room) => (
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
        </div>
      ) : null}
    </div>
  );
}
