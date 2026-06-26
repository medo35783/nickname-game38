/** شعارات iPhone و Android — للواجهة (SVG) */
export default function PlatformOsIcon({ os = 'android', size = 16, className = '' }) {
  const cls = `platform-os-icon platform-os-icon--${os}${className ? ` ${className}` : ''}`;
  const dim = { width: size, height: size };

  if (os === 'apple' || os === 'ios' || os === 'iphone') {
    return (
      <svg className={cls} viewBox="0 0 24 24" aria-hidden="true" {...dim}>
        <path
          fill="currentColor"
          d="M16.365 1.43c0 1.14-.46 2.204-1.27 3.01-.84.84-2.01 1.35-3.17 1.27-.05-1.09.42-2.21 1.18-3.02.84-.87 2.2-1.43 3.26-1.26zm.32 4.54c1.77-.03 3.3.95 4.15.95.86 0 2.2-.93 3.63-.9 1.55.03 3.04.9 3.8 2.28-3.34 1.82-2.78 6.56.56 8.22-.66 1.3-1.56 2.58-2.67 2.6-1.01.02-1.4-.6-2.62-.6-1.23 0-1.6.58-2.62.62-1.05.04-2.01-1.2-2.67-2.5 1.4-2.2 1.9-5.3.82-7.67-.8-1.7-2.2-2.7-3.76-2.7z"
        />
      </svg>
    );
  }

  return (
    <svg className={cls} viewBox="0 0 24 24" aria-hidden="true" {...dim}>
      <path
        fill="#3DDC84"
        d="M8.2 3.3 7.1 1.1a.4.4 0 0 0-.7-.4l-1.2 2.3a7.1 7.1 0 0 0-3.4 2.5.4.4 0 0 0 .1.5l1.1 1.1a.4.4 0 0 0 .5-.1 5.4 5.4 0 0 1 7.1 0 .4.4 0 0 0 .5.1l1.1-1.1a.4.4 0 0 0 .1-.5 7.1 7.1 0 0 0-3.4-2.5l-1.2-2.3a.4.4 0 0 0-.7.4l1.1 2.2z"
      />
      <path
        fill="#3DDC84"
        d="M4.2 8.6a.4.4 0 0 0-.4.4v6.4c0 .22.18.4.4.4h.8v2.4c0 .88.72 1.6 1.6 1.6s1.6-.72 1.6-1.6v-2.4h4.8v2.4c0 .88.72 1.6 1.6 1.6s1.6-.72 1.6-1.6v-2.4h.8a.4.4 0 0 0 .4-.4V9c0-.22-.18-.4-.4-.4H4.2z"
      />
      <circle cx="9.2" cy="12.2" r=".9" fill="#fff" />
      <circle cx="14.8" cy="12.2" r=".9" fill="#fff" />
    </svg>
  );
}
