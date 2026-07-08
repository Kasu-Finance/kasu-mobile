import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

interface Currency {
  code: string;
  name: string;
  flag: string;
  rails: string[];
}

/** Currencies + local rails (Plasma's list). The first rail drives the form. */
const CURRENCIES: Currency[] = [
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷', rails: ['PIX'] },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', rails: ['ACH', 'Wire'] },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽', rails: ['SPEI'] },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧', rails: ['FPS'] },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', rails: ['SEPA'] },
];

/** Fields per rail (what a real Bridge payout would collect). */
const RAIL_FIELDS: Record<string, { label: string; placeholder: string }[]> = {
  SEPA: [
    { label: 'IBAN', placeholder: 'IBAN' },
    { label: 'BIC', placeholder: 'BIC (optional)' },
    { label: 'Recipient name', placeholder: 'Recipient name' },
  ],
  ACH: [
    { label: 'Account number', placeholder: 'Account number' },
    { label: 'Routing number', placeholder: 'Routing number' },
    { label: 'Recipient name', placeholder: 'Recipient name' },
  ],
  FPS: [
    { label: 'Account number', placeholder: 'Account number' },
    { label: 'Sort code', placeholder: 'Sort code' },
    { label: 'Recipient name', placeholder: 'Recipient name' },
  ],
  SPEI: [
    { label: 'CLABE', placeholder: 'CLABE (18 digits)' },
    { label: 'Recipient name', placeholder: 'Recipient name' },
  ],
  PIX: [
    { label: 'PIX key', placeholder: 'PIX key' },
    { label: 'Recipient name', placeholder: 'Recipient name' },
  ],
};

/**
 * Send to a bank account — Plasma One's flow (currency → rail form) as a
 * PREVIEW. The real payout is a Bridge off-ramp (not integrated), so a banner
 * says so and "Send Funds" / "Save for Later" are disabled. Reached from Send →
 * Bank account.
 */
export default function SendBankScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [currency, setCurrency] = useState<Currency | null>(null);

  const back = () => {
    if (currency) {
      setCurrency(null);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const rail = currency?.rails[0] ?? '';
  const fields = RAIL_FIELDS[rail] ?? RAIL_FIELDS.SEPA;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={back}
          style={[styles.backBtn, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView name="chevron.left" size={18} tintColor={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">
          {currency ? `${rail} Transfer` : 'Currency'}
        </ThemedText>
        <View style={styles.backBtn} />
      </View>

      <Card style={[styles.banner, { borderColor: ACCENT }]}>
        <SymbolView name="building.columns.fill" size={20} tintColor={ACCENT} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.bannerText}>
          Bank payouts are coming soon — powered by Bridge. This is a preview.
        </ThemedText>
      </Card>

      {currency ? (
        <TransferForm
          currency={currency}
          fields={fields}
        />
      ) : (
        <Card style={styles.list}>
          {CURRENCIES.map((c, i) => (
            <View key={c.code}>
              {i > 0 ? (
                <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptics.select();
                  setCurrency(c);
                }}
                style={styles.currencyRow}>
                <ThemedText style={styles.flag}>{c.flag}</ThemedText>
                <View style={styles.currencyText}>
                  <ThemedText type="smallBold">{c.name}</ThemedText>
                  <View style={styles.railRow}>
                    {c.rails.map((r) => (
                      <View
                        key={r}
                        style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
                        <ThemedText type="small" themeColor="textSecondary" style={styles.chipText}>
                          {r}
                        </ThemedText>
                      </View>
                    ))}
                    <View style={[styles.chip, styles.freeChip]}>
                      <ThemedText type="small" style={styles.freeText}>
                        Free
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <SymbolView name="chevron.right" size={16} tintColor={theme.textSecondary} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function TransferForm({
  currency,
  fields,
}: {
  currency: Currency;
  fields: { label: string; placeholder: string }[];
}) {
  const theme = useTheme();
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.form}>
      <View style={styles.formFields}>
        {fields.map((f) => (
          <View key={f.label} style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              {f.label}
            </ThemedText>
            <TextInput
              value={values[f.label] ?? ''}
              onChangeText={(t) => setValues((v) => ({ ...v, [f.label]: t }))}
              placeholder={f.placeholder}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            />
          </View>
        ))}
        <ThemedText type="small" themeColor="textSecondary" style={styles.formNote}>
          Sending {currency.name} to a bank account will be available once our
          bank payout partner (Bridge) is live.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Button title="Save for later" variant="secondary" disabled style={styles.actionBtn} />
        <Button title="Send funds" disabled style={styles.actionBtn} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  bannerText: { flex: 1 },
  list: { paddingVertical: 4, gap: 0 },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  flag: { fontSize: 28 },
  currencyText: { flex: 1, gap: 4 },
  railRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  chipText: { fontSize: 12 },
  freeChip: { backgroundColor: 'rgba(210,158,97,0.18)' },
  freeText: { color: ACCENT, fontSize: 12, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth },
  form: { flex: 1, gap: 16 },
  formFields: { gap: 14 },
  field: { gap: 6 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  formNote: { paddingHorizontal: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 'auto' },
  actionBtn: { flex: 1 },
});
