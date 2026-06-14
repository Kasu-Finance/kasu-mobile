import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { ACCENT } from './theme-extras';

export interface SegmentedOption {
  key: string;
  label: string;
}

/** Minimal segmented control for switching between two feature views in a tab. */
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="button"
            onPress={() => onChange(opt.key)}
            style={[styles.item, active && { backgroundColor: ACCENT }]}>
            <Text
              style={[
                styles.label,
                { color: active ? '#1a1208' : theme.textSecondary },
              ]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  item: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600' },
});
