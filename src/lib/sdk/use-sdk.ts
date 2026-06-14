import { useContext } from 'react';

import { SdkContext } from './sdk-context';

/** Access the authenticated Kasu SDK facade (and current chain). */
export function useSdk() {
  return useContext(SdkContext);
}
