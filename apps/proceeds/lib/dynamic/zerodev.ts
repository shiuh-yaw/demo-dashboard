"use client";

import { getClient } from "./client";

let _ready: Promise<void> | null = null;

export async function ensureZeroDev(): Promise<void> {
  if (!_ready) {
    _ready = (async () => {
      const client = getClient();
      if (!client) throw new Error("Dynamic client not initialized");
      const { addZerodevExtension } = await import("@dynamic-labs-sdk/zerodev");
      addZerodevExtension(client);
    })();
  }
  return _ready;
}

export async function sendUserOperation(
  ...args: Parameters<typeof import("@dynamic-labs-sdk/zerodev").sendUserOperation>
): ReturnType<typeof import("@dynamic-labs-sdk/zerodev").sendUserOperation> {
  await ensureZeroDev();
  const { sendUserOperation: sdk } = await import("@dynamic-labs-sdk/zerodev");
  return sdk(...args);
}

export async function createKernelClientForWalletAccount(
  ...args: Parameters<typeof import("@dynamic-labs-sdk/zerodev").createKernelClientForWalletAccount>
): ReturnType<typeof import("@dynamic-labs-sdk/zerodev").createKernelClientForWalletAccount> {
  await ensureZeroDev();
  const { createKernelClientForWalletAccount: sdk } = await import("@dynamic-labs-sdk/zerodev");
  return sdk(...args);
}

export async function signEip7702Authorization(
  ...args: Parameters<typeof import("@dynamic-labs-sdk/zerodev").signEip7702Authorization>
): ReturnType<typeof import("@dynamic-labs-sdk/zerodev").signEip7702Authorization> {
  await ensureZeroDev();
  const { signEip7702Authorization: sdk } = await import("@dynamic-labs-sdk/zerodev");
  return sdk(...args);
}
