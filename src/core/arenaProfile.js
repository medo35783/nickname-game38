import { updateProfile } from 'firebase/auth';
import { ref, get, set, update, push } from 'firebase/database';
import { auth, db } from '../firebase';
import {
  ARENA_DEFAULT_ICON,
  ARENA_WELCOME_BONUS,
  computeArenaTier,
  iconsUnlockedForPoints,
} from './arena.constants';
import { detectNewAchievements, didTierUpgrade } from './arenaAchievements';
import { saveUsedQuestionIds } from '../games/fameeri/fameeriBankProgress';
import { saveUsedHesbahQuestionIds } from '../games/hesbah/hesbahBankProgress';

const LOCAL_BANK_KEYS = [
  { storageKey: 'ng_qumairi_bank_used', saveFn: saveUsedQuestionIds },
  { storageKey: 'ng_hesbah_bank_used', saveFn: saveUsedHesbahQuestionIds },
];

/** عدد الأسئلة المسجّلة محلياً (ضيف — هذا الجهاز فقط) */
export function countLocalSavedQuestions() {
  if (typeof localStorage === 'undefined') return 0;
  let total = 0;
  for (const { storageKey } of LOCAL_BANK_KEYS) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (Array.isArray(data.usedIds)) total += data.usedIds.length;
    } catch {
      /* ignore */
    }
  }
  return total;
}

/** حساب مسجّل ببريد */
export function isArenaRegisteredUser(user = auth.currentUser) {
  return !!(user?.uid && !user.isAnonymous && user.email);
}

/** حقول الشارة تُرفق ببيانات اللاعب عند الانضمام */
export async function fetchArenaFieldsForJoin() {
  const user = auth.currentUser;
  if (!isArenaRegisteredUser(user)) return {};

  try {
    if (typeof auth.authStateReady === 'function') await auth.authStateReady();
    const snap = await get(ref(db, `users/${user.uid}/profile`));
    const p = snap.val() || {};
    const points = Number(p.arenaPoints) || 0;
    const tier = computeArenaTier(points);
    return {
      arenaUid: user.uid,
      arenaIcon: p.avatarIcon || ARENA_DEFAULT_ICON,
      arenaFrame: p.avatarFrame || tier.frame,
      arenaName: (p.displayName || user.displayName || '').trim().slice(0, 80),
    };
  } catch {
    return { arenaUid: user.uid, arenaIcon: ARENA_DEFAULT_ICON, arenaFrame: 'bronze' };
  }
}

function buildDefaultArenaFields(displayName = '') {
  const tier = computeArenaTier(ARENA_WELCOME_BONUS);
  return {
    avatarIcon: ARENA_DEFAULT_ICON,
    avatarFrame: tier.frame,
    arenaPoints: ARENA_WELCOME_BONUS,
    tier: tier.id,
    tierLabel: tier.label,
    badges: ['عضو الساحة'],
    achievements: ['member'],
    welcomeBonusClaimed: true,
    displayName: displayName.slice(0, 80),
  };
}

/** نقل سجل الأسئلة المحلي إلى Firebase عند أول تسجيل */
async function migrateLocalBankDataToCloud(uid) {
  if (!uid || typeof localStorage === 'undefined') return;

  for (const { storageKey, saveFn } of LOCAL_BANK_KEYS) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const filterKey = data?.filterKey;
      const usedIds = Array.isArray(data.usedIds) ? data.usedIds : [];
      if (!filterKey || !usedIds.length) continue;
      await saveFn(filterKey, usedIds);
    } catch {
      /* ignore */
    }
  }
}

/**
 * إنشاء/تحديث شارة الساحة — يُستدعى بعد تسجيل الدخول بالبريد
 */
export async function ensureArenaProfile(userId, userLike = {}) {
  const email = (userLike?.email || '').trim();
  if (!email || !userId) return null;

  const profileRef = ref(db, `users/${userId}/profile`);
  const snap = await get(profileRef);
  const now = Date.now();
  const displayName = (userLike?.displayName || '').trim().slice(0, 80);

  if (!snap.exists()) {
    const arena = buildDefaultArenaFields(displayName);
    await set(profileRef, {
      email,
      displayName: arena.displayName,
      createdAt: now,
      lastLoginAt: now,
      totalLogins: 1,
      gamesHosted: 0,
      ...arena,
    });
    await migrateLocalBankDataToCloud(userId);
    await logArenaEvent(userId, {
      type: 'welcome_bonus',
      points: ARENA_WELCOME_BONUS,
      ts: now,
    });
    return { ...arena, isNewArenaProfile: true };
  }

  const prev = snap.val() || {};
  const points = Number(prev.arenaPoints) || 0;
  const tier = computeArenaTier(points);
  const patch = {
    email,
    lastLoginAt: now,
    totalLogins: (Number(prev.totalLogins) || 0) + 1,
    displayName: displayName || prev.displayName || '',
    gamesHosted: Number(prev.gamesHosted) || 0,
    createdAt: prev.createdAt || now,
  };

  if (prev.arenaPoints == null) {
    const arena = buildDefaultArenaFields(patch.displayName);
    Object.assign(patch, arena);
    await migrateLocalBankDataToCloud(userId);
    await logArenaEvent(userId, {
      type: 'welcome_bonus',
      points: ARENA_WELCOME_BONUS,
      ts: now,
    });
    return { ...patch, isNewArenaProfile: true };
  }

  {
    patch.avatarIcon = prev.avatarIcon || ARENA_DEFAULT_ICON;
    patch.avatarFrame = tier.frame;
    patch.arenaPoints = points;
    patch.tier = tier.id;
    patch.tierLabel = tier.label;
    patch.badges = Array.isArray(prev.badges) ? prev.badges : ['عضو الساحة'];
    patch.achievements = Array.isArray(prev.achievements)
      ? prev.achievements
      : prev.badges?.includes('عضو الساحة')
        ? ['member']
        : [];
    patch.welcomeBonusClaimed = prev.welcomeBonusClaimed !== false;
  }

  await update(profileRef, patch);
  return { ...patch, isNewArenaProfile: false };
}

