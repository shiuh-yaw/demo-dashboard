"use client";

import { useEffect, useState } from "react";
import { money, num, pct } from "@/lib/format";
import { Card, Eyebrow } from "@/components/primitives";

interface Row { sym: string; name: string; price: number; change: number; vol: number }

const BASE: Row[] = [
  { sym: "BTC", name: "Bitcoin", price: 97412, change: 1.82, vol: 2_140_000_000 },
  { sym: "ETH", name: "Ethereum", price: 3286.4, change: 2.41, vol: 980_000_000 },
  { sym: "SOL", name: "Solana", price: 186.2, change: -0.63, vol: 410_000_000 },
  { sym: "XRP", name: "XRP", price: 2.31, change: 0.84, vol: 620_000_000 },
  { sym: "BNB", name: "BNB", price: 612.7, change: -1.12, vol: 220_000_000 },
  { sym: "USDC", name: "USD Coin", price: 1.0, change: 0.0, vol: 5_900_000_000 },
  { sym: "USDT", name: "Tether", price: 1.0, change: 0.01, vol: 41_000_000_000 },
  { sym: "LINK", name: "Chainlink", price: 17.44, change: 3.2, vol: 140_000_000 },
];

/** Decorative but alive: prices drift a little so the screen looks like a market, not a table. */
export function useTicker() {
  const [rows, setRows] = useState(BASE);
  useEffect(() => {
    const t = setInterval(() => {
      setRows((rs) =>
        rs.map((r) => {
          if (r.sym === "USDC" || r.sym === "USDT") return r;
          const drift = (Math.random() - 0.5) * 0.0025;
          return { ...r, price: r.price * (1 + drift), change: r.change + drift * 100 };
        }),
      );
    }, 2500);
    return () => clearInterval(t);
  }, []);
  return rows;
}

export function Markets() {
  const rows = useTicker();
  return (
    <div className="rise">
      <Eyebrow className="mb-2">Markets</Eyebrow>
      <h1 className="text-2xl font-bold tracking-tight mb-6">Spot</h1>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-[14px]">
          <thead className="text-[12px] text-muted">
            <tr className="border-b border-line">
              <th className="text-left font-semibold px-5 py-3">Asset</th>
              <th className="text-right font-semibold px-5 py-3">Price</th>
              <th className="text-right font-semibold px-5 py-3">24h</th>
              <th className="text-right font-semibold px-5 py-3 hidden sm:table-cell">Volume</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sym} className="border-b border-line last:border-0 hover:bg-ground/70">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full bg-ground grid place-items-center text-[11px] font-bold text-ink-2">{r.sym.slice(0, 3)}</span>
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-[12px] text-muted">{r.sym}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right tnum font-medium">{money(r.price, { digits: r.price < 10 ? 4 : 2 })}</td>
                <td className={`px-5 py-3.5 text-right tnum ${r.change >= 0 ? "text-up" : "text-down"}`}>{pct(r.change)}</td>
                <td className="px-5 py-3.5 text-right tnum text-muted hidden sm:table-cell">${num(r.vol / 1e6, 0)}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export const MARKETS = BASE;
