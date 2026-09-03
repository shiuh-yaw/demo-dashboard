"use client";

import { useEffect } from "react";
import { useBackend } from "@/lib/backend";
import { Button, ErrorNote, Icon, Sheet } from "@/components/primitives";

/**
 * The connector answer, made clickable. Deploy it the moment the curveball
 * lands. Live mode lists the wallets the SDK discovered in this browser and
 * links the chosen one to the signed-in user; staged mode simulates MetaMask.
 */
export function ConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const backend = useBackend();
  const options = backend.externalWalletOptions;
  const rescan = backend.rescanExternalWallets;
  useEffect(() => {
    if (open) rescan?.();
  }, [open, rescan]);
  const go = async (key?: string) => {
    try {
      await backend.connectExternal(key);
      onClose();
    } catch {
      /* inline */
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Connect your own wallet">
      <div className="space-y-4">
        <p className="text-[14px] text-ink-2">
          Bring the wallet you already use. It joins this same session: same limits, same support, same Earn. Your keys stay yours either way.
        </p>
        <ul className="text-[13px] text-muted space-y-1.5 list-disc pl-5">
          <li>Newcomers get the built-in account created at sign-in.</li>
          <li>Power users connect MetaMask or any wallet and trade from it here.</li>
          <li>One integration on the exchange's side handles both.</li>
        </ul>
        <ErrorNote message={backend.error} onDismiss={backend.clearError} />
        {options.length === 0 ? (
          <div className="rounded-xl bg-ground p-3.5 text-[13px] text-muted space-y-2">
            <p>No browser wallet found. Install MetaMask or another EVM wallet extension in this browser, unlock it, then scan again.</p>
            {backend.externalWalletHint ? <p className="font-mono text-[11px] break-words">{backend.externalWalletHint}</p> : null}
            {rescan ? (
              <Button size="sm" variant="secondary" onClick={rescan}>
                Scan again
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            {options.map((o) => (
              <Button key={o.key} size="lg" className="w-full" variant="secondary" onClick={() => go(o.key)} loading={!!backend.busy}>
                {o.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.icon} alt="" className="h-5 w-5 rounded" />
                ) : (
                  <Icon.Fox />
                )}
                Connect {o.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
