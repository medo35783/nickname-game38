import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { auth, db } from '../firebase';
import {
  countLocalSavedQuestions,
  isArenaRegisteredUser,
  updateArenaAvatarIcon,
  updateArenaDisplayName,
} from '../core/arenaProfile';
import { computeArenaTier, nextTierProgress } from '../core/arena.constants';

/**
 * ملف شارة الساحة — للهيدر وصفحة الحساب
 */
export default function useArenaProfile() {
  const [authUser, setAuthUser] = useState(() => auth.currentUser);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [localQuestionCount, setLocalQuestionCount] = useState(() => countLocalSavedQuestions());

  const isRegistered = isArenaRegisteredUser(authUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthUser(u);
      setLocalQuestionCount(countLocalSavedQuestions());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isRegistered || !authUser?.uid) {
      setProfile(null);
      setReady(true);
      return undefined;
    }

    setReady(false);
    const unsub = onValue(ref(db, `users/${authUser.uid}/profile`), (snap) => {
      setProfile(snap.val() || null);
      setReady(true);
    });
    return () => unsub();
  }, [authUser?.uid, isRegistered]);

  const refreshLocalCount = useCallback(() => {
    setLocalQuestionCount(countLocalSavedQuestions());
  }, []);

  const setAvatarIcon = useCallback(
    async (icon) => {
      if (!authUser?.uid) return false;
      return updateArenaAvatarIcon(authUser.uid, icon);
    },
    [authUser?.uid]
  );

  const setDisplayName = useCallback(
    async (name) => {
      if (!authUser?.uid) return false;
      return updateArenaDisplayName(authUser.uid, name);
    },
    [authUser?.uid]
  );

  const gamesHosted = Number(profile?.gamesHosted) || 0;

  const points = Number(profile?.arenaPoints) || 0;
  const tier = computeArenaTier(points);
  const tierProgress = nextTierProgress(points);
  const displayName =
    profile?.displayName?.trim() ||
    authUser?.displayName?.trim() ||
    authUser?.email?.split('@')?.[0] ||
    'محارب الساحة';
  const avatarIcon = profile?.avatarIcon || '🎮';
  const avatarFrame = profile?.avatarFrame || tier.frame;
  const achievements = Array.isArray(profile?.achievements)
    ? profile.achievements
    : profile?.badges?.includes('عضو الساحة')
      ? ['member']
      : [];

  return {
    authUser,
    profile,
    ready,
    isRegistered,
    isGuest: Boolean(authUser?.isAnonymous),
    localQuestionCount,
    refreshLocalCount,
    setAvatarIcon,
    setDisplayName,
    gamesHosted,
    displayName,
    avatarIcon,
    avatarFrame,
    points,
    tier,
    tierProgress,
    achievements,
  };
}
