/**
 * نقطة نشاط + تسمية بجانب الكود في جدول الأكواد.
 */
export default function CodeActivityBadge({ activity, loading }) {
  if (loading) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 10,
          color: 'var(--dim)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--dim)',
            opacity: 0.45,
          }}
        />
        …
      </span>
    );
  }

  const { label, color, pulse } = activity;

  return (
    <span
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 10,
        fontWeight: 700,
        color,
      }}
    >
      <style>{`
        @keyframes codeActPulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(36,143,85,.45); }
          50% { opacity: 0.85; transform: scale(1.15); box-shadow: 0 0 0 4px rgba(36,143,85,0); }
        }
      `}</style>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          animation: pulse ? 'codeActPulse 1.5s ease-in-out infinite' : undefined,
        }}
      />
      {label}
    </span>
  );
}
