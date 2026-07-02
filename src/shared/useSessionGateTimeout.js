import { useEffect } from 'react';

const DEFAULT_MS = 10000;

/** يمنع شاشة «جاري التحقق» من التعليق إذا تعذّر الاتصال بـ Firebase */
export function useSessionGateTimeout(sessionGate, setSessionGate, ms = DEFAULT_MS) {
  useEffect(() => {
    if (sessionGate !== 'checking') return undefined;
    const t = setTimeout(() => setSessionGate('ready'), ms);
    return () => clearTimeout(t);
  }, [sessionGate, setSessionGate, ms]);
}
