"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from "@dynamic-demos/ui";
import type { MockPredictPosition } from "@/lib/mock-metadata";
import { MOCK_METADATA_KEYS } from "@/lib/mock-metadata";
import { useMockMetadata } from "@/hooks/use-mock-metadata";
import { useMockBalances } from "@/hooks/use-mock-balances";

interface MyPredictionModalProps {
  position: MockPredictPosition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MyPredictionModal({
  position,
  open,
  onOpenChange,
}: MyPredictionModalProps) {
  const { metadata, updateMetadata } = useMockMetadata();
  const { addBalance } = useMockBalances();

  const predict = (metadata[MOCK_METADATA_KEYS.PREDICT] ?? {}) as {
    positions?: MockPredictPosition[];
  };
  const positions = predict.positions ?? [];

  const handleClose = async () => {
    const amountNum = parseFloat(position.amount);
    if (!Number.isNaN(amountNum) && amountNum > 0) {
      await addBalance("USDC", amountNum);
    }
    const updatedPositions = positions.filter((p) => p.id !== position.id);
    await updateMetadata.mutateAsync({
      [MOCK_METADATA_KEYS.PREDICT]: { positions: updatedPositions },
    });
    onOpenChange(false);
  };

  const isPending = updateMetadata.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-trade-surface border-trade-border text-trade-text-primary"
        showCloseButton
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-full overflow-hidden bg-trade-surface border border-trade-border/50 shrink-0">
              {position.imageUrl ? (
                <Image
                  src={position.imageUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm font-medium text-trade-text-muted">
                  ?
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg text-trade-text-primary line-clamp-2">
                {position.marketQuestion}
              </DialogTitle>
              <p className="text-sm text-trade-text-muted truncate">
                {position.eventTitle}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 bg-trade-surface-blue border border-trade-border/50">
              <p className="text-xs text-trade-text-muted">Side</p>
              <p
                className={`text-lg font-semibold tabular-nums ${
                  position.side === "yes"
                    ? "text-trade-success"
                    : "text-trade-error"
                }`}
              >
                {position.side === "yes" ? "Yes" : "No"}
              </p>
            </div>
            <div className="rounded-lg p-3 bg-trade-surface-blue border border-trade-border/50">
              <p className="text-xs text-trade-text-muted">Amount</p>
              <p className="text-lg font-semibold text-trade-text-primary tabular-nums">
                ${position.amount}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              asChild
              className="flex-1"
            >
              <Link href={`/predictions/${encodeURIComponent(position.eventSlug)}`}>
                View Event
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClose}
              disabled={isPending}
              className="flex-1 text-trade-error hover:text-trade-error"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Closing…
                </>
              ) : (
                "Close Position"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