/** تحديث اسم العرض في الشارة + Firebase Auth */
export async function updateArenaDisplayName(userId, name) {
  const trimmed = String(name || '').trim().slice(0, 80);
  if (!userId || !trimmed) return false;

  await update(ref(db, `users/${userId}/profile`), { displayName: trimmed });

  if (auth.currentUser?.uid === userId) {
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });
    } catch {
      /* ignore */
    }
  }
  return true;
}

export async function updateArenaAvatarIcon(userId, icon) {
  if (!userId || !icon) return false;
  const profileRef = ref(db, `users/${userId}/profile`);
  const snap = await get(profileRef);
  if (!snap.exists()) return false;
  const prev = snap.val() || {};
  const points = Number(prev.arenaPoints) || 0;
  const allowed = iconsUnlockedForPoints(points);
  if (!allowed.includes(icon)) return false;
  await update(profileRef, { avatarIcon: icon });
  return true;
}

/** دمج إنجازات جديدة في الملف */
export async function grantArenaAchievements(userId, achievementIds = []) {
  const ids = [...new Set(achievementIds)].filter(Boolean);
  if (!userId || !ids.length) return [];

  const profileRef = ref(db, `users/${userId}/profile`);
  const snap = await get(profileRef);
  if (!snap.exists()) return [];

  const prev = snap.val() || {};
  const existing = Array.isArray(prev.achievements) ? prev.achievements : [];
  const toAdd = ids.filter((id) => !existing.includes(id));
  if (!toAdd.length) return [];

  await update(profileRef, { achievements: [...existing, ...toAdd] });
  return toAdd;
}

/**
 * منح نقاط الساحة + ترقية مستوى + إنجازات
 * @returns {Promise<{ pointsAwarded: number, tierUpgraded: boolean, previousTier: string, newTier: string, newTierLabel: string, newAchievements: string[], totalPoints: number } | null>}
 */
export async function awardArenaPoints(userId, points, meta = {}) {
  const pts = Number(points);
  if (!userId || !Number.isFinite(pts) || pts <= 0) return null;

  const profileRef = ref(db, `users/${userId}/profile`);
  const snap = await get(profileRef);
  if (!snap.exists()) return null;

  const prev = snap.val() || {};
  const prevTier = prev.tier || 'bronze';
  const nextPoints = (Number(prev.arenaPoints) || 0) + pts;
  const tier = computeArenaTier(nextPoints);
  const gamesHosted =
    meta.type === 'host_complete'
      ? (Number(prev.gamesHosted) || 0) + 1
      : Number(prev.gamesHosted) || 0;

  const nextState = {
    arenaPoints: nextPoints,
    tier: tier.id,
    tierLabel: tier.label,
    avatarFrame: tier.frame,
    gamesHosted,
  };

  const newAchievementIds = detectNewAchievements(prev, { ...prev, ...nextState }, meta);
  const existingAchievements = Array.isArray(prev.achievements) ? prev.achievements : [];
  const mergedAchievements = [...new Set([...existingAchievements, ...newAchievementIds])];

  await update(profileRef, {
    ...nextState,
    achievements: mergedAchievements,
  });

  await logArenaEvent(userId, {
    type: meta.type || 'points',
    points: pts,
    gameType: meta.gameType || null,
    roomCode: meta.roomCode || null,
    rank: meta.rank ?? null,
    ts: Date.now(),
  });

  const tierUpgraded = didTierUpgrade(prevTier, tier.id);

  return {
    pointsAwarded: pts,
    tierUpgraded,
    previousTier: prevTier,
    newTier: tier.id,
    newTierLabel: tier.label,
    newAchievements: newAchievementIds,
    totalPoints: nextPoints,
    displayName: prev.displayName || '',
    avatarIcon: prev.avatarIcon || ARENA_DEFAULT_ICON,
  };
}

async function logArenaEvent(userId, event) {
  try {
    await push(ref(db, `users/${userId}/arenaLog`), event);
  } catch {
    /* ignore */
  }
}
