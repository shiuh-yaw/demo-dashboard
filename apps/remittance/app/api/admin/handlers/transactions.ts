/**
 * Admin Transactions Handler
 */

import { getFireblocksClient } from "@/lib/fireblocks";

export async function handleGetTransaction(txId: string) {
  const client = getFireblocksClient();
  const tx = await client.getTransaction(txId);
  return tx;
}
