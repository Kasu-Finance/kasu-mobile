import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatApy } from '@/lib/format';

import { useStrategies } from './use-strategies';

/** Illustration principal for the earnings simulator line. */
const SIM_PRINCIPAL = 10_000;

/**
 * Plasma One-style Earn header: the live headline rate (best Net APY across
 * strategies — real data), a plain-dollars earnings simulator, and the weekly
 * payout framing. Sits above the strategies list on the Earn tab.
 */
export function EarnHeader() {
  const theme = useTheme();
  const { data: strategies } = useStrategies();

  const apys = (strategies ?? [])
    .map((s) => s.apy)
    .filter((a): a is number => typeof a === 'number' && a > 0);
  const maxApy = apys.length ? Math.max(...apys) : null;
  const perYear = maxApy != null ? Math.round(SIM_PRINCIPAL * maxApy) : null;

  return (
    <Card style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        EARN UP TO
      </ThemedText>
      <View style={styles.rateRow}>
        <Text style={[styles.rate, { color: theme.primary }]}>
          {maxApy != null ? formatApy(maxApy) : '—'}
        </Text>
        <ThemedText type="small" themeColor="textSecondary" style={styles.perYear}>
          per year
        </ThemedText>
      </View>

      {perYear != null ? (
        <ThemedText type="small" themeColor="textSecondary">
          ${SIM_PRINCIPAL.toLocaleString()} could earn you about{' '}
          <ThemedText type="smallBold">${perYear.toLocaleString()}</ThemedText> a
          year — interest lands every Thursday.
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Interest lands every Thursday.
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  rateRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rate: { fontFamily: Fonts.serifBold, fontSize: 44, lineHeight: 48 },
  perYear: { paddingBottom: 4 },
});
