/**
 * The app is dark-only (Kasu brand). This always returns the brand palette,
 * regardless of the device's light/dark setting.
 */

import { Colors } from '@/constants/theme';

export function useTheme() {
  return Colors.dark;
}
