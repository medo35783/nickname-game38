import FameeriRevealOverlay from './FameeriRevealOverlay';
import FameeriVerdictBanner from './FameeriVerdictBanner';
import FameeriAttackDisplay from './FameeriAttackDisplay';
import PlayerQuestionView from '../../question-bank/PlayerQuestionView';
import { isGameCancelled } from '../../shared/gameCompetition';

/**
 * شاشة العرض / البروجكتر (دور «عرض») — قراءة فقط.
 * تعرض سير اللعبة العام كمسرح مشترك بدون كشف الأسرار (لا أرصدة متبقية ولا أعداد صيد لكل مجموعة).
 * تُكشف النتائج الكاملة فقط عند انتهاء اللعبة.
 */
export default function FameeriSpectatorView({
  roomCode,
  gameState,
  groups = [],
  reveal,
  countdown,
  onExit,
  accent = 'var(--fameeri-primary)',
}) {
  const phase = gameState?.phase || 'lobby';
  const currentAttack = gameState?.currentAttack;
  const timer = gameState?.timer;
  const currentQuestion = gameState?.currentQuestion;
  const speedBatchActive = gameState?.speedBatchActive;
  const isSpeed = gameState?.playMode === 'speed';

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent }}>🦅 لعبة القميري</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>رمز الغرفة</div>
          <div style={{ fontFamily: 'Cairo', fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>{roomCode}</div>
        </div>
        {onExit && (
          <button type="button" className="btn bgh bxs" style={{ width: 'auto' }} onClick={onExit}>
            خروج
          </button>
        )}
      </div>
    </div>
  );

  const groupChips = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
      {groups.map((g) => {
        const underAttack = currentAttack?.targetId === g.id;
        const attacking = currentAttack?.attackerId === g.id;
        return (
          <div
            key={g.id}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 800,
              background: underAttack ? 'rgba(230,57,80,.15)' : attacking ? 'rgba(240,192,64,.15)' : 'var(--surface)',
              border: `1.5px solid ${underAttack ? 'var(--red)' : attacking ? accent : 'var(--border-faint)'}`,
              color: 'var(--text)',
            }}
          >
            {attacking ? '⚔️ ' : underAttack ? '🎯 ' : ''}
            {g.name}
          </div>
        );
      })}
    </div>
  );

  let stage = null;

  if (phase === 'lobby' || phase === 'distributing') {
    stage = (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: 64, animation: 'treeBounce 1.4s ease infinite' }}>🌳</div>
        <div style={{ fontSize: 24, fontWeight: 900, marginTop: 12 }}>
          {phase === 'distributing' ? 'المجموعات توزّع القميري…' : 'بانتظار بدء اللعبة'}
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>
          {groups.length} مجموعة في الغرفة
        </div>
      </div>
    );
  } else if (phase === 'ended' && isGameCancelled(gameState)) {
    stage = (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 56 }}>🚪</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 12 }}>تم إلغاء المسابقة</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
          لم تبدأ المسابقة بعد — لا يوجد فائز
        </div>
      </div>
    );
  } else if (phase === 'ended') {
    const sorted = [...groups].sort((a, b) => (b.totalRemaining || 0) - (a.totalRemaining || 0));
    stage = (
      <div style={{ padding: '10px 0' }}>
        <div style={{ textAlign: 'center', fontSize: 56 }}>🏆</div>
        <div style={{ textAlign: 'center', fontSize: 26, fontWeight: 900, marginBottom: 16 }}>النتائج النهائية</div>
        {sorted.map((g, i) => {
          const isWinner = i === 0;
          return (
            <div
              key={g.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                marginBottom: 10,
                borderRadius: 14,
                background: isWinner ? 'linear-gradient(135deg,rgba(240,192,64,.2),rgba(255,140,0,.1))' : 'var(--surface)',
                border: isWinner ? `2px solid ${accent}` : '1px solid var(--border-faint)',
              }}
            >
              <div style={{ fontFamily: 'Cairo', fontSize: isWinner ? 32 : 22, fontWeight: 900, width: 42, color: isWinner ? accent : 'var(--muted)' }}>
                {isWinner ? '👑' : i + 1}
              </div>
              <div style={{ flex: 1, fontSize: isWinner ? 20 : 16, fontWeight: 900 }}>{g.name}</div>
              <div style={{ fontFamily: 'Cairo', fontSize: isWinner ? 32 : 24, fontWeight: 900, color: accent }}>
                {g.totalRemaining || 0} 🐦
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    // playing
    if (reveal) {
      stage = <FameeriRevealOverlay qReveal={reveal} showContinue={false} />;
    } else if (currentQuestion?.adminOnly && currentQuestion.revealToPlayers) {
      const revealedAnswer = gameState?.answerVerdict?.revealedAnswer;
      stage = (
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: 52 }}>🎭</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 10 }}>تحدي تمثيل / مثل</div>
          {revealedAnswer ? (
            <>
              <div style={{ fontSize: 14, color: 'var(--green)', fontWeight: 800, marginTop: 20 }}>✅ الإجابة الصحيحة</div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  marginTop: 12,
                  lineHeight: 1.5,
                  color: 'var(--text)',
                  padding: '0 8px',
                }}
              >
                «{revealedAnswer}»
              </div>
            </>
          ) : timer && countdown !== null ? (
            <div style={{ marginTop: 24 }}>
              <div className="q-timer-huge" style={{ fontSize: 88 }}>{countdown > 0 ? countdown : '⏰'}</div>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>وقت الإجابة</div>
            </div>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 14 }}>
              القائد يختار شخصاً للتمثيل — المشرف يشغّل المؤقت عند الجاهزية
            </div>
          )}
        </div>
      );
    } else if (currentQuestion && currentQuestion.revealToPlayers && !currentQuestion.adminOnly) {
      stage = (
        <div style={{ padding: '20px 0' }}>
          <PlayerQuestionView current={currentQuestion} accent={accent} />
          {timer && countdown !== null && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <div className="q-timer-huge" style={{ fontSize: 72 }}>{countdown > 0 ? countdown : '⏰'}</div>
            </div>
          )}
        </div>
      );
    } else if (timer && countdown !== null && (currentAttack || speedBatchActive)) {
      stage = (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div className="q-timer-huge" style={{ fontSize: 96 }}>{countdown > 0 ? countdown : '⏰'}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: accent, marginTop: 12 }}>
            {speedBatchActive && !currentAttack
              ? '⚡ جولة السرعة — أسرع إجابة تكسب'
              : '⏱️ وقت الإجابة'}
          </div>
        </div>
      );
    } else if (currentAttack) {
      stage = (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--muted)' }}>
            المشرف يجهّز السؤال أو المؤقت…
          </div>
        </div>
      );
    } else {
      const turnGroup = groups.find((g) => g.id === gameState?.turnGroup);
      stage = (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 60 }}>{isSpeed ? '⚡' : '🎯'}</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 12 }}>
            {isSpeed ? 'وضع السرعة — استعدوا!' : `الدور: ${turnGroup?.name || '—'}`}
          </div>
          {!isSpeed && gameState?.round && (
            <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>الجولة {gameState.round}</div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="scr fameeri-spectator" style={{ maxWidth: 760, margin: '0 auto' }}>
      {header}
      {currentAttack && phase === 'playing' && !reveal && (
        <FameeriAttackDisplay
          attack={currentAttack}
          badge="⚔️ هجوم نشط"
          size="xl"
          className="fameeri-spectator-attack"
        />
      )}
      <div className="card" style={{ minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1.5px solid ${accent}` }}>
        {gameState?.answerVerdict && !reveal && (
          <div style={{ padding: '0 0 12px' }}>
            <FameeriVerdictBanner verdict={gameState.answerVerdict} />
          </div>
        )}
        {stage}
      </div>
      {phase !== 'ended' && groupChips}
    </div>
  );
}
