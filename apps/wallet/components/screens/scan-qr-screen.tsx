"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";
import { WidgetCard, Button, Input } from "@dynamic-demos/ui";
import { useQrScanner } from "@/hooks/use-qr-scanner";
import { isValidAddress } from "@/lib/validate-address";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { sendSectionForChain } from "@/lib/send-chains";
import type { NavigationReturn } from "@/hooks/use-navigation";

interface ScanQrScreenProps {
  walletAddress: string;
  chain: string;
  networkId: number;
  navigation: NavigationReturn;
}

const chainLabel = (chain: string) => (chain === "EVM" ? "EVM" : "Solana");

/**
 * Inline "scan recipient QR" screen - rendered inside the wallet WidgetCard
 * (same chrome as the Transactions / Send screens), NOT a modal overlay.
 *
 * Decodes a bare recipient address (validated against the wallet's chain) and
 * navigates to Send with the recipient prefilled. Falls back to inline manual
 * entry when the camera is unavailable or the user prefers to type.
 */
export function ScanQrScreen({
  walletAddress,
  chain,
  networkId,
  navigation,
}: ScanQrScreenProps) {
  // Q-017: send-flow screens show the chain-specific send snippets.
  usePanelSectionEffect(sendSectionForChain(chain));

  const [invalid, setInvalid] = useState(false);
  // Inline manual-entry mode (typed/pasted address instead of camera scan).
  const [manualEntry, setManualEntry] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [manualError, setManualError] = useState(false);
  // The native decode loop runs at frame rate and can deliver the same QR many
  // times. Guard so a valid scan navigates exactly once.
  const handledRef = useRef(false);

  const handleClose = () =>
    navigation.goToTxHistory(walletAddress, chain, networkId);

  // Hand a validated address to Send with the recipient prefilled.
  const applyAddress = (address: string) =>
    navigation.goToSendTx(walletAddress, chain, undefined, { networkId }, address);

  const { videoRef, status, start, stop } = useQrScanner({
    onResult: (text) => {
      if (handledRef.current) return;
      const value = text.trim();
      if (isValidAddress(value, chain)) {
        handledRef.current = true;
        applyAddress(value);
      } else {
        setInvalid(true);
      }
    },
  });

  // Camera lifecycle. Runs AFTER render, so the <video> (mounted whenever we're
  // in scan mode) is in the DOM and videoRef is attached before start() reads
  // it. Re-runs when toggling manual mode, so "Back to scanning" restarts the
  // camera once the video remounts.
  useEffect(() => {
    if (!manualEntry) {
      handledRef.current = false;
      setInvalid(false);
      void start();
    }
    return () => stop();
  }, [manualEntry, start, stop]);

  // Validate the typed address and, if valid, hand it back like a scan.
  const submitManual = () => {
    const value = manualValue.trim();
    if (isValidAddress(value, chain)) {
      applyAddress(value);
    } else {
      setManualError(true);
    }
  };

  const cameraMessage = (() => {
    if (status === "denied")
      return "Camera access was blocked. Allow it in your browser settings, or enter the address manually.";
    if (status === "unsupported")
      return "Scanning isn't supported here - enter the address manually.";
    if (status === "error")
      return "Couldn't start the camera. Enter the address manually.";
    if (invalid)
      return `That QR isn't a valid ${chainLabel(chain)} address - keep scanning.`;
    return `Point your camera at a ${chainLabel(chain)} address QR code.`;
  })();

  const showReticle = status === "scanning";
  const showPlaceholder =
    status === "denied" || status === "unsupported" || status === "error";

  return (
    <WidgetCard
      title="Scan recipient QR"
      subtitle={
        manualEntry
          ? `Enter the recipient ${chainLabel(chain)} address`
          : cameraMessage
      }
      onBack={handleClose}
    >
      {manualEntry ? (
        <div className="space-y-3">
          <Input
            label="Recipient address"
            value={manualValue}
            onChange={(e) => {
              setManualValue(e.target.value);
              if (manualError) setManualError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitManual();
            }}
            placeholder={chain === "EVM" ? "0x..." : "Enter address"}
            error={
              manualError
                ? `Not a valid ${chainLabel(chain)} address.`
                : undefined
            }
            mono
            autoFocus
          />
          <Button
            className="w-full"
            onClick={submitManual}
            disabled={!manualValue.trim()}
          >
            Use address
          </Button>
          <button
            type="button"
            onClick={() => setManualEntry(false)}
            className="w-full text-xs text-(--brand-muted) hover:text-(--brand-fg) transition-colors cursor-pointer"
          >
            Back to scanning
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-(--brand-radius) bg-black">
            {/* Always mounted while scanning so videoRef is attached before
                start() runs. Shows black until the stream attaches. */}
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
            {showReticle && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-2/3 w-2/3 rounded-(--brand-radius) border-2 border-white/80" />
              </div>
            )}
            {showPlaceholder && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-(--brand-muted)">
                <CameraOff className="h-8 w-8" strokeWidth={1.5} />
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setManualEntry(true)}
          >
            Enter address manually
          </Button>
        </div>
      )}
    </WidgetCard>
  );
}
