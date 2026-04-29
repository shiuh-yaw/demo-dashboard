import type {
  CheckoutTransaction,
  WalletAccount,
} from "@dynamic-labs-sdk/client";

export type View =
  | "createTx"
  | "pickWallet"
  | "pickToken"
  | "reviewQuote"
  | "submit"
  | "status";

export type CreateTransactionViewProps = {
  checkoutId: string;
  amountUsd: string;
  onCreated: (tx: CheckoutTransaction) => void;
};

export type PickWalletViewProps = {
  onConnected: () => void;
};

export type SelectedTokenInfo = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
};

export type PickTokenViewProps = {
  walletAccount: WalletAccount;
  accounts: WalletAccount[];
  onSelectAccount: (account: WalletAccount) => void;
  minMarketValue: number;
  onSelect: (token: SelectedTokenInfo) => void;
  onDisconnect: () => void;
};

export type ReviewQuoteViewProps = {
  transactionId: string;
  walletAccount: WalletAccount;
  fromToken: SelectedTokenInfo;
  onBack: () => void;
  onConfirm: () => void;
};

export type SubmitViewProps = {
  transactionId: string;
  walletAccount: WalletAccount;
  onSubmitted: () => void;
  onCancel: () => void;
};

export type StatusViewProps = {
  transactionId: string;
  onCompleted: (tx: CheckoutTransaction) => void;
  onFailed: (tx: CheckoutTransaction | null, reason: string) => void;
};
