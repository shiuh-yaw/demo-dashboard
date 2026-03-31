"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { MockPredictPosition } from "@/lib/mock-metadata";
import { MOCK_METADATA_KEYS } from "@/lib/mock-metadata";
import { useMockMetadata } from "@/hooks/use-mock-metadata";
import { useMockMode } from "@/contexts/mock-mode-context";
import { MyPredictionModal } from "./my-prediction-modal";

export function MyPredictionsSection() {
  const [selectedPosition, setSelectedPosition] =
    useState<MockPredictPosition | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { isMockMode } = useMockMode();
  const { metadata } = useMockMetadata();
  const predict = metadata[MOCK_METADATA_KEYS.PREDICT] as
    | { positions?: MockPredictPosition[] }
    | undefined;
  const positions = predict?.positions ?? [];

  if (!isMockMode || positions.length === 0) return null;

  const handleChipClick = (e: React.MouseEvent, pos: MockPredictPosition) => {
    e.preventDefault();
    setSelectedPosition(pos);
    setModalOpen(true);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-trade-text-muted">
          My Predictions
        </h2>
        <span className="text-xs text-trade-text-muted tabular-nums">
          {positions.length} position{positions.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1">
        {positions.map((pos) => (
          <div
            key={pos.id}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-trade-border/60 bg-trade-surface px-3 py-2 min-w-0 max-w-[280px] cursor-pointer transition-colors hover:bg-trade-surface-elevated hover:border-trade-border group"
            onClick={(e) => handleChipClick(e, pos)}
          >
            <div className="shrink-0 h-8 w-8 rounded-lg overflow-hidden bg-trade-bg">
              {pos.imageUrl ? (
                <Image
                  src={pos.imageUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs font-medium text-trade-text-muted">
                  ?
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-trade-text-primary truncate">
                {pos.marketQuestion}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-xs font-semibold ${
                    pos.side === "yes"
                      ? "text-trade-success"
                      : "text-trade-error"
                  }`}
                >
                  {pos.side === "yes" ? "Yes" : "No"}
                </span>
                <span className="text-xs text-trade-text-muted tabular-nums">
                  ${pos.amount}
                </span>
              </div>
            </div>
            <ChevronRight className="shrink-0 w-4 h-4 text-trade-text-muted group-hover:text-trade-text-primary transition-colors" />
          </div>
        ))}
      </div>
      {selectedPosition && (
        <MyPredictionModal
          position={selectedPosition}
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setSelectedPosition(null);
          }}
        />
      )}
    </div>
  );
}
