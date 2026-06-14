/** TanStack Query keys for the Wayex on/off-ramp feature. */
export const wayexKeys = {
  all: ['wayex'] as const,
  identity: () => [...wayexKeys.all, 'identity'] as const,
  bankAccounts: () => [...wayexKeys.all, 'bank-accounts'] as const,
};
