import axios, { type AxiosInstance } from 'axios';

import { env } from '@/lib/env';
import { DEFAULT_CHAIN_ID } from '@/lib/web3/chains';
import { getWayexSession } from '@/lib/secure/session-store';

/**
 * REST client for kasu-backend (NestJS). Talks to existing surfaces
 * (`/wayex/*`, `/contract/*`, `/allocations/*`, `/yield/*`) and the new
 * `/mobile/*` routes.
 *
 * Headers mirror the backend's expectations: `x-api-key` (pool-delegate, when
 * configured), `x-chain-id`, and — for Wayex routes — the session token lifted
 * from secure storage into `x-wayex-session`.
 */
export function createApiClient(getChainId: () => number = () => DEFAULT_CHAIN_ID): AxiosInstance {
  const instance = axios.create({
    baseURL: env.apiBaseUrl,
    timeout: 20000,
  });

  instance.interceptors.request.use(async (config) => {
    config.headers.set('x-chain-id', String(getChainId()));
    if (env.apiKey) config.headers.set('x-api-key', env.apiKey);

    // Attach the Wayex session token only to Wayex routes.
    if (config.url?.includes('/wayex/')) {
      const token = await getWayexSession();
      if (token) config.headers.set('x-wayex-session', token);
    }
    return config;
  });

  return instance;
}

/** Default singleton; chain-aware variants can be created per provider. */
export const api = createApiClient();
