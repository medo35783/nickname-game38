import { useEffect, useRef, useState } from 'react';
import { arrowCountOnNick, formatRevealAttackersLine } from '../titlesRevealHelpers';

/** كاروسيل كشف — يعرض حتى `unlockedCount` بطاقة؛ التنقل محلي بدون اختفاء */
export default function RevealCarousel({
  queue,
  unlockedCount,
  isAdmin,
  onUnlockNext,
  onFinish,
  hasMoreToUnlock,
  onFinishLabel,
}) {
  const maxIndex = Math.max(0, unlockedCount - 1);
  const [index, setIndex] = useState(0);
  const prevUnlockedRef = useRef(unlockedCount);

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  /* عند كشف بطاقة جديدة فقط — انتقل إليها؛ لا تعيد الفهرس عند التنقل اليدوي */
  useEffect(() => {
    const prev = prevUnlockedRef.current;
    if (unlockedCount > prev) {
      setIndex(unlockedCount - 1);
    }
    prevUnlockedRef.current = unlockedCount;
  }, [unlockedCount]);

  const item = queue[index];
  if (!item) return null;

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(maxIndex, i + 1));

  return (
    <div className="trs-carousel">
      <div className="trs-carousel-dots" role="tablist" aria-label="مشاهد الكشف">
        {queue.slice(0, unlockedCount).map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={`trs-carousel-dot${i === index ? ' on' : ''}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>

      <div className="trs-carousel-stage">
        <button
          type="button"
          className="trs-carousel-arrow"
          aria-label="السابق"
          disabled={index <= 0}
          onClick={goPrev}
        >
          ‹
        </button>

        <div className="trs-carousel-card-wrap" key={`${index}-${item.nick}`}>
          <RevealFlashCard item={item} index={index} />
        </div>

        <button
          type="button"
          className="trs-carousel-arrow"
          aria-label="التالي"
          disabled={index >= maxIndex}
          onClick={goNext}
        >
          ›
        </button>
      </div>

      <p className="trs-carousel-counter">
        {index + 1} / {unlockedCount}
        {queue.length > unlockedCount && (
          <span className="trs-carousel-pending"> · بقي {queue.length - unlockedCount}</span>
        )}
      </p>

      <div className="trs-carousel-actions">
        {isAdmin ? (
          <>
            {hasMoreToUnlock ? (
              <button type="button" className="btn bg trs-carousel-btn-main" onClick={onUnlockNext}>
                🔓 كشف التالي
              </button>
            ) : (
              <button type="button" className="btn bg trs-carousel-btn-main" onClick={onFinish}>
                {onFinishLabel || '▶️ متابعة'}
              </button>
            )}
            <p className="trs-carousel-hint">
              {hasMoreToUnlock
                ? 'يمكن للجميع الرجوع للبطاقات السابقة — لا تختفي حتى تضغط'
                : 'انتهى الكشف — متابعة للملخص'}
            </p>
          </>
        ) : (
          <p className="trs-carousel-wait">
            {hasMoreToUnlock ? '👀 راجع البطاقات — المشرف يكشف التالي' : 'انتظر متابعة المشرف…'}
          </p>
        )}
      </div>
    </div>
  );
}

function RevealFlashCard({ item, index }) {
  const attackers = item.attackers || [];
  const multiHit = arrowCountOnNick(item) >= 2;
  const isElim = item.type === 'elim';
  const killerLine = formatRevealAttackersLine(attackers);

  return (
    <article
      className={`trs-flash-card${isElim ? ' is-elim' : ''}${multiHit ? ' is-multi' : ''}`}
    >
      <span className="trs-flash-badge">{index + 1}</span>
      {item.fromSilentRound != null && (
        <span className="trs-flash-silent" title={`جولة صامتة ${item.fromSilentRound}`}>
          <span className="trs-flash-silent-ico" aria-hidden>
            🤫
          </span>
          <span className="trs-flash-silent-num">الجولة {item.fromSilentRound}</span>
        </span>
      )}
      {isElim && <span className="trs-flash-elim-tag">💥 خرج</span>}

      <div className="trs-flash-nick">&quot;{item.nick}&quot;</div>
      <div className="trs-flash-name">{item.name || '—'}</div>

      {killerLine && (
        <p className="trs-flash-killer">
          <span className="trs-flash-killer-lbl">كُشف من قِبَل:</span>{' '}
          <span className="trs-flash-killer-names">{killerLine}</span>
        </p>
      )}
    </article>
  );
}
