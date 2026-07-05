import * as WebBrowser from 'expo-web-browser';

import { api } from '@/lib/api/client';
import { refreshFinancials } from '@/lib/refresh';

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
    // Money may have landed — reload everything money-related on return.
    refreshFinancials();
    return 'opened';
  } catch {
    return 'unavailable';
  }
}
