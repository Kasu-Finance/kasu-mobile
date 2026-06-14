import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

import { ACCENT } from '@/components/ui/theme-extras';
import { DEFAULT_RAIL, RAILS, type RailDef, type RailKey } from './rails';
import { useAddBankAccount, useBankAccounts } from './use-bank-accounts';
import type { WayexExternalAccount } from './types';

/**
 * List of registered bank accounts + an inline form to add one. Reused by the
 * `bank-accounts` route and embedded in the on/off-ramp flows when the user
 * has no account yet.
 *
 * `enabled` gates the list query on session presence. `onAccountAdded` lets
 * callers (e.g. add-funds, off-ramp) react when the first account lands.
 */
export function BankAccounts({
  enabled,
  onAccountAdded,
}: {
  enabled: boolean;
  onAccountAdded?: (accountId: string) => void;
}) {
  const theme = useTheme();
  const accountsQuery = useBankAccounts(enabled);
  const [showForm, setShowForm] = useState(false);

  const accounts = accountsQuery.data ?? [];

  return (
    <View style={styles.section}>
      <View style={styles.rowBetween}>
        <ThemedText type="smallBold">Bank accounts</ThemedText>
        {!showForm && (
          <Pressable onPress={() => setShowForm(true)} accessibilityRole="button">
            <ThemedText type="small" style={{ color: ACCENT }}>
              + Add
            </ThemedText>
          </Pressable>
        )}
      </View>

      {accountsQuery.isLoading && enabled && (
        <ActivityIndicator color={theme.text} />
      )}

      {enabled && !accountsQuery.isLoading && accounts.length === 0 && !showForm && (
        <ThemedText type="small" themeColor="textSecondary">
          No bank accounts yet. Add one to withdraw to your bank.
        </ThemedText>
      )}

      {accounts.map((account) => (
        <BankAccountRow key={account.id} account={account} />
      ))}

      {showForm && (
        <AddBankAccountForm
          onCancel={() => setShowForm(false)}
          onAdded={(id) => {
            setShowForm(false);
            onAccountAdded?.(id);
          }}
        />
      )}
    </View>
  );
}

function BankAccountRow({ account }: { account: WayexExternalAccount }) {
  return (
    <Card>
      <ThemedText type="smallBold">{account.nickname || account.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {account.asset} · {account.networks.join(', ')} · ••••{account.preview}
      </ThemedText>
    </Card>
  );
}

function AddBankAccountForm({
  onCancel,
  onAdded,
}: {
  onCancel: () => void;
  onAdded: (accountId: string) => void;
}) {
  const theme = useTheme();
  const [railKey] = useState<RailKey>(DEFAULT_RAIL);
  const rail = useMemo<RailDef>(
    () => RAILS.find((r) => r.key === railKey)!,
    [railKey],
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const addAccount = useAddBankAccount();

  const setField = (name: string, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));

  const handleSubmit = async () => {
    // Validate every field: required, then rail-specific.
    for (const field of rail.fields) {
      const value = (values[field.name] ?? '').trim();
      if (!value) {
        Alert.alert('Missing fields', `Please fill in ${field.label}.`);
        return;
      }
      const error = field.validate?.(value);
      if (error) {
        Alert.alert(`Check ${field.label}`, error);
        return;
      }
    }
    const trimmed = Object.fromEntries(
      rail.fields.map((f) => [f.name, (values[f.name] ?? '').trim()]),
    ) as Record<string, string>;

    try {
      const res = await addAccount.mutateAsync({
        asset: rail.asset,
        network: rail.network,
        nickname: `${trimmed.bankName} · ${trimmed.accountNumber.slice(-4)}`,
        ...rail.buildDetails(trimmed),
      });
      onAdded(res.id);
    } catch (err) {
      Alert.alert(
        'Could not register account',
        err instanceof Error ? err.message : 'Unknown error.',
      );
    }
  };

  return (
    <Card style={styles.form}>
      <ThemedText type="smallBold">{rail.label}</ThemedText>
      {rail.fields.map((field) =>
        field.options ? (
          <View key={field.name} style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              {field.label}
            </ThemedText>
            <View style={styles.chips}>
              {field.options.map((opt) => {
                const selected = values[field.name] === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="button"
                    onPress={() => setField(field.name, opt.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? ACCENT
                          : theme.backgroundSelected,
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: selected ? '#241a0c' : theme.text }}>
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View key={field.name} style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              {field.label}
            </ThemedText>
            <TextInput
              value={values[field.name] ?? ''}
              onChangeText={(t) => setField(field.name, t)}
              placeholder={field.placeholder}
              placeholderTextColor={theme.textSecondary}
              keyboardType={field.numeric ? 'numeric' : 'default'}
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            />
          </View>
        ),
      )}
      <Button
        title="Register account"
        loading={addAccount.isPending}
        onPress={handleSubmit}
      />
      <Button title="Cancel" variant="ghost" onPress={onCancel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  form: { gap: 12 },
  field: { gap: 6 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
});
