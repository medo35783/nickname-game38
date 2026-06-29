const fmt = (n) => Number(n || 0).toLocaleString('en-US');

export function formatAccountDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short',
      numberingSystem: 'latn',
    });
  } catch {
    return '—';
  }
}

export function formatAccountDateShort(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      numberingSystem: 'latn',
    });
  } catch {
    return '—';
  }
}

export function subscriptionTimeLeft(expiresAt) {
  const remaining = Math.max(0, Number(expiresAt) - Date.now());
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return { remaining, days, hours, minutes, urgent: remaining < 3600000 && remaining > 0 };
}

export function subscriptionProgress(activeCode) {
  const expiresAt = Number(activeCode?.expiresAt) || 0;
  const activatedAt = Number(activeCode?.activatedAt) || 0;
  const durationMs = expiresAt - activatedAt;
  const hoursTotal = Number(activeCode?.durationHours);
  const isHourly = Number.isFinite(hoursTotal) && hoursTotal > 0;

  if (!durationMs || durationMs <= 0) {
    return {
      pct: 0,
      usedDays: 0,
      totalDays: isHourly ? hoursTotal : Number(activeCode?.duration) || 0,
      isHourly,
    };
  }

  const elapsed = Math.max(0, Date.now() - activatedAt);
  const pct = Math.min(100, Math.max(0, Math.round((elapsed / durationMs) * 100)));

  if (isHourly) {
    const usedHours = Math.min(hoursTotal, Math.floor(elapsed / 3600000));
    return { pct, usedDays: usedHours, totalDays: hoursTotal, isHourly: true };
  }

  const totalDays = Number(activeCode?.duration) || Math.ceil(durationMs / 86400000);
  const usedDays = Math.min(totalDays, Math.floor(elapsed / 86400000));
  return { pct, usedDays, totalDays, isHourly: false };
}

export function formatRelativeTime(ts) {
  if (!ts) return '—';
  const diff = Date.now() - Number(ts);
  if (diff < 60_000) return 'الآن';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `منذ ${fmt(mins)} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${fmt(hours)} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${fmt(days)} يوم`;
  return formatAccountDateShort(ts);
}

export function formatPlayTime(totalMinutes, { short = false } = {}) {
  const total = Math.round(Number(totalMinutes) || 0);
  if (total <= 0) return '—';

  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (short) {
    if (hours === 0) return `${mins} د`;
    if (mins === 0) return `${hours} س`;
    return `${hours} س ${mins} د`;
  }

  if (hours === 0) return `${fmt(mins)} دقيقة`;
  if (mins === 0) return `${fmt(hours)} ساعة`;
  return `${fmt(hours)} ساعة و ${fmt(mins)} دقيقة`;
}

export { fmt };
