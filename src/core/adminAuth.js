import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import { USE_CLOUD_ADMIN_CLAIM } from './securityMode';

/**
 * مزامنة Custom Claim admin=true بعد التحقق من RTDB
 * يعمل فقط في وضع blaze بعد نشر syncAdminClaim
 * @returns {Promise<boolean>}
 */
export async function refreshAdminClaim() {
  if (!USE_CLOUD_ADMIN_CLAIM) return false;

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
    if (import.meta.env.DEV) {
      console.warn('[admin] syncAdminClaim غير متاح — انشر functions أو استخدم المحاكي');
    }
    return false;
  }
}
