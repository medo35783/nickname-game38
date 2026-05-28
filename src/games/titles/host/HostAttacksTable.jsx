import { useMemo } from 'react';

/**
 * جدول هجمات للمشرف — أعمدة واضحة: اللقب المخمّن، الاسم المتوقع، المهاجم، الحالة.
 */
export default function HostAttacksTable({
  attacks,
  maxRows = 12,
  emptyText = 'لا هجمات بعد',
  className = '',
}) {
  const rows = useMemo(() => {
    const list = Array.isArray(attacks) ? attacks : Object.values(attacks || {});
    return list
      .slice()
      .sort((a, b) => (a.time || 0) - (b.time || 0))
      .slice(-maxRows);
  }, [attacks, maxRows]);

  if (rows.length === 0) {
    return (
      <div className={`host-atk-empty${className ? ` ${className}` : ''}`}>{emptyText}</div>
    );
  }

  return (
    <div className={`host-atk-table-wrap sc${className ? ` ${className}` : ''}`}>
      <table className="host-atk-table">
        <thead>
          <tr>
            <th>اللقب المخمّن</th>
            <th>اسم الشخص المتوقع</th>
            <th>المهاجم</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => {
            const ok = Boolean(a.correct);
            return (
              <tr key={a.time ? `${a.time}-${i}` : i} className={ok ? 'host-atk-row--ok' : 'host-atk-row--fail'}>
                <td className="host-atk-nick" title={a.targetNick || ''}>
                  {a.targetNick || '—'}
                </td>
                <td className="host-atk-name" title={a.guessedName || ''}>
                  {a.guessedName || '—'}
                </td>
                <td className="host-atk-attacker" title={a.attackerNick || ''}>
                  {a.attackerNick || '—'}
                </td>
                <td>
                  <span className={`host-atk-status ${ok ? 'host-atk-status--ok' : 'host-atk-status--fail'}`}>
                    <span className="host-atk-status-ico" aria-hidden>
                      {ok ? '✓' : '✕'}
                    </span>
                    {ok ? 'صح' : 'خطأ'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
