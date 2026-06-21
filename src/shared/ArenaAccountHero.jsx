import {
  ARENA_POINTS_REWARDS,
  computeArenaTier,
  nextTierProgress,
} from '../core/arena.constants';
import ArenaBadge from './ArenaBadge';
import '../styles/arena-badge.css';

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

const TIER_VISUAL = {
  bronze: { icon: '🥉', ring: 'bronze' },
  silver: { icon: '⚪', ring: 'silver' },
  gold: { icon: '🥇', ring: 'gold' },
  legend: { icon: '💫', ring: 'legend' },
};

function tierRewardIcon(tierId) {
  return ARENA_POINTS_REWARDS.find((r) => r.tierId === tierId)?.icon || TIER_VISUAL[tierId]?.icon || '⭐';
}

/**
 * بطاقة الهوية الموحّدة — الاسم + الشارة + المستوى الحالي + التقدّم للمستوى التالي
 */
export default function ArenaAccountHero({
  avatarIcon,
  avatarFrame,
  points,
  displayName,
  editingName,
  nameDraft,
  nameSaving,
  onNameDraftChange,
  onStartEditName,
  onSaveName,
  onCancelEditName,
}) {
  const tier = computeArenaTier(points);
  const progress = nextTierProgress(points);
  const currentVis = TIER_VISUAL[tier.id] || TIER_VISUAL.bronze;
  const pct = progress.next ? Math.round(progress.progress * 100) : 100;

  return (
    <div className={`arena-hero arena-hero--${currentVis.ring}`}>
      <div className="arena-hero__glow" aria-hidden />
      <div className="arena-hero__shine" aria-hidden />

      <div className="arena-hero__badge-wrap">
        <ArenaBadge
          icon={avatarIcon}
          frame={avatarFrame}
          points={points}
          size={80}
          showMeta={false}
        />
      </div>

      {editingName ? (
        <div className="arena-hero__name-edit">
          <input
            type="text"
            className="inp"
            maxLength={80}
            value={nameDraft}
            onChange={(e) => onNameDraftChange(e.target.value)}
            placeholder="اسمك في الساحة"
            disabled={nameSaving}
          />
          <div className="account-name-edit__actions">
            <button type="button" className="btn bg bsm" disabled={nameSaving} onClick={onSaveName}>
              {nameSaving ? '⏳' : 'حفظ'}
            </button>
            <button type="button" className="btn bgh bsm" disabled={nameSaving} onClick={onCancelEditName}>
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <>
          <h2 className="arena-hero__name">{displayName}</h2>
          <div className={`arena-hero__tier-pill arena-hero__tier-pill--${currentVis.ring}`}>
            <span className="arena-hero__tier-pill-icon">{tierRewardIcon(tier.id)}</span>
            <span>مستوى {tier.label}</span>
          </div>
        </>
      )}

      <div className="arena-hero__pts">
        <span className="arena-hero__pts-num">{fmt(points)}</span>
        <span className="arena-hero__pts-lbl">نقاط</span>
      </div>

      {progress.next ? (
        <div className="arena-hero__quest">
          <div className="arena-hero__quest-ends">
            <div className={`arena-hero__quest-node arena-hero__quest-node--now arena-hero__quest-node--${currentVis.ring}`}>
              <span className="arena-hero__quest-node-icon">{tierRewardIcon(tier.id)}</span>
              <span>{tier.label}</span>
              <span className="arena-hero__quest-node-tag">أنت هنا</span>
            </div>
            <div className="arena-hero__quest-track">
              <div className="arena-hero__quest-bar">
                <div className="arena-hero__quest-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="arena-hero__quest-pct">{pct}%</span>
            </div>
            <div className={`arena-hero__quest-node arena-hero__quest-node--next arena-hero__quest-node--${progress.next.id}`}>
              <span className="arena-hero__quest-node-icon">{tierRewardIcon(progress.next.id)}</span>
              <span>{progress.next.label}</span>
              <span className="arena-hero__quest-node-tag arena-hero__quest-node-tag--goal">الهدف</span>
            </div>
          </div>
          <p className="arena-hero__quest-msg">
            <strong>{fmt(progress.remaining)}</strong> نقطة للترقية إلى{' '}
            <strong>{progress.next.label}</strong>
          </p>
        </div>
      ) : (
        <div className="arena-hero__max">
          <span className="arena-hero__max-icon">🏆</span>
          <span>وصلت قمة الساحة — {tier.label}</span>
        </div>
      )}

      {!editingName ? (
        <button type="button" className="arena-hero__edit-name" onClick={onStartEditName}>
          ✏️ تعديل الاسم
        </button>
      ) : null}
    </div>
  );
}
