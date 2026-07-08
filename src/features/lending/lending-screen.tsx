import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { TabHeader } from '@/components/ui/tab-header';

import { queryClient } from '@/lib/query/query-client';

import { EpochYield } from './epoch-yield';
import { Portfolio } from './portfolio';
import { StrategiesList } from './strategies-list';
import { lendingKeys } from './use-strategies';
import { Withdraw } from './withdraw';

type FlowView =
  | { kind: 'list' }
  | { kind: 'withdraw'; poolId: string; trancheId: string };

/** Plain-language "how earning works" — moved off the screen into the "?". */
const EARN_HELP = {
  title: 'Earning',
  items: [
    {
      heading: 'How it works',
      body: 'Lend your dollars to Kasu and earn interest. Your money is put to work in vetted strategies, and you can move it back to cash whenever you like.',
    },
    {
      heading: 'Weekly top up',
      body: 'Every Thursday the interest you’ve earned is added straight onto your card, ready to spend.',
    },
    {
      heading: 'What’s APY?',
      body: 'APY is the yearly rate. At 4% APY, $10,000 earns about $400 over a year — and it accrues every second.',
    },
    {
      heading: 'Strategies',
      body: 'Each strategy is a pool with its own rate and available capacity. Pick one, choose an amount, and you’re earning — in three taps.',
    },
  ],
};

/**
 * Lending feature entry — the Earn tab. Shows the user's weekly top-up
 * countdown + total invested, the headline rate, and the strategies catalogue.
 * Tapping a strategy routes to its detail screen (`/lending/<poolId>`), where
 * the rich strategy view and the stepped deposit flow live. The inline withdraw
 * flow is kept for entry points that hand off a pool/tranche to withdraw from.
 */
export default function LendingScreen() {
  const router = useRouter();
  const [view, setView] = useState<FlowView>({ kind: 'list' });

  if (view.kind === 'withdraw') {
    return (
      <Screen>
        <ThemedText type="subtitle">Withdraw</ThemedText>
        <Withdraw
          poolId={view.poolId}
          trancheId={view.trancheId}
          onClose={() => setView({ kind: 'list' })}
        />
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={() =>
        queryClient.invalidateQueries({ queryKey: lendingKeys.all })
      }>
      <TabHeader help={EARN_HELP} />
      <EpochYield />
      <Portfolio summaryOnly />
      <StrategiesList onSelect={(strategy) => router.push(`/lending/${strategy.id}`)} />
    </Screen>
  );
}
