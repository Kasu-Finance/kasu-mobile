import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Local notification preferences (Plasma-style settings). `enabled` is the
 * master push toggle (gates device registration in `useRegisterPush`); the rest
 * are per-category. Persisted in AsyncStorage.
 *
 * NOTE: category toggles are stored + used to filter the in-app feed, but the
 * backend dispatcher does not yet read them — full per-category push gating
 * (esp. background) needs the prefs synced server-side (planned).
 */
export interface NotifPrefs {
  /** Master: receive push notifications at all. */
  enabled: boolean;
  /** Purchases and card activity (Immersve). */
  card: boolean;
  /** Deposits and transfers (on-chain). */
  money: boolean;
  /** Weekly interest and cashback. */
  rewards: boolean;
  /** New features and improvements. */
  product: boolean;
}

export const DEFAULT_PREFS: NotifPrefs = {
  enabled: true,
  card: true,
  money: true,
  rewards: true,
  product: true,
};

const STORAGE_KEY = '@kasu/notification-prefs';

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) });
        }
      } catch {
        // Corrupt/absent — keep defaults.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPref = useCallback((key: keyof NotifPrefs, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { prefs, setPref, ready };
}
