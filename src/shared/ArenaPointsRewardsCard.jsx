import { useState } from 'react';
import {
  ARENA_POINTS_EARNING,
  ARENA_POINTS_REWARDS,
} from '../core/arena.constants';
import ArenaBadgeSheet from './ArenaBadgeSheet';
import '../styles/arena-badge.css';

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

function TierUnlockSheet({ points, focusTierId }) {
  return (
    <div className="arena-rewards-sheet-tiers">
      {ARENA_POINTS_REWARDS.map((row) => {
        const unlocked = points >= row.minPoints;
        const focused = focusTierId === row.tierId;
        return (
          <div
            key={row.tierId}
            className={`arena-rewards-sheet-tier${unlocked ? ' arena-rewards-sheet-tier--on' : ''}${focused ? ' arena-rewards-sheet-tier--focus' : ''}`}
          >
            <div className="arena-rewards-sheet-tier__head">
              <span className="arena-rewards-sheet-tier__icon">{row.icon}</span>
              <div>
                <strong>{row.label}</strong>
                <span>{fmt(row.minPoints)}+ نقطة</span>
              </div>
              {unlocked ? <span className="arena-rewards-sheet-tier__badge">مفتوح</span> : null}
            </div>
            <p className="arena-rewards-sheet-tier__frame">{row.frame} · {row.iconCount} أيقونة</p>
            <ul className="arena-rewards-sheet-tier__perks">
              {row.perks.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function EarnPointsSheet() {
  return (
    <div className="arena-rewards-sheet-earn">
      {ARENA_POINTS_EARNING.map((row) => (
        <div key={row.label} className="arena-rewards-sheet-earn__row">
          <span className="arena-rewards-sheet-earn__icon">{row.icon}</span>
          <div className="arena-rewards-sheet-earn__body">
            <strong>{row.label}</strong>
            {row.role === 'host' ? (
              <span>كل لاعب في الجلسة يزيد مكافأتك</span>
            ) : null}
          </div>
          <span className="arena-rewards-sheet-earn__pts">
            +{typeof row.points === 'number' ? row.points : row.points}
          </span>
        </div>
      ))}
      <p className="arena-rewards-sheet-earn__note">
        كلما لعبت واستضفت أكثر، ارتفع مستوى شارتك وفتحت أيقونات أندر في الساحة.
      </p>
    </div>
  );
}

/**
 * دليل النقاط — روابط الشرح والنوافذ التوضيحية فقط
 */
export default function ArenaPointsRewardsCard({ points = 0 }) {
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [earnOpen, setEarnOpen] = useState(false);
  const [focusTierId, setFocusTierId] = useState(null);

  const openUnlock = (tierId = null) => {
    setFocusTierId(tierId);
    setUnlockOpen(true);
  };

  return (
    <>
      <div className="arena-points-guide-card">
        <div className="arena-rewards-guide">
          <span className="arena-rewards-guide__tag" aria-hidden>
            ؟
          </span>
          <span className="arena-rewards-guide__label">دليل النقاط</span>
          <div className="arena-rewards-guide__links">
            <button type="button" className="arena-rewards-guide__link" onClick={() => openUnlock()}>
              المستويات والمكافآت
            </button>
            <span className="arena-rewards-guide__sep" aria-hidden>
              ·
            </span>
            <button type="button" className="arena-rewards-guide__link" onClick={() => setEarnOpen(true)}>
              كيف تكسب النقاط
            </button>
          </div>
        </div>
      </div>

      <ArenaBadgeSheet
        open={unlockOpen}
        onClose={() => setUnlockOpen(false)}
        title="مستويات الساحة"
        subtitle="كل مستوى يفتح إطاراً وأيقونات جديدة لشارتك"
        icon="🎁"
        footer={
          <button type="button" className="btn bg" onClick={() => setUnlockOpen(false)}>
            حسناً
          </button>
        }
      >
        <TierUnlockSheet points={points} focusTierId={focusTierId} />
      </ArenaBadgeSheet>

      <ArenaBadgeSheet
        open={earnOpen}
        onClose={() => setEarnOpen(false)}
        title="كيف تكسب النقاط"
        subtitle="العب، استضف، وتقدّم في الساحة"
        icon="⚡"
        footer={
          <button type="button" className="btn bg" onClick={() => setEarnOpen(false)}>
            فهمت
          </button>
        }
      >
        <EarnPointsSheet />
      </ArenaBadgeSheet>
    </>
  );
}
