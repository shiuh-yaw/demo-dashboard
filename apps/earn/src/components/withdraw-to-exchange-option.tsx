"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import {
  SUPPORTED_EXCHANGES,
  type ExchangeInfo,
} from "./icons/exchange-logos";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dynamic-demos/ui";
import { Button } from "@dynamic-demos/ui";
import { OptionCard } from "@/components/ui/option-card";

interface WithdrawToExchangeOptionProps {
  /** Called when user selects an exchange to withdraw to */
  onSelectExchange?: (exchange: ExchangeInfo) => void;
}

export function WithdrawToExchangeOption({
  onSelectExchange,
}: WithdrawToExchangeOptionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExchangeSelect = (exchange: ExchangeInfo) => {
    onSelectExchange?.(exchange);
    setIsOpen(false);
  };

  return (
    <>
      <OptionCard
        icon={<ArrowUpRight className="w-5 h-5 text-earn-text-secondary" />}
        title="Withdraw to exchange"
        description="Send to your favorite platform"
        badges={SUPPORTED_EXCHANGES.map((exchange) => {
          const Logo = exchange.logo;
          return <Logo key={exchange.id} size={24} />;
        })}
        onClick={() => setIsOpen(true)}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-earn-text-secondary" />
              Withdraw to Exchange
            </DialogTitle>
            <DialogDescription>
              Send your crypto to a supported exchange or wallet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {SUPPORTED_EXCHANGES.map((exchange) => {
              const LogoComponent = exchange.logo;
              return (
                <button
                  key={exchange.id}
                  type="button"
                  onClick={() => handleExchangeSelect(exchange)}
                  className="w-full flex items-center gap-3 p-3 border border-earn-border/60 rounded-lg hover:bg-gray-50/50 hover:border-earn-border transition-all text-left cursor-pointer"
                >
                  <LogoComponent size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-earn-text-primary">
                        {exchange.name}
                      </span>
                      <span className="text-xs text-earn-text-secondary bg-gray-100 px-1.5 py-0.5 rounded">
                        {exchange.country}
                      </span>
                    </div>
                    <p className="text-xs text-earn-text-secondary">
                      {exchange.description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-earn-text-secondary shrink-0" />
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-earn-border/60">
            <p className="text-xs text-earn-text-secondary text-center">
              On-chain transfer • Instant (24/7)
            </p>
          </div>

          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
