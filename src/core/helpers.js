export const genCode = (len = 4) => {
  const chars = '0123456789';
  return Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const fmtMs = ms => {
  if (!ms || ms <= 0) return '00:00';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} يوم ${h}س ${m}د`;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

export const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

export const mkInitials = name => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return name.slice(0, 2).toUpperCase();
};

/** أصوات لعبة القميري (Web Audio API) */
export const playSound = type => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const play = (freq, dur, vol = 0.3, wave = 'sine', delay = 0) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = wave;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + dur + 0.05);
    };
    if (type === 'countdown') {
      play(880, 0.08, 0.25, 'square');
    } else if (type === 'countdown_last') {
      play(1100, 0.12, 0.4, 'square');
    } else if (type === 'suspense') {
      [200, 240, 280, 320, 380].forEach((f, i) => play(f, 0.3, 0.15, 'sine', i * 0.18));
      play(500, 0.8, 0.2, 'sine', 1.0);
    } else if (type === 'explosion') {
      play(150, 0.15, 0.5, 'sawtooth');
      play(300, 0.3, 0.3, 'square', 0.05);
      play(600, 0.4, 0.2, 'sine', 0.1);
      play(900, 0.5, 0.15, 'sine', 0.2);
    } else if (type === 'applause') {
      for (let i = 0; i < 12; i++) {
        const o = ctx.createOscillator(),
          g = ctx.createGain(),
          bf = ctx.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.value = 80 + Math.random() * 200;
        bf.type = 'bandpass';
        bf.frequency.value = 1000 + Math.random() * 2000;
        bf.Q.value = 0.5;
        o.connect(bf);
        bf.connect(g);
        g.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.08;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.start(t);
        o.stop(t + 0.15);
      }
    } else if (type === 'poison_hit') {
      play(200, 0.2, 0.4, 'sawtooth');
      play(100, 0.4, 0.3, 'sine', 0.1);
    }
  } catch (e) {
    /* ignore */
  }
};
