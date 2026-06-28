import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';

/**
 * مزامنة Custom Claim admin=true بعد التحقق من RTDB
 * @returns {Promise<boolean>}
 */
export async function refreshAdminClaim() {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const fn = httpsCallable(functions, 'syncAdminClaim');
    const { data } = await fn();
    if (data?.refreshed) {
      await user.getIdToken(true);
    }
    return data?.admin === true;
  } catch (e) {
    console.warn('syncAdminClaim:', e?.code || e);
    return false;
  }
}
