import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Centralized haptic vocabulary (Plasma One-style: subtle, everywhere it
 * confirms a user action, never decorative). All helpers are fire-and-forget
 * and swallow errors — devices without a haptic engine, the iOS Simulator and
 * web are silent no-ops, so callers never need to guard.
 *
 * Vocabulary:
 *  - tap      — light impact: primary/secondary button presses
 *  - press    — medium impact: physical-feeling interactions (card flip)
 *  - select   — selection tick: segmented controls, tab switches, copy
 *  - success  — notification: deposit confirmed, login verified, card active
 *  - warning  — notification: user backed out / recoverable issue
 *  - error    — notification: failed action
 */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function fire(action: () => Promise<void>): void {
  if (!enabled) return;
  action().catch(() => {
    // Haptics are best-effort; never surface a failure.
  });
}

export const haptics = {
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  press: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  select: () => fire(() => Haptics.selectionAsync()),
  success: () =>
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () =>
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () =>
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
