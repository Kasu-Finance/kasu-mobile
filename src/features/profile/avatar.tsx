import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';

/**
 * Round brand avatar showing the user's initial. Shared by the Home header
 * (small) and the profile screen (large). Solid brass — the initial comes from
 * {@link useIdentity}.
 */
export function Avatar({
  initial,
  size = 40,
  style,
}: {
  initial: string;
  size?: number;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: ACCENT },
        style,
      ]}>
      <Text style={{ color: theme.onAccent, fontSize: size * 0.42, fontWeight: '700' }}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
