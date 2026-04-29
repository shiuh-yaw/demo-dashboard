import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Shell } from "../ui/Shell.js";
import { explorerLink, formatCurrency } from "@/lib/format.js";
import type { OrderState } from "@/lib/types/order-state.js";

export function ConfirmationView({ state }: { state: OrderState }) {
  const link = explorerLink(state.txHash);
  const short = state.txHash
    ? `${state.txHash.slice(0, 10)}…${state.txHash.slice(-8)}`
    : null;
  const paidWith = formatPaidWith(state.sourceAsset, state.sourceChain);
  const amount = formatCurrency(state.amountDue, state.currency);

  return (
    <Shell>
      <section className="card">
        <div className="flex items-center gap-4">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-[var(--color-navy)]"
            style={{ background: "var(--color-gold)" }}
            aria-hidden
          >
            <Check size={18} strokeWidth={2.5} />
          </div>
          <h1 className="text-[30px] sm:text-[34px]">Payment confirmed.</h1>
        </div>

        {state.attendeeName && (
          <p className="mt-5 text-[15px] text-[color-mix(in_srgb,var(--color-blue-100)_78%,transparent)]">
            Thank you, {state.attendeeName}.
          </p>
        )}

        <dl className="mt-8 divide-y divide-[var(--color-navy-line)]">
          <Row label="Amount" value={amount} />
          {paidWith && (
            <Row label="Paid with">
              <TokenLine logoUrl={state.sourceAssetLogo} text={paidWith} />
            </Row>
          )}
          <Row label="Settled as">
            <TokenLine logoUrl="/token-usdc.png" text="USDC on Base" />
          </Row>
          {short && (
            <Row label="Transaction">
              {link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-[13px] text-[var(--color-blue-100)] underline-offset-4 hover:text-white hover:underline"
                >
                  {short}
                  <span aria-hidden className="text-xs leading-none">↗</span>
                </a>
              ) : (
                <span className="font-mono text-[13px] text-white break-all">
                  {short}
                </span>
              )}
            </Row>
          )}
        </dl>
      </section>
    </Shell>
  );
}

function TokenLine({
  logoUrl,
  text,
}: {
  logoUrl: string | undefined;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="h-5 w-5 rounded-full"
          aria-hidden
        />
      )}
      <span>{text}</span>
    </span>
  );
}

// Legacy orders persisted `sourceAsset` as the token contract address
// (pre-symbol plumbing). Resolve common stablecoins to their symbol so
// "Paid with" reads as e.g. "DAI on Base" instead of "0x50c5…b0cb on EVM".
// Unknown addresses fall back to truncated form.
//
// Addresses are lowercased for lookup. Covers USDC/USDT/DAI/WETH across
// the EVM chains the Dynamic checkout routes through.
const KNOWN_TOKENS: Record<string, string> = {
  // USDC
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "USDC",
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
  "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359": "USDC",
  "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": "USDC",
  "0xaf88d065e77c8cc2239327c5edb3a432268e5831": "USDC",
  "0x0b2c639c533813f4aa9d7837caf62653d097ff85": "USDC",
  "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": "USDC",
  // USDT
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
  "0x55d398326f99059ff775485246999027b3197955": "USDT",
  "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": "USDT",
  "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": "USDT",
  // DAI
  "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": "DAI",
  "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1": "DAI",
  "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063": "DAI",
  // WETH
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
  "0x4200000000000000000000000000000000000006": "WETH",
  "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": "WETH",
};

function formatPaidWith(
  sourceAsset: string | undefined,
  sourceChain: string | undefined,
): string | null {
  if (!sourceAsset) return null;
  const isHexAddress = /^0x[0-9a-fA-F]{40}$/.test(sourceAsset);
  let displayAsset = sourceAsset;
  if (isHexAddress) {
    const symbol = KNOWN_TOKENS[sourceAsset.toLowerCase()];
    displayAsset =
      symbol ?? `${sourceAsset.slice(0, 6)}…${sourceAsset.slice(-4)}`;
  }
  return sourceChain ? `${displayAsset} on ${sourceChain}` : displayAsset;
}

function Row({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-x-6 py-3.5 first:pt-0 last:pb-0">
      <dt className="text-[13px] text-[color-mix(in_srgb,var(--color-blue-100)_50%,transparent)]">
        {label}
      </dt>
      <dd
        className={
          children
            ? "text-white text-right sm:text-left"
            : mono
              ? "font-mono text-[13px] text-white break-all text-right sm:text-left"
              : "text-white text-right sm:text-left"
        }
      >
        {children ?? value}
      </dd>
    </div>
  );
}
