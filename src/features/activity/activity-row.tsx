import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import type { ActivityItem, ActivityKind } from './types';

/** Positive (green) accent for inflows. Neutral amounts use the theme text. */
const POSITIVE = '#84a45f';

/** Per-kind dot colour + single-character glyph. */
const KIND_META: Record<ActivityKind, { color: string; glyph: string }> = {
  deposit: { color: '#84a45f', glyph: '↓' },
  yield: { color: '#d29e61', glyph: '✦' },
  withdrawal: { color: '#7d7d83', glyph: '↑' },
  cancellation: { color: '#7d7d83', glyph: '×' },
  spend: { color: '#7d7d83', glyph: '⌁' },
};

/**
 * One row in the activity feed: a leading coloured glyph dot, a title +
 * subtitle/date on the left, and a right-aligned signed amount.
 *
 * The row is a tappable summary — pressing it asks the parent (via `onPress`)
 * to open a bottom sheet with the full transaction detail. The row itself is
 * stateless; selection + sheet visibility live in `activity-screen.tsx`.
 */
export function ActivityRow({ item, onPress }: { item: ActivityItem; onPress: () => void }) {
  const theme = useTheme();
  const meta = KIND_META[item.kind];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.amount}. View details.`}
      onPress={onPress}
      style={styles.row}>
      <View style={[styles.dot, { backgroundColor: meta.color + '22' }]}>
        <Text style={[styles.glyph, { color: meta.color }]}>{meta.glyph}</Text>
      </View>

      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {item.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {item.subtitle} · {formatDate(item.timestamp)}
        </ThemedText>
      </View>

      <View style={styles.right}>
        <Text
          style={[
            styles.amount,
            { color: item.positive ? POSITIVE : theme.text },
          ]}>
          {item.amount}
        </Text>
        <View style={styles.statusLine}>
          <ThemedText type="small" themeColor="textSecondary">
            {item.status}
          </ThemedText>
          <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Unix-seconds → "Jun 12" (or "Jun 12, 2024" if not the current year). */
function formatDate(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString('en-US', opts);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  dot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 18, fontWeight: '700', lineHeight: 22 },
  body: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 15, fontWeight: '700' },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chevron: { fontSize: 16, fontWeight: '600' },
});
