import type { Strategy, StrategyTranche } from '@kasufinance/kasu-sdk';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';
import { formatApy, formatUnits, formatUsd } from '@/lib/format';
import { useSdk } from '@/lib/sdk/use-sdk';
import { getChain } from '@/lib/web3/chains';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';
import { useViewAddress } from '@/lib/web3/use-view-address';
import { useStableBalance } from '@/lib/web3/use-balance';

import { parseFormattedMessage } from './lib/contract-types';
// DEMO: KYC is stubbed out for the read-only demo build (no signer to satisfy
// the real Nexera flow). Swap back to `@/features/kyc`'s `KycGate` for live use.
import { DemoKycGate as KycGate } from './lib/demo-kyc-gate';
import { DEPOSIT_STEP_LABELS, type DepositStepId, fmt } from './lib/deposit-step-copy';
import { useDeposit, type DepositPhase } from './use-deposit';

export interface DepositFlowProps {
  strategy: Strategy;
  /** Tapping done/close after success or backing out of the form. */
  onClose: () => void;
}

/**
 * Stepped deposit flow. Phases mirror `use-deposit`'s state machine:
 *   Form → (KYC gate) → Generate → Accept contract → Approve → Deposit → Done.
 *
 * The form lives outside the orchestrator (validated locally). Once the user
 * taps "Continue", `useDeposit().start()` drives the rest; this component just
 * renders the view matching the active phase.
 */
