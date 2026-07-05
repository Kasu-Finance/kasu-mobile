import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';

import { formatUnits, formatUsd, shortAddress } from '@/lib/format';
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/web3/chains';

import type { ActivityItem } from './types';

const TRANSFER_TOPIC = ethers.utils.id('Transfer(address,address,uint256)');
/** ~1 month of Base blocks (≈2s/block). Tenderly accepts this range in one call. */
const LOOKBACK_BLOCKS = 1_300_000;
const AVG_BLOCK_SEC = 2;

function addrFromTopic(topic: string): string {
  return ethers.utils.getAddress('0x' + topic.slice(26));
}

/**
 * Scrapes incoming + outgoing USDC transfers for the address from the Tenderly
 * RPC (`eth_getLogs` on the USDC contract, filtered by the from/to topic),
 * ~1 month back. Timestamps are approximated from the block number (the log
 * has no timestamp and fetching each block would be N extra calls). Zero-value
 * transfers are dropped. Self-transfers (from==to) are de-duped.
 */
export function useOnchainTransfers(address: string | null | undefined) {
  const chain = getChain(DEFAULT_CHAIN_ID);
  return useQuery<ActivityItem[]>({
    queryKey: ['onchain-transfers', DEFAULT_CHAIN_ID, address?.toLowerCase()],
    enabled: Boolean(address),
    staleTime: 20_000,
    queryFn: async () => {
      const provider = new ethers.providers.JsonRpcProvider(
        chain.rpcUrl,
        DEFAULT_CHAIN_ID,
      );
      const latest = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latest - LOOKBACK_BLOCKS);
      const addrTopic = ethers.utils.hexZeroPad(
        (address as string).toLowerCase(),
        32,
      );
      const usdc = chain.stableAsset.address;

      const [incoming, outgoing] = await Promise.all([
        provider.getLogs({
          address: usdc,
          fromBlock,
          toBlock: 'latest',
          topics: [TRANSFER_TOPIC, null, addrTopic],
        }),
        provider.getLogs({
          address: usdc,
          fromBlock,
          toBlock: 'latest',
          topics: [TRANSFER_TOPIC, addrTopic, null],
        }),
      ]);

      const now = Math.floor(Date.now() / 1000);
      const toItem = (log: ethers.providers.Log, received: boolean): ActivityItem => {
        const value = ethers.BigNumber.from(log.data);
        const dollars = Number(formatUnits(value, chain.stableAsset.decimals));
        const from = addrFromTopic(log.topics[1]);
        const to = addrFromTopic(log.topics[2]);
        const timestamp = now - (latest - log.blockNumber) * AVG_BLOCK_SEC;
        return {
          id: `oc-${log.transactionHash}-${log.logIndex}`,
          kind: received ? 'deposit' : 'withdrawal',
          title: received ? 'Money received' : 'Money sent',
          subtitle: received ? `From ${shortAddress(from)}` : `To ${shortAddress(to)}`,
          timestamp,
          amount: `${received ? '+' : '-'}${formatUsd(dollars)}`,
          positive: received,
          status: 'Completed',
          details: [
            { label: received ? 'From' : 'To', value: shortAddress(received ? from : to) },
            { label: 'Amount', value: formatUsd(dollars) },
            { label: 'Network', value: 'Base' },
          ],
        };
      };

      const items = [
        ...incoming.map((l) => toItem(l, true)),
        ...outgoing.map((l) => toItem(l, false)),
      ].filter((it) => it.amount !== '+$0' && it.amount !== '-$0');

      // De-dupe (a self-transfer matches both filters with the same tx+logIndex).
      const seen = new Set<string>();
      return items.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
    },
  });
}
