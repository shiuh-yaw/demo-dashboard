/**
 * Earn Page (Server Component)
 *
 * Lists DeFi vaults from Morpho. Clicking a vault opens a modal for deposits.
 */

import Image from "next/image";
import { getMorphoVaults, DEFAULT_VAULT_CHAIN_IDS } from "@/lib/api/vaults";
import { EarnClient } from "./components/earn-client";

interface PageProps {
  searchParams: Promise<{ chainId?: string }>;
}

export default async function EarnPage({ searchParams }: PageProps) {
  const { chainId: chainIdParam } = await searchParams;

  const chainIds = chainIdParam
    ? [parseInt(chainIdParam, 10)].filter((id) => !Number.isNaN(id))
    : DEFAULT_VAULT_CHAIN_IDS;

  let vaults;
  try {
    vaults = await getMorphoVaults({ chainIds, first: 25 });
  } catch {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-trade-text-primary">Earn</h1>
            <p className="text-sm text-trade-text-secondary mt-0.5">
              Deposit into DeFi vaults and earn yield on your crypto.
            </p>
          </div>
          <a
            href="https://morpho.org"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 opacity-80 hover:opacity-100 transition-opacity flex items-center"
            aria-label="Morpho"
          >
            <Image
              src="/morpho-logo-light.svg"
              alt="Morpho"
              width={140}
              height={28}
              className="h-7 w-auto block dark:hidden"
            />
            <Image
              src="/morpho-logo-dark.svg"
              alt="Morpho"
              width={140}
              height={28}
              className="h-7 w-auto hidden dark:block"
            />
          </a>
        </div>
        <div className="rounded-2xl p-8 bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
          <p className="text-trade-text-muted">Failed to load vault data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-trade-text-primary">Earn</h1>
          <p className="text-sm text-trade-text-secondary mt-0.5">
            Deposit into DeFi vaults and earn yield on your crypto.
          </p>
        </div>
        <a
          href="https://morpho.org"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 opacity-80 hover:opacity-100 transition-opacity flex items-center"
          aria-label="Morpho"
        >
          <Image
            src="/morpho-logo-light.svg"
            alt="Morpho"
            width={140}
            height={28}
            className="h-7 w-auto block dark:hidden"
          />
          <Image
            src="/morpho-logo-dark.svg"
            alt="Morpho"
            width={140}
            height={28}
            className="h-7 w-auto hidden dark:block"
          />
        </a>
      </div>
      <EarnClient vaults={vaults} />
    </div>
  );
}