export function DepositFlow({ strategy, onClose }: DepositFlowProps) {
  const { chainId } = useSdk();
  const { signer, address } = useEthersSigner();
  const { isDemo } = useViewAddress();
  const stable = getChain(chainId).stableAsset;
  const balanceQuery = useStableBalance(address, chainId);

  const deposit = useDeposit();
  const { state } = deposit;

  // DEMO mode: read-only build with no connected signer. We can't execute the
  // real deposit tx, so the form's "Continue" leads to a local review +
  // confirmation step instead of the on-chain orchestrator.
  const demo = isDemo || !signer;

  // Form state — owned here, handed to the orchestrator on Continue.
  const [tranche, setTranche] = useState<StrategyTranche | null>(
    strategy.tranches[0] ?? null,
  );
  const [fixedTermConfigId, setFixedTermConfigId] = useState<string>('0');
  const [amount, setAmount] = useState('');
  // Local step for the demo (no-signer) path: form → review → confirmed.
  const [demoStep, setDemoStep] = useState<'form' | 'review' | 'confirmed'>('form');

  const selectedFixedTerm = tranche?.fixedTermOptions.find(
    (o) => o.configId === fixedTermConfigId,
  );

  // Reset the fixed-term selection if the user switches tranche.
  const onSelectTranche = (t: StrategyTranche) => {
    setTranche(t);
    setFixedTermConfigId('0');
  };

  const walletBalance = balanceQuery.data ?? '0';

  // ---- Demo (no-signer) path ----
  if (demo) {
    if (demoStep === 'confirmed') {
      return (
        <DepositConfirmed
          strategy={strategy}
          amount={amount}
          symbol={stable.symbol}
          onClose={onClose}
          demo
        />
      );
    }
    if (demoStep === 'review' && tranche) {
      return (
        <DepositReview
          strategy={strategy}
          tranche={tranche}
          amount={amount}
          symbol={stable.symbol}
          fixedTermLabel={
            selectedFixedTerm
              ? `${selectedFixedTerm.epochLockDuration}w · ${formatApy(selectedFixedTerm.apy)}`
              : 'Flexible'
          }
          apy={selectedFixedTerm ? selectedFixedTerm.apy : tranche.apy}
          onConfirm={() => setDemoStep('confirmed')}
          onBack={() => setDemoStep('form')}
        />
      );
    }
    return (
      <KycGate>
        <DepositForm
          strategy={strategy}
          tranche={tranche}
          onSelectTranche={onSelectTranche}
          fixedTermConfigId={fixedTermConfigId}
          onSelectFixedTerm={setFixedTermConfigId}
          amount={amount}
          onChangeAmount={setAmount}
          walletBalance={walletBalance}
          balanceLoading={balanceQuery.isLoading}
          skipBalanceCheck
          errorMessage={null}
          submitLabel="Review deposit"
          onSubmit={() => {
            if (!tranche) return;
            setDemoStep('review');
          }}
          onCancel={onClose}
        />
      </KycGate>
    );
  }

  // ---- Render by phase ----
  if (state.phase === 'success') {
    return <DepositConfirmed strategy={strategy} amount={amount} symbol={stable.symbol} onClose={onClose} />;
  }

  if (state.phase === 'awaiting-accept' || state.phase === 'accepting-sign') {
    return (
      <LoanContractStep
        message={state.contract?.contractMessage ?? ''}
        formatted={state.contract?.formattedMessage ?? ''}
        signing={state.phase === 'accepting-sign'}
        stepCurrent={state.stepCurrent}
        stepTotal={state.stepTotal}
        onAccept={deposit.acceptContract}
        onDecline={deposit.declineContract}
      />
    );
  }

  if (
    state.phase === 'generating-sign' ||
    state.phase === 'generating-fetch' ||
    state.phase === 'approve' ||
    state.phase === 'request-sign' ||
    state.phase === 'request-confirm'
  ) {
    return (
      <ProgressStep
        phase={state.phase}
        stepCurrent={state.stepCurrent}
        stepTotal={state.stepTotal}
        symbol={stable.symbol}
      />
    );
  }

  // 'idle' | 'error' | 'declined' → show the form (errors surface inline).
  return (
    <KycGate>
      <DepositForm
        strategy={strategy}
        tranche={tranche}
        onSelectTranche={onSelectTranche}
        fixedTermConfigId={fixedTermConfigId}
        onSelectFixedTerm={setFixedTermConfigId}
        amount={amount}
        onChangeAmount={setAmount}
        walletBalance={walletBalance}
        balanceLoading={balanceQuery.isLoading}
        errorMessage={state.phase === 'error' ? state.errorMessage : null}
        onSubmit={() => {
          if (!tranche) return;
          void deposit.start({ strategy, tranche, amount, fixedTermConfigId });
        }}
        onCancel={onClose}
      />
    </KycGate>
  );
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function DepositForm({
  strategy,
  tranche,
  onSelectTranche,
  fixedTermConfigId,
  onSelectFixedTerm,
  amount,
  onChangeAmount,
  walletBalance,
  balanceLoading,
  skipBalanceCheck = false,
  errorMessage,
  submitLabel = 'Continue',
  onSubmit,
  onCancel,
}: {
  strategy: Strategy;
  tranche: StrategyTranche | null;
  onSelectTranche: (t: StrategyTranche) => void;
  fixedTermConfigId: string;
  onSelectFixedTerm: (id: string) => void;
  amount: string;
  onChangeAmount: (v: string) => void;
  walletBalance: string;
  balanceLoading: boolean;
  /** DEMO: skip the wallet-balance ceiling (no connected signer to fund). */
  skipBalanceCheck?: boolean;
  errorMessage: string | null;
  submitLabel?: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const { kasu, chainId } = useSdk();
  const stable = getChain(chainId).stableAsset;

  // Deposit limits for the selected tranche (ether-formatted strings).
  const limits = useMemo(() => {
    if (!kasu || !tranche) return null;
    try {
      return kasu.strategies.calculateDepositLimits(tranche);
    } catch {
      return null;
    }
  }, [kasu, tranche]);

  const amountNum = Number(amount);
  const balanceNum = Number(formatUnits(walletBalance, stable.decimals, 6).replace(/,/g, ''));
  const min = limits ? Number(limits.min) : 0;
  const max = limits ? Number(limits.max) : Infinity;

  const validation = useMemo(() => {
    if (!tranche) return 'Select a tranche to continue.';
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) return null; // empty → button disabled, no error
    if (amountNum < min) return `Minimum deposit is ${formatUsd(min)}.`;
    if (amountNum > max) return `Maximum deposit is ${formatUsd(max)}.`;
    if (!skipBalanceCheck && amountNum > balanceNum)
      return `Insufficient ${stable.symbol} balance (${formatUsd(balanceNum)}).`;
    return null;
  }, [tranche, amount, amountNum, min, max, balanceNum, stable.symbol, skipBalanceCheck]);

  const canSubmit =
    !!tranche && !!amount && amountNum > 0 && validation === null && !balanceLoading;

  return (
    <View style={styles.gap}>
      <ThemedText type="smallBold">{strategy.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {strategy.assetClass} · {formatApy(strategy.apy)} APY
      </ThemedText>

      {/* Tranche selection */}
      {strategy.tranches.length > 1 && (
        <View style={styles.gapSmall}>
          <ThemedText type="small" themeColor="textSecondary">
            Tranche
          </ThemedText>
          <View style={styles.chips}>
            {strategy.tranches.map((t) => {
              const active = tranche?.id === t.id;
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  onPress={() => onSelectTranche(t)}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? ACCENT : theme.backgroundSelected },
                  ]}>
                  <ThemedText type="small" style={{ color: active ? '#1a1208' : theme.text }}>
                    {t.name} · {formatApy(t.apy)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Optional fixed-term selection */}
      {tranche && tranche.fixedTermOptions.length > 0 && (
        <View style={styles.gapSmall}>
          <ThemedText type="small" themeColor="textSecondary">
            Term
          </ThemedText>
          <View style={styles.chips}>
            <TermChip
              label="Flexible"
              active={fixedTermConfigId === '0'}
              onPress={() => onSelectFixedTerm('0')}
            />
            {tranche.fixedTermOptions.map((opt) => (
              <TermChip
                key={opt.configId}
                label={`${opt.epochLockDuration}w · ${formatApy(opt.apy)}`}
                active={fixedTermConfigId === opt.configId}
                onPress={() => onSelectFixedTerm(opt.configId)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Amount */}
      <Card style={styles.gapSmall}>
        <View style={styles.rowBetween}>
          <ThemedText type="small" themeColor="textSecondary">
            Amount ({stable.symbol})
          </ThemedText>
          {!skipBalanceCheck && (
            <ThemedText type="small" themeColor="textSecondary">
              Balance {formatUnits(walletBalance, stable.decimals)}
            </ThemedText>
          )}
        </View>
        <TextInput
          value={amount}
          onChangeText={(v) => onChangeAmount(v.replace(/[^0-9.]/g, ''))}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          style={[styles.input, { color: theme.text }]}
        />
        {limits && (
          <ThemedText type="small" themeColor="textSecondary">
            Min {formatUsd(min)} · Max {formatUsd(max)} · {formatUsd(limits.availableCapacity)}{' '}
            available
          </ThemedText>
        )}
      </Card>

      {validation && (
        <ThemedText type="small" style={styles.error}>
          {validation}
        </ThemedText>
      )}
      {errorMessage && (
        <ThemedText type="small" style={styles.error}>
          {errorMessage}
        </ThemedText>
      )}

      <Button title={submitLabel} disabled={!canSubmit} onPress={onSubmit} />
      <Button title="Cancel" variant="ghost" onPress={onCancel} />
    </View>
  );
}

function TermChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? ACCENT : theme.backgroundSelected }]}>
      <ThemedText type="small" style={{ color: active ? '#1a1208' : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Loan-contract accept step
// ---------------------------------------------------------------------------

function LoanContractStep({
  message,
  formatted,
  signing,
  stepCurrent,
  stepTotal,
  onAccept,
  onDecline,
}: {
  message: string;
  formatted: string;
  signing: boolean;
  stepCurrent: number;
  stepTotal: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  // Prefer the plaintext `contractMessage`; the structured tree is rendered as
  // a fallback summary line count so the user sees the contract has loaded.
  const tree = parseFormattedMessage(formatted);
  return (
    <View style={styles.gap}>
      <StepBadge current={stepCurrent} total={stepTotal} label="Sign loan contract" />
      <ThemedText type="smallBold">Loan contract</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Review the agreement, then sign it in your wallet to accept.
      </ThemedText>
      <Card>
        <ScrollView style={styles.contractScroll} nestedScrollEnabled>
          <ThemedText type="small">{message || (tree ? '[structured contract loaded]' : '')}</ThemedText>
        </ScrollView>
      </Card>
      <Button title={signing ? 'Sign in wallet…' : 'Accept & sign'} loading={signing} onPress={onAccept} />
      <Button title="Go back" variant="ghost" disabled={signing} onPress={onDecline} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Progress (generate / approve / submit) step
// ---------------------------------------------------------------------------

const PROGRESS_COPY: Record<
  Exclude<DepositPhase, 'idle' | 'awaiting-accept' | 'accepting-sign' | 'success' | 'declined' | 'error'>,
  { step: DepositStepId; title: string; sub: string }
> = {
  'generating-sign': {
    step: 'generate',
    title: 'Generating loan contract',
    sub: 'Sign in your wallet to authorize the request.',
  },
  'generating-fetch': {
    step: 'generate',
    title: 'Generating loan contract',
    sub: 'Preparing your agreement…',
  },
  approve: {
    step: 'approve',
    title: 'Approving {stableAsset}',
    sub: 'Confirm the approval in your wallet.',
  },
  'request-sign': {
    step: 'request',
    title: 'Submitting deposit',
    sub: 'Confirm the deposit transaction in your wallet.',
  },
  'request-confirm': {
    step: 'request',
    title: 'Confirming on-chain',
    sub: 'Usually completes within a few seconds.',
  },
};

function ProgressStep({
  phase,
  stepCurrent,
  stepTotal,
  symbol,
}: {
  phase: Exclude<
    DepositPhase,
    'idle' | 'awaiting-accept' | 'accepting-sign' | 'success' | 'declined' | 'error'
  >;
  stepCurrent: number;
  stepTotal: number;
  symbol: string;
}) {
  const copy = PROGRESS_COPY[phase];
  return (
    <View style={styles.gap}>
      <StepBadge
        current={stepCurrent}
        total={stepTotal}
        label={fmt(DEPOSIT_STEP_LABELS[copy.step], symbol)}
      />
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
      <ThemedText type="smallBold" style={styles.centerText}>
        {fmt(copy.title, symbol)}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        {fmt(copy.sub, symbol)}
      </ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Review (demo / no-signer path)
// ---------------------------------------------------------------------------

function DepositReview({
  strategy,
  tranche,
  amount,
  symbol,
  fixedTermLabel,
  apy,
  onConfirm,
  onBack,
}: {
  strategy: Strategy;
  tranche: StrategyTranche;
  amount: string;
  symbol: string;
  fixedTermLabel: string;
  apy: number;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.gap}>
      <ThemedText type="smallBold">Review your deposit</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Confirm the details below. This is a read-only demo — no transaction is
        submitted and no funds move.
      </ThemedText>
      <Card style={styles.gapSmall}>
        <Row label="Strategy" value={strategy.name} />
        <Row label="Tranche" value={tranche.name} />
        <Row label="Term" value={fixedTermLabel} />
        <Row label="APY" value={formatApy(apy)} />
        <Row label="Amount" value={`${amount || '0'} ${symbol}`} />
        <Row label="Settlement" value="Next weekly epoch" />
      </Card>
      <Button title="Confirm deposit" onPress={onConfirm} />
      <Button title="Back" variant="ghost" onPress={onBack} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Confirmed
// ---------------------------------------------------------------------------

function DepositConfirmed({
  strategy,
  amount,
  symbol,
  onClose,
  demo = false,
}: {
  strategy: Strategy;
  amount: string;
  symbol: string;
  onClose: () => void;
  /** DEMO: nothing was actually submitted — soften the copy accordingly. */
  demo?: boolean;
}) {
  return (
    <View style={styles.gap}>
      <ThemedText type="smallBold">
        {demo ? 'Deposit reviewed' : 'Deposit confirmed'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {demo
          ? `In a live build your deposit of ${amount || '0'} ${symbol} into ${strategy.name} would be submitted and activate at the next weekly settlement period (epoch). No transaction was sent in this demo.`
          : `Your deposit of ${amount} ${symbol} into ${strategy.name} has been submitted. Your position activates at the next weekly settlement period (epoch).`}
      </ThemedText>
      <Card style={styles.gapSmall}>
        <Row label="Status" value={demo ? 'Demo (no transaction)' : 'Submitted'} />
        <Row label="Settlement" value="Next weekly epoch" />
      </Card>
      <Button title="Back to strategy" onPress={onClose} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">{value}</ThemedText>
    </View>
  );
}

function StepBadge({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <View style={styles.rowBetween}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Step {current} of {total}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  gapSmall: { gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  input: { fontSize: 28, fontWeight: '600', paddingVertical: 4 },
  error: { color: '#d4534e' },
  center: { paddingVertical: 24, alignItems: 'center' },
  centerText: { textAlign: 'center' },
  contractScroll: { maxHeight: 260 },
});
