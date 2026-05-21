import { useEffect, useRef } from 'react';
import Av from '../../shared/Av';
import {
  attacksForPlayer,
  arrowCountOnNick,
  multiArrowAnnounce,
  revealAdminQueueHint,
  revealNickCountPhrase,
  revealPlayerTeaser,
} from './titlesRevealHelpers';

/** مشهد كشف متزامن — revealStep من Firebase (المشرف يضغط متابعة). */
export default function TitlesRevealScene(props) {
  const {
    role,
    gameState,
    attacks,
    players,
    myId,
    myNickLocal,
    playSound,
    advanceRevealStep,
    nextRound,
    endGame,
    declareWinner,
    setGameScreen,
    setStatsTab,
    onPrepNextRound,
  } = props;

  const step = typeof gameState?.revealStep === 'number' ? gameState.revealStep : 0;
  const queue = Array.isArray(gameState?.revealQueue) ? gameState.revealQueue : [];
  const stats = gameState?.revealStats || {};
  const roundNum = gameState?.roundNum || 0;
  const endGameAfterReveal = Boolean(gameState?.endGameAfterReveal);
  const summaryStep = queue.length + 1;
  const winnerStep = endGameAfterReveal ? queue.length + 2 : null;
  const maxStep = endGameAfterReveal ? queue.length + 2 : queue.length + 1;
  const isAdmin = role === 'admin';

  const playersList = Object.entries(players || {}).map(([id, p]) => ({ ...p, id }));
  const activePlayers = playersList.filter((p) => p.status === 'active');
  const activePoisonNick = gameState?.poisonNick || '';
  const remainingActive =
    typeof stats.remainingActive === 'number' ? stats.remainingActive : activePlayers.length;

  const me = playersList.find((p) => p.id === myId);
  const myNicks = me ? [me.nick, me.nick2].filter(Boolean) : [myNickLocal].filter(Boolean);
  const myAtks = attacksForPlayer(attacks, { playerId: myId, nicks: myNicks });

  const prevStep = useRef(step);
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    if (step === 0) playSound?.('suspense');
    else if (step >= 1 && step <= queue.length) playSound?.('explosion');
  }, [step, queue.length, playSound]);

  const poisoned = playersList.filter((p) => p.isBannedNextRound && p.isBannedNextRound >= roundNum);

  if (step === 0) {
    return (
      <div className="trs-scene">
        <h1 className="trs-title">🔓 كُشفت النتائج</h1>
        <p className="trs-sub">الجولة {roundNum}</p>

        <TrsCard accent="gold">
          <div className="trs-section-lbl">🎯 هجمتك هذه الجولة</div>
          {myAtks.length === 0 ? (
            <p className="trs-muted">لم ترسل هجوماً هذه الجولة</p>
          ) : (
            myAtks.map((a, i) => <MyAttackRow key={i} a={a} />)
          )}
        </TrsCard>

        <div className="sg sg3" style={{ marginBottom: 14 }}>
          <div className="sbox">
            <div className="snum">{stats.attacks ?? 0}</div>
            <div className="slbl">هجمات</div>
          </div>
          <div className="sbox">
            <div className="snum" style={{ color: 'var(--green)' }}>
              {stats.correct ?? 0}
            </div>
            <div className="slbl">إصابات ✅</div>
          </div>
          <div className="sbox">
            <div className="snum" style={{ color: 'var(--red)' }}>
              {stats.wrong ?? 0}
            </div>
            <div className="slbl">فشل ❌</div>
          </div>
        </div>

        {gameState?.silentPending && (
          <TrsBanner icon="🤫" color="var(--purple)">
            جولة صامتة سابقة — ستُعرض مع الكشف المتسلسل
          </TrsBanner>
        )}

        {queue.length === 0 ? (
          <TrsBanner icon="✅" color="var(--green)">
            لم يُكشف أحد هذه الجولة
          </TrsBanner>
        ) : isAdmin ? (
          <TrsBanner icon="🎭" color="var(--gold)">
            {revealAdminQueueHint(queue.length)}
          </TrsBanner>
        ) : (
          <PlayerRevealTeaser count={queue.length} />
        )}

        {endGameAfterReveal && (
          <TrsBanner icon="🏆" color="var(--gold)">
            بعد إعلان الخروج — مشهد الفائز ({remainingActive === 1 ? 'متبقٍ واحد' : 'متبقيان'})
          </TrsBanner>
        )}

        <AdminContinue
          isAdmin={isAdmin}
          hint={
            queue.length
              ? 'ابدأ إعلان من خرج — مشهد بمشهد'
              : endGameAfterReveal
                ? '«متابعة» — جاهزون لإعلان الفائز'
                : '«متابعة» لملخص الجولة'
          }
          onContinue={advanceRevealStep}
        />
        {!isAdmin && queue.length > 0 && step === 0 && (
          <p className="trs-wait-pulse">الشاشة تتحرك مع كل إعلان — ركّز 👀</p>
        )}
      </div>
    );
  }

  if (step >= 1 && step <= queue.length) {
    const item = queue[step - 1];
    const isPartial = item.type === 'partial';
    const fakePlayer = {
      nick: item.nick,
      nick2: item.nick2,
      name: item.name,
      initials: item.name?.[0] || '?',
      colorIdx: 0,
      status: isPartial ? 'active' : 'eliminated',
    };

    return (
      <div className="trs-scene cinematic">
        {item.fromSilentRound && (
          <TrsBanner icon="🤫" color="var(--purple)">
            الجولة {item.fromSilentRound} — كان خروجه مخفياً حتى الآن
          </TrsBanner>
        )}

        <p className="trs-suspense">... حبس الأنفاس ...</p>

        {(() => {
          const arrowN = arrowCountOnNick(item);
          if (arrowN >= 2) {
            return (
              <>
                <ArrowVolley count={arrowN} targetNick={item.nick} />
                <p className="trs-multi-hit">{multiArrowAnnounce(arrowN, item.nick)}</p>
              </>
            );
          }
          if (arrowN === 1) {
            return (
              <div className="trs-single-arrow" aria-hidden>
                <span className="trs-arrow-icon solo">🏹</span>
              </div>
            );
          }
          return null;
        })()}

        <div className={`trs-nick-hero${isPartial ? ' partial' : ''}${arrowCountOnNick(item) >= 2 ? ' multi-hit' : ''}`}>
          "{item.nick}"
        </div>

        {!isPartial && (
          <div className="trs-burst">
            <Av p={fakePlayer} sz={56} fs={18} />
            <div className="trs-reveal-name">{item.name || '—'}</div>
            <div className="trs-reveal-lbl">
              {arrowCountOnNick(item) >= 2 ? '💥 أُصيب من عدة جهات — انكشف!' : '💥 انكشف!'}
            </div>
          </div>
        )}

        {isPartial && (
          <TrsCard accent="purple">
            <div className="trs-reveal-lbl">كُشف لقب واحد — ما زال في اللعبة</div>
            {item.nick2 && (
              <p className="trs-muted">
                اللقب <strong style={{ color: 'var(--gold)' }}>"{item.nick2}"</strong> ما زال مخفياً
              </p>
            )}
          </TrsCard>
        )}

        {item.attackers?.length > 0 && (
          <TrsCard>
            <div className="trs-section-lbl">⚔️ كُشف من قِبَل</div>
            <AttackersChips list={item.attackers} />
          </TrsCard>
        )}

        <p className="trs-step-counter">
          {isAdmin ? `مشهد ${step} من ${queue.length}` : `اللحظة ${step} من ${queue.length} 🔥`}
        </p>

        <AdminContinue
          isAdmin={isAdmin}
          hint={
            step < queue.length
              ? '«متابعة» للإعلان التالي'
              : endGameAfterReveal
                ? '«متابعة» — ثم إعلان الفائز'
                : '«متابعة» لملخص الجولة'
          }
          onContinue={advanceRevealStep}
        />
      </div>
    );
  }

  if (endGameAfterReveal && step === summaryStep) {
    const elimCount = queue.filter((q) => q.type === 'elim').length;
    return (
      <div className="trs-scene">
        <h1 className="trs-title">✅ اكتمل إعلان الخروج</h1>
        <p className="trs-sub">الجولة {roundNum}</p>

        {elimCount > 0 && (
          <TrsCard accent="red">
            <div className="snum" style={{ color: 'var(--red)', fontSize: 28 }}>
              {elimCount}
            </div>
            <div className="slbl">أُعلِن خروجهم</div>
          </TrsCard>
        )}

        <TrsCard accent="gold">
          <div className="trs-section-lbl">🏁 النهاية قريبة</div>
          <div className="snum" style={{ color: 'var(--green)', fontSize: 32 }}>
            {remainingActive}
          </div>
          <div className="slbl">
            {remainingActive === 1 ? 'متبقٍ — جاهز لإعلان الفائز' : 'متبقيان — جاهزون لإعلان الفائز'}
          </div>
        </TrsCard>

        <AdminContinue
          isAdmin={isAdmin}
          hint="«متابعة» لمشهد الفائز 🏆"
          onContinue={advanceRevealStep}
        />
        {!isAdmin && <p className="trs-wait-pulse">المشرف يعلن الفائز بعد قليل…</p>}
      </div>
    );
  }

  if (step >= maxStep && endGameAfterReveal && step >= winnerStep) {
    const elimCount = queue.filter((q) => q.type === 'elim').length;
    const winners = activePlayers.filter((p) => p.status === 'active').slice(0, 2);
      return (
        <div className="trs-scene trs-winner-ceremony">
          {elimCount > 0 && (
            <TrsBanner icon="✅" color="var(--green)">
              انتهى إعلان الخروج — {elimCount} انكشفوا
            </TrsBanner>
          )}

          <p className="trs-suspense">... اللحظة الأخيرة ...</p>
          <h1 className="trs-title trs-winner-headline">🏆 من الفائز؟</h1>

          <div className="trs-winner-stage">
            {winners.map((w, i) => (
              <div key={w.id} className="trs-winner-card" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="trs-winner-crown">{i === 0 ? '👑' : '🥈'}</div>
                <Av p={w} sz={64} fs={20} />
                <div className="trs-winner-name">{w.name}</div>
                <div className="trs-winner-nick">
                  &quot;{w.nick}&quot;
                  {w.nick2 ? <span> · &quot;{w.nick2}&quot;</span> : ''}
                </div>
              </div>
            ))}
          </div>

          {isAdmin ? (
            <button
              type="button"
              className="btn bg trs-winner-btn"
              onClick={() => {
                playSound?.('applause');
                if (declareWinner) void declareWinner();
                else void endGame?.();
              }}
            >
              🎉 إعلان الفائز رسمياً
            </button>
          ) : (
            <p className="trs-wait-pulse">المشرف يعلن الفائز الآن… 🎉</p>
          )}

          <button
            type="button"
            className="btn bgh bsm"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => {
              setStatsTab?.('nicks');
              setGameScreen?.('stats');
            }}
          >
            📊 الإحصائيات
          </button>
        </div>
      );
  }

  if (step >= summaryStep && !endGameAfterReveal) {
    const elimCount = queue.filter((q) => q.type === 'elim').length;
    return (
      <div className="trs-scene">
        <h1 className="trs-title">📋 ملخص الجولة {roundNum}</h1>

        {elimCount > 0 && (
          <TrsCard accent="red">
            <div className="snum" style={{ color: 'var(--red)', fontSize: 28 }}>
              {elimCount}
            </div>
            <div className="slbl">انكشفوا هذه الجولة</div>
          </TrsCard>
        )}

        <TrsCard>
          <div className="trs-section-lbl">👥 ما زال في اللعبة</div>
          <div className="snum" style={{ color: 'var(--green)', fontSize: 32 }}>
            {remainingActive}
          </div>
          <div className="slbl">لاعب نشط</div>
        </TrsCard>

        {activePoisonNick && poisoned.length > 0 && (
          <TrsBanner icon="☠️" color="var(--purple)">
            {poisoned.length} لاعب وقع في المسموم — ممنوع الجولة القادمة
          </TrsBanner>
        )}

        <button
          type="button"
          className="btn bo mt2"
          onClick={() => {
            setStatsTab?.('nicks');
            setGameScreen?.('stats');
          }}
        >
          🔥 الإحصائيات
        </button>

        {isAdmin && (
          <div className="trs-admin-actions">
            <button
              type="button"
              className="btn bg"
              onClick={() => {
                if (onPrepNextRound) onPrepNextRound();
                else void nextRound?.();
              }}
            >
              ⚗️ تجهيز الجولة {roundNum + 1}
            </button>
            <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8, lineHeight: 1.55 }}>
              اختر المسموم/الصمت/نوع الجولة قبل الضغط على بدء الجولة التالية
            </p>
          </div>
        )}
        {!isAdmin && <p className="trs-wait-pulse">انتظر قرار الجولة القادمة… 👑</p>}
      </div>
    );
  }

  return null;
}

