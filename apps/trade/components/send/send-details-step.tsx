"use client";

import { useState, useEffect } from "react";
import { Input, Button } from "@dynamic-demos/ui";
import { useMockMode } from "@/contexts/mock-mode-context";
import { getNetworksData, type NetworkData } from "@/lib/dynamic";
import type { TokenInfo } from "./token-select-step";

const MOCK_NETWORK: NetworkData = {
  networkId: "mock",
  name: "Mock Network",
  displayName: "Mock Network",
  chain: "EVM" as NetworkData["chain"],
  blockExplorerUrls: [],
  iconUrl: "",
  nativeCurrency: { decimals: 18, name: "ETH", symbol: "ETH" },
  rpcUrls: { http: [] },
  testnet: true,
};

interface SendDetailsStepProps {
  token: TokenInfo;
  onContinue: (recipient: string, amount: string, network: NetworkData) => void;
}

export function SendDetailsStep({ token, onContinue }: SendDetailsStepProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("");
  const { isMockMode } = useMockMode();

  useEffect(() => {
    if (isMockMode) return;
    getNetworksData().then((data) => {
      setNetworks(data);
      const first = data[0];
      if (first && !selectedNetworkId) {
        setSelectedNetworkId(first.networkId);
      }
    });
  }, [selectedNetworkId, isMockMode]);

  const hasRecipient = recipient.trim().length > 0;
  const amountNum = parseFloat(amount) || 0;
  const hasInsufficientBalance = amountNum > token.balance;
  const canContinue =
    hasRecipient && amountNum > 0 && !hasInsufficientBalance && (isMockMode || selectedNetworkId);

  const selectedNetwork = isMockMode
    ? MOCK_NETWORK
    : networks.find((n) => n.networkId === selectedNetworkId);

  const handleContinue = () => {
    if (!canContinue || !selectedNetwork) return;
    onContinue(recipient, amount, selectedNetwork);
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        label={<span className="text-trade-text-primary">Recipient address</span>}
        type="text"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Enter wallet address"
        error={undefined}
        className="bg-trade-surface border-trade-border text-trade-text-primary placeholder:text-trade-text-muted"
      />

      <Input
        label={
          <span className="flex items-center justify-between w-full">
            <span className="text-trade-text-primary">
              Amount ({token.symbol})
            </span>
            <button
              type="button"
              onClick={() => setAmount(String(token.balance))}
              className="text-xs text-trade-accent hover:underline cursor-pointer"
            >
              Max: {token.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            </button>
          </span>
        }
        type="number"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        min="0"
        step="any"
        error={hasInsufficientBalance ? "Insufficient balance" : undefined}
        className="bg-trade-surface border-trade-border text-trade-text-primary placeholder:text-trade-text-muted"
      />

      {!isMockMode && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-trade-text-primary">
            Network
          </label>
          <div className="relative">
            <select
              value={selectedNetworkId}
              onChange={(e) => setSelectedNetworkId(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-lg text-sm cursor-pointer transition-colors appearance-none bg-trade-surface border border-trade-border text-trade-text-primary focus:outline-none focus:border-trade-accent"
            >
              {networks.map((n) => (
                <option key={n.networkId} value={n.networkId}>
                  {n.displayName ?? n.networkId}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-trade-text-muted pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      <Button
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );
}
