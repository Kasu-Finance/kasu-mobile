import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

import { queryClient } from '@/lib/query/query-client';

import { EarnHeader } from './earn-header';
import { EpochYield } from './epoch-yield';
import { Portfolio } from './portfolio';
import { StrategiesList } from './strategies-list';
import { lendingKeys } from './use-strategies';
import { Withdraw } from './withdraw';

type FlowView =
  | { kind: 'list' }
  | { kind: 'withdraw'; poolId: string; trancheId: string };

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
      <ThemedText type="subtitle">Earn</ThemedText>
      <EpochYield />
      <Portfolio summaryOnly />
      <EarnHeader />
      <StrategiesList onSelect={(strategy) => router.push(`/lending/${strategy.id}`)} />
    </Screen>
  );
}
