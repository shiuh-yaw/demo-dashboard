import { SELLER_POOL, FX_RATE } from "./mock-data";
import type { Disbursement } from "./mock-data";

let poolIndex = 0;

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function generateDisbursement(nextId: string): Disbursement {
  const seller = SELLER_POOL[poolIndex % SELLER_POOL.length]!;
  poolIndex++;

  const ordersCount = Math.floor(Math.random() * 33) + 8;
  const amountUSD = Math.floor(Math.random() * 3) + 1;
  const amountMXN = Math.round(amountUSD * FX_RATE * 100) / 100;
  const amountUSDC = amountUSD;
  const today = new Date();
  const periodEnd = today.toISOString().split("T")[0]!;
  const description = `Weekly sales disbursement — ${formatDateLong(today)}`;

  return {
    id: nextId,
    seller: seller.seller,
    shopName: seller.shopName,
    description,
    category: seller.category,
    ordersCount,
    amountUSD,
    amountMXN,
    amountUSDC,
    periodEnd,
    status: "due",
    overdueDays: 0,
    bank: seller.bank,
    clabe: seller.clabe,
    recipient: seller.recipient,
    accountNumber: seller.accountNumber,
    city: seller.city,
    state: seller.state,
  };
}
