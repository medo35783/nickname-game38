import { ref, onValue, set, update, get } from 'firebase/database';
import { db } from '../firebase';

const SETTINGS_PATH = 'platform/settings';

const DEFAULTS = {
  maintenanceMode: false,
  maintenanceMessage: 'المنصة تحت الصيانة — نعود قريباً 🛠️',
  maxPlayersPerRoom: 0,
  updatedAt: 0,
};

export function subscribePlatformSettings(onData) {
  const r = ref(db, SETTINGS_PATH);
  return onValue(r, (snap) => {
    const val = snap.val() || {};
    onData({
      ...DEFAULTS,
      ...val,
      maintenanceMode: !!val.maintenanceMode,
      maxPlayersPerRoom: Number(val.maxPlayersPerRoom) || 0,
    });
  });
}

export async function fetchPlatformSettings() {
  const snap = await get(ref(db, SETTINGS_PATH));
  const val = snap.val() || {};
  return {
    ...DEFAULTS,
    ...val,
    maintenanceMode: !!val.maintenanceMode,
    maxPlayersPerRoom: Number(val.maxPlayersPerRoom) || 0,
  };
}

export async function updatePlatformSettings(patch) {
  const next = {
    ...patch,
    updatedAt: Date.now(),
  };
  if (typeof patch.maintenanceMode === 'boolean') {
    next.maintenanceMode = patch.maintenanceMode;
  }
  await update(ref(db, SETTINGS_PATH), next);
}

export async function setMaintenanceMode(enabled, message) {
  await update(ref(db, SETTINGS_PATH), {
    maintenanceMode: !!enabled,
    ...(message ? { maintenanceMessage: String(message).slice(0, 300) } : {}),
    updatedAt: Date.now(),
  });
}
