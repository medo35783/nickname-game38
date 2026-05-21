/** بناء إعلان الجولة للمتسابقين — بدون كشف اسم اللقب المسموم. */

export function buildRoundAlert({ poisonNick, silentActive, specialRound }) {
  const alerts = [];
  if (poisonNick) {
    alerts.push({ type: 'poison' });
  }
  if (silentActive) {
    alerts.push({ type: 'silent' });
  }
  const spec = specialRound ?? 1;
  if (spec === 2) {
    alerts.push({ type: 'double', attacks: 2 });
  } else if (spec === 3) {
    alerts.push({ type: 'surprise', attacks: 3 });
  }
  return alerts;
}

export function roundAlertMessages(alerts) {
  if (!Array.isArray(alerts) || alerts.length === 0) return [];
  return alerts.map((a) => {
    switch (a.type) {
      case 'poison':
        return {
          icon: '☠️',
          tone: 'purple',
          text: 'يوجد لقب مسموم في هذه الجولة — لا يُكشف اسمه! إن هاجمتَه خطأً تُحرم من الهجوم في الجولة القادمة.',
        };
      case 'silent':
        return {
          icon: '🤫',
          tone: 'blue',
          text: 'جولة الصمت — من يُصاب يبقى نشطاً. المشرف يضغط «ابدأ الجولة التالية بدون كشف» حتى ينتهي، ثم «إعلان النتائج».',
        };
      case 'double':
        return {
          icon: '⚔️',
          tone: 'gold',
          text: `جولة مزدوجة — ${a.attacks || 2} هجمات مسموحة لكل لاعب نشط.`,
        };
      case 'surprise':
        return {
          icon: '⚡',
          tone: 'gold',
          text: `جولة مفاجئة — ${a.attacks || 3} هجمات مسموحة لكل لاعب نشط.`,
        };
      default:
        return null;
    }
  }).filter(Boolean);
}
