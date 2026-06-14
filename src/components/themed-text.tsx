import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const isLink = type === 'linkPrimary';

  return (
    <Text
      style={[
        { color: theme[themeColor ?? (isLink ? 'primary' : 'text')] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  // Headings — Crimson Text serif (the brand signature).
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 48,
    lineHeight: 52,
  },
  subtitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 32,
    lineHeight: 40,
  },
  // Body / UI — DM Sans.
  default: {
    fontFamily: Fonts.sansMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  small: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    fontFamily: Fonts.sansMedium,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Fonts.sansSemiBold,
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