function MyAttackRow({ a }) {
  return (
    <div className={`trs-my-atk${a.correct ? ' ok' : ' bad'}`}>
      <div className="trs-atk-line">
        هاجمت <strong className="gold">"{a.targetNick}"</strong>
      </div>
      <div className="trs-atk-line">
        خمّنت <strong>{a.guessedName || '—'}</strong>
      </div>
      <div className={`trs-atk-verdict${a.correct ? ' ok' : ' bad'}`}>{a.correct ? '✅ إصابة!' : '❌ لم تصب'}</div>
    </div>
  );
}

function AttackersChips({ list }) {
  return (
    <div className="trs-attackers">
      {list.map((n, i) => (
        <span key={i} className="trs-attacker-chip">
          "{n}"
        </span>
      ))}
    </div>
  );
}

function TrsCard({ children, accent }) {
  return <div className={`trs-card${accent ? ` accent-${accent}` : ''}`}>{children}</div>;
}

function TrsBanner({ children, icon, color }) {
  return (
    <div className="trs-banner" style={{ borderColor: color, color }}>
      <span>{icon}</span> {children}
    </div>
  );
}

/** أسهم متجهة نحو اللقب — بعدد المهاجمين الذين أصابوا نفس اللقب */
function ArrowVolley({ count, targetNick }) {
  const angles = [
    { left: '8%', top: '6%', rot: 35, delay: 0 },
    { left: '78%', top: '8%', rot: -30, delay: 0.12 },
    { left: '4%', top: '42%', rot: 10, delay: 0.22 },
    { left: '82%', top: '38%', rot: -15, delay: 0.08 },
    { left: '22%', top: '2%', rot: 55, delay: 0.18 },
    { left: '62%', top: '4%', rot: -45, delay: 0.28 },
  ];
  return (
    <div className="trs-arrow-volley" aria-label={`${count} أسهم أصابت ${targetNick}`}>
      {angles.slice(0, count).map((a, i) => (
        <span
          key={i}
          className="trs-arrow-fly"
          style={{
            left: a.left,
            top: a.top,
            '--rot': `${a.rot}deg`,
            animationDelay: `${a.delay}s`,
          }}
        >
          🏹
        </span>
      ))}
      <div className="trs-arrow-target-ring" />
    </div>
  );
}

function PlayerRevealTeaser({ count }) {
  const { headline, sub } = revealPlayerTeaser(count);
  return (
    <div className="trs-teaser">
      <div className="trs-teaser-icon">🎭</div>
      <p className="trs-teaser-head">{headline}</p>
      <p className="trs-teaser-sub">{sub}</p>
    </div>
  );
}

function AdminContinue({ isAdmin, hint, onContinue }) {
  if (!isAdmin) return null;
  return (
    <div className="trs-admin-bar">
      <p className="trs-admin-hint">{hint}</p>
      <button type="button" className="btn bg trs-continue-btn" onClick={onContinue}>
        ▶️ متابعة
      </button>
    </div>
  );
}
