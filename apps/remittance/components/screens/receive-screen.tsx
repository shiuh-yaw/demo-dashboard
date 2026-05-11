"use client";

import { QRCodeSVG } from "qrcode.react";
import { WidgetCard, CopyButton } from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import type { NavigationReturn } from "@/hooks/use-navigation";

interface ReceiveScreenProps {
  walletAddress: string;
  navigation: NavigationReturn;
}

export function ReceiveScreen({
  walletAddress,
  navigation,
}: ReceiveScreenProps) {
  return (
    <WidgetCard
      title="Receive USDC"
      subtitle="Share your wallet address to receive funds"
    >
      <div className="flex flex-col items-center gap-5 py-2">
        {/* QR Code */}
        <div className="p-4 bg-white rounded-(--brand-radius-lg) border border-(--brand-border)">
          <QRCodeSVG
            value={walletAddress}
            size={180}
            level="M"
            bgColor="transparent"
          />
        </div>

        {/* Address */}
        <div className="w-full space-y-2">
          <p className="text-xs text-(--brand-muted) text-center">
            Your wallet address (Base Sepolia)
          </p>
          <div className="flex items-center gap-2 p-3 rounded-(--brand-radius) bg-(--brand-row-bg)">
            <code className="flex-1 text-xs break-all font-mono">
              {truncateAddress(walletAddress, 16, 12)}
            </code>
            <CopyButton text={walletAddress} size="sm" />
          </div>
        </div>

        <p className="text-xs text-(--brand-muted) text-center">
          Only send USDC on the Base Sepolia network to this address
        </p>
      </div>
    </WidgetCard>
  );
}
