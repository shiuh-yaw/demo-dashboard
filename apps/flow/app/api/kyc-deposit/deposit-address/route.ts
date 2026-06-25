/**
 * POST /api/kyc-deposit/deposit-address
 *
 * Returns the address the KYC-verified user deposits USDC to. The deposit is a
 * SELF-SEND: funds go back to the user's own connected wallet, so repeat demos
 * don't drain test USDC into a sink address. The merchant-bank settlement is
 * driven separately by /api/kyc-deposit/settle (the Iron sandbox deposit
 * address is not monitored on-chain — the offramp is simulated server-side).
 *
 * No per-user provisioning: the destination is simply the caller's wallet
 * (gated behind KYC on the client).
 */

import { NextRequest, NextResponse } from "next/server";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export async function POST(req: NextRequest) {
  const { walletAddress } = (await req.json().catch(() => ({}))) as {
    walletAddress?: string;
  };

  if (!walletAddress || !EVM_ADDRESS.test(walletAddress)) {
    return NextResponse.json(
      { error: "A valid connected wallet address is required" },
      { status: 400 },
    );
  }

  // Self-send: deposit destination is the connected wallet itself.
  return NextResponse.json({ depositAddress: walletAddress });
}
