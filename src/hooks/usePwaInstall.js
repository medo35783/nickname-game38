import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getPwaBannerVariant,
  isAndroidDevice,
  isIosDevice,
  isMobileDevice,
  isPwaInstalledPersisted,
  isPwaStandalone,
  markPwaInstalledPersisted,
} from '../core/pwaInstall';

export function usePwaInstall() {
  const deferredRef = useRef(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(
    () => isPwaStandalone() || isPwaInstalledPersisted(),
  );
  const [isIos, setIsIos] = useState(() => isIosDevice());
  const [isAndroid, setIsAndroid] = useState(() => isAndroidDevice());
  const [isMobile, setIsMobile] = useState(() => isMobileDevice());
  const [installing, setInstalling] = useState(false);
  const [bannerVariant, setBannerVariant] = useState(() => getPwaBannerVariant());

  useEffect(() => {
    setIsIos(isIosDevice());
    setIsAndroid(isAndroidDevice());
    setIsMobile(isMobileDevice());
    setBannerVariant(getPwaBannerVariant());
    setIsInstalled(isPwaStandalone() || isPwaInstalledPersisted());

    const onBeforeInstall = (event) => {
      event.preventDefault();
      deferredRef.current = event;
      setCanInstall(true);
    };

    const onInstalled = () => {
      deferredRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
      markPwaInstalledPersisted();
    };

    const onDisplayModeChange = () => {
      if (isPwaStandalone()) {
        setIsInstalled(true);
        markPwaInstalledPersisted();
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      mq.removeEventListener('change', onDisplayModeChange);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredRef.current;
    if (!prompt) return { ok: false, reason: 'no-prompt' };

    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      deferredRef.current = null;
      setCanInstall(false);
      if (outcome === 'accepted') {
        setIsInstalled(true);
        markPwaInstalledPersisted();
      }
      return { ok: outcome === 'accepted', reason: outcome };
    } catch {
      return { ok: false, reason: 'error' };
    } finally {
      setInstalling(false);
    }
  }, []);

  const showCard = !isInstalled && isMobile;
  const showBanner =
    !isInstalled &&
    isMobile &&
    bannerVariant !== 'other';

  return {
    canInstall,
    isInstalled,
    isIos,
    isAndroid,
    isMobile,
    installing,
    install,
    showCard,
    showBanner,
    bannerVariant,
  };
}
