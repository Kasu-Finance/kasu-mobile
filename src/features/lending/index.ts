/**
 * Public surface of the lending feature (F2).
 *
 * `LendingScreen` is the default entry (mounted into the Lend tab). The hooks,
 * flows, and helpers are exported for direct composition + routing.
 */
export { default as LendingScreen } from './lending-screen';

export { StrategiesList } from './strategies-list';
export type { StrategiesListProps } from './strategies-list';
export { StrategyDetails, StrategyHelpContent } from './strategy-details';
export type { StrategyDetailsProps } from './strategy-details';
export { LendAmount } from './lend-amount';
export { DepositFlow } from './deposit-flow';
export type { DepositFlowProps } from './deposit-flow';
export { Withdraw } from './withdraw';
export type { WithdrawProps } from './withdraw';
export { Portfolio } from './portfolio';
export type { PortfolioProps } from './portfolio';

export { useStrategies, useStrategy, lendingKeys } from './use-strategies';
export { usePortfolio } from './use-portfolio';
export { useDeposit } from './use-deposit';
export type { DepositInput, DepositPhase, DepositState } from './use-deposit';
export { useWithdraw } from './use-withdraw';
export type { WithdrawInput } from './use-withdraw';

export { encodeDepositData, buildContractVersionType } from './lib/encode-deposit-data';
export { fetchGenerateContract } from './lib/fetch-generate-contract';
export type { GenerateContractParams } from './lib/fetch-generate-contract';
export {
  parseFormattedMessage,
  asContractType,
  type GenerateContractResponse,
  type ContractType,
} from './lib/contract-types';
