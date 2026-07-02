import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

export interface SegmentedOption {
  key: string;
  label: string;
  /** Optional leading icon (e.g. a flag or token logo), rendered before the label. */
  icon?: ReactNode;
}

/** Minimal segmented control for switching between two or more views. */
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
            onPress={() => {
              if (opt.key !== value) haptics.select();
              onChange(opt.key);
            }}
            style={[styles.item, active && { backgroundColor: theme.primary }]}>
            {opt.icon ? <View style={styles.icon}>{opt.icon}</View> : null}
            <Text
              style={[
                styles.label,
                { color: active ? theme.onAccent : theme.textSecondary },
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
  item: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  icon: { alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Fonts.sansSemiBold, fontSize: 14 },
});
