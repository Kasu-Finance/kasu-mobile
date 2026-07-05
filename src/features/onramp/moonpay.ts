import * as WebBrowser from 'expo-web-browser';

import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/query/query-client';

export type MoonPayResult = 'opened' | 'unavailable';

/**
 * Opens the MoonPay card / Apple Pay top-up. The backend builds and signs the
 * widget URL (keys stay server-side, wallet address pre-filled); we open it in
 * the system in-app browser (Apple Pay works there) and refresh the balance on
 * return. Returns 'unavailable' when the backend isn't configured yet (503).
 */
export async function openMoonPayBuy(userAddress: string): Promise<MoonPayResult> {
  try {
    const res = await api.post<{ url: string }>(
      '/mobile/onramp/moonpay-buy-url',
      { userAddress },
    );
    if (!res.data?.url) return 'unavailable';
    await WebBrowser.openBrowserAsync(res.data.url);
    // Money may have landed — refresh balances on return.
    void queryClient.invalidateQueries({ queryKey: ['stable-balance'] });
    return 'opened';
  } catch {
    return 'unavailable';
  }
}
