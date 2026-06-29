import { securityEventLabel } from './securityEvents';

function escCsv(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** تصدير أحداث الأمان كـ CSV */
export function exportSecurityEventsCsv(events = []) {
  const header = ['id', 'type', 'label', 'at_iso', 'reason', 'uid', 'failCount'];
  const lines = [
    header.join(','),
    ...events.map((ev) =>
      [
        escCsv(ev.id),
        escCsv(ev.type),
        escCsv(securityEventLabel(ev.type)),
        escCsv(ev.at ? new Date(ev.at).toISOString() : ''),
        escCsv(ev.reason || ''),
        escCsv(ev.uid || ''),
        escCsv(ev.failCount ?? ''),
      ].join(',')
    ),
  ];
  const blob = new Blob(['\ufeff', lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `la3ibz-security-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
