import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Brand button. Primary is a brass pill (the web's `rounded-full` CTA);
 * secondary is an outlined brass pill; ghost is a bordered neutral pill.
 */
export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bg = variant === 'primary' ? theme.primary : 'transparent';
  const fg =
    variant === 'primary'
      ? theme.onAccent
      : variant === 'secondary'
        ? theme.primary
        : theme.text;
  const borderColor =
    variant === 'secondary' ? theme.primary : variant === 'ghost' ? theme.border : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.label, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
  },
});
