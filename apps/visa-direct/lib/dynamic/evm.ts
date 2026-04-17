"use client";

/**
 * EVM wallet client bridge.
 *
 * The `Send USDC` flow on the wallet screen needs a signer for the
 * user's embedded EVM wallet. Dynamic's EVM extension ships a viem-
 * compatible wallet client factory — we just re-export it here so
 * screen code doesn't need to know the SDK's internal module layout.
 */

import { createWalletClientForWalletAccount as sdkCreateWalletClientForWalletAccount } from "@dynamic-labs-sdk/evm/viem";

export const createWalletClientForWalletAccount =
  sdkCreateWalletClientForWalletAccount;
