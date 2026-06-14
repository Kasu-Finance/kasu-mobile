/**
 * Kasu brand theme tokens — ported from the web design system
 * (`kasu-ui/src/app/globals.css`). The app is **dark-only**: `Colors.light` and
 * `Colors.dark` are intentionally identical so any consumer that keys off the
 * system scheme still renders the brand dark palette.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** Brand palette (brass on near-black). Single source of truth. */
const Brand = {
  // Surfaces
  background: '#1f1f24',
  backgroundElement: '#2b2b30', // = card
  backgroundSelected: '#37373d', // = card elevated
  card: '#2b2b30',
  cardElevated: '#37373d',
  border: 'rgba(255,255,255,0.06)',
  // Text
  text: '#ebebef',
  textSecondary: '#7d7d83',
  // Brass accent
  primary: '#d29e61',
  primaryHover: '#e0b98b',
  primaryPressed: '#a68057',
  onAccent: '#241a0c', // text/glyphs on a brass fill
  // Status
  success: '#84a45f',
  successSoft: 'rgba(132,164,95,0.15)',
  destructive: '#e4645a',
  destructiveSoft: 'rgba(228,100,90,0.15)',
} as const;

export const Colors = {
  light: Brand,
  dark: Brand,
} as const;

export type ThemeColor = keyof typeof Brand;

/**
 * Bundled brand fonts (loaded in the root layout via `expo-font`). Custom fonts
 * ignore `fontWeight`, so each weight is its own family. **Crimson Text** (serif)
 * carries headings — the brand's signature; **DM Sans** carries body/UI.
 */
export const Fonts = {
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  serif: 'CrimsonText_400Regular',
  serifBold: 'CrimsonText_600SemiBold',
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Brand radii (web: cards 8–12, pills 999). */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
