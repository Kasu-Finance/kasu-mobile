import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';

/** Sample account details — a PREVIEW of the Bridge-issued account. Not live. */
const PREVIEW_DETAILS: { label: string; value: string }[] = [
  { label: 'Account holder', value: 'Kasu Payments' },
  { label: 'Account number', value: '•••• •••• 0000' },
  { label: 'Routing number', value: '••• ••• •••' },
  { label: 'Bank name', value: 'Assigned when live' },
  { label: 'Bank address', value: '—' },
];

const INFO: string[] = [
  'A personal USD account number, just for you',
  'From your own account: no limit',
  'Arrives within minutes — no fees',
];

/**
 * Bank transfer — Plasma One's account-details layout, as a PREVIEW. The real
 * thing (a personal account number you wire money to) comes with the Bridge
 * integration, so the details are placeholders, dimmed, with copy/share
 * disabled — nobody should send money to these. Reached from Add funds → Bank
 * transfer.
 */
export default function BankTransferScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.header}>
        <Button
          title="Close"
          variant="ghost"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.close}
        />
        <ThemedText type="subtitle">Bank transfer</ThemedText>
        <View style={styles.closeSpacer} />
      </View>

      {/* Coming-soon banner */}
      <Card style={[styles.banner, { borderColor: ACCENT }]}>
        <SymbolView name="building.columns.fill" size={22} tintColor={ACCENT} />
        <View style={styles.bannerText}>
          <ThemedText type="smallBold">Bank transfers are coming soon</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            We’re integrating Bridge to give you your own account number for
            adding money by bank transfer. Here’s a preview.
          </ThemedText>
        </View>
      </Card>

      {/* Preview account details (dimmed — not active) */}
      <View style={styles.previewWrap}>
        <Card style={styles.detailCard}>
          {PREVIEW_DETAILS.map((row, i) => (
            <View key={row.label}>
              {i > 0 ? (
                <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
              ) : null}
              <View style={styles.detailRow}>
                <View style={styles.detailText}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {row.label}
                  </ThemedText>
                  <ThemedText type="smallBold">{row.value}</ThemedText>
                </View>
                <SymbolView name="doc.on.doc" size={16} tintColor={theme.textSecondary} />
              </View>
            </View>
          ))}
        </Card>
        <View style={[styles.previewChip, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Preview
          </ThemedText>
        </View>
      </View>

      <View style={styles.info}>
        {INFO.map((line) => (
          <View key={line} style={styles.infoRow}>
            <ThemedText type="small" themeColor="textSecondary">
              •
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.infoLine}>
              {line}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button title="Copy details" disabled style={styles.actionBtn} />
        <Button title="Share" variant="secondary" disabled style={styles.actionBtn} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: { paddingHorizontal: 0 },
  closeSpacer: { width: 48 },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
  },
  bannerText: { flex: 1, gap: 3 },
  previewWrap: { position: 'relative', opacity: 0.55 },
  detailCard: { paddingVertical: 4, gap: 0 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  detailText: { gap: 2 },
  previewChip: {
    position: 'absolute',
    top: 10,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  divider: { height: StyleSheet.hairlineWidth },
  info: { gap: 8, paddingHorizontal: 4 },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoLine: { flex: 1 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 'auto' },
  actionBtn: { flex: 1 },
});
