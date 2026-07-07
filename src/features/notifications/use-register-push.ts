import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { api } from '@/lib/api/client';

import type { RegisterPushRequest, RegisterPushResponse } from './types';

/**
 * Android needs an explicit notification channel before any notification can be
 * displayed. `default` matches the channel id Expo's push service targets when
 * none is specified.
 */
const ANDROID_CHANNEL_ID = 'default';

/** Resolve the EAS project id Expo's push service attributes the token to. */
function getProjectId(): string | undefined {
  // `easConfig` is populated on EAS builds; `expoConfig.extra.eas.projectId`
  // mirrors `app.json` for local/dev clients. Prefer whichever is present.
  const fromExpoConfig = Constants.expoConfig?.extra?.eas?.projectId as
    | string
    | undefined;
  const fromEasConfig = Constants.easConfig?.projectId;
  return fromExpoConfig ?? fromEasConfig ?? undefined;
}

/** The platform string we report to the backend (`ios` | `android` | `web`). */
function resolvePlatform(): string {
  // `process.env.EXPO_OS` is inlined by Metro and is the cheapest source of
  // truth; fall back to the runtime `Platform.OS` when it isn't set.
  return process.env.EXPO_OS ?? Platform.OS;
}

export interface RegisterPushState {
  /** Whether a registration attempt is currently in flight. */
  isRegistering: boolean;
  /** True once the backend has acknowledged the token for this address. */
  registered: boolean;
  /** The Expo push token obtained, if any. */
  expoPushToken: string | null;
  /** Last error encountered (permission/token/network), if any. */
  error: Error | null;
}

/**
 * Registers this device's Expo push token with kasu-backend for the connected
 * wallet address.
 *
 * Behaviour:
 *  - Runs only once an `address` is available, and only on a physical device
 *    (push tokens are unavailable on simulators / Expo Go web).
 *  - Requests notification permission (no-op if already granted).
 *  - Sets up the Android notification channel.
 *  - Fetches the Expo push token using the EAS `projectId` (guarded if missing).
 *  - POSTs `{ userAddress, expoPushToken, platform }` to
 *    `/mobile/notifications/register-push`.
 *
 * Idempotent and a safe no-op when permission is denied or no `projectId` is
 * configured. Never throws — errors are captured into `error`.
 */
export function useRegisterPush(
  address: string | null,
  enabled = true,
): RegisterPushState {
  const [state, setState] = useState<RegisterPushState>({
    isRegistering: false,
    registered: false,
    expoPushToken: null,
    error: null,
  });

  // Guard against re-registering the same address repeatedly (the effect would
  // otherwise re-run on every render that produces a new state object).
  const registeredAddressRef = useRef<string | null>(null);

  useEffect(() => {
    // Master notifications toggle off → don't register this device.
    if (!address || !enabled) return;

    const normalized = address.toLowerCase();
    if (registeredAddressRef.current === normalized) return;

    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, isRegistering: true, error: null }));

      try {
        // Push tokens require a real device; bail gracefully otherwise.
        if (!Device.isDevice) {
          if (!cancelled) {
            setState((s) => ({ ...s, isRegistering: false }));
          }
          return;
        }

        // Android: ensure a channel exists before requesting permission/token.
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
            name: 'Default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        // Permission: only prompt if not already determined.
        const existing = await Notifications.getPermissionsAsync();
        let granted = existing.granted;
        if (!granted && existing.canAskAgain) {
          const requested = await Notifications.requestPermissionsAsync();
          granted = requested.granted;
        }
        if (!granted) {
          if (!cancelled) {
            setState((s) => ({ ...s, isRegistering: false }));
          }
          return;
        }

        // Need the EAS project id to mint an Expo push token.
        const projectId = getProjectId();
        if (!projectId) {
          if (!cancelled) {
            setState((s) => ({
              ...s,
              isRegistering: false,
              error: new Error(
                'Missing EAS projectId — set extra.eas.projectId in app.json to enable push.',
              ),
            }));
          }
          return;
        }

        const tokenResult = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        const expoPushToken = tokenResult.data;

        const body: RegisterPushRequest = {
          userAddress: address,
          expoPushToken,
          platform: resolvePlatform(),
        };
        const res = await api.post<RegisterPushResponse>(
          '/mobile/notifications/register-push',
          body,
        );

        if (cancelled) return;
        registeredAddressRef.current = normalized;
        setState({
          isRegistering: false,
          registered: Boolean(res.data?.registered),
          expoPushToken,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        // Degrade gracefully — never throw out of the effect.
        setState((s) => ({
          ...s,
          isRegistering: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, enabled]);

  return state;
}
