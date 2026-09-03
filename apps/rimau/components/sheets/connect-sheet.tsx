"use client";

import { useBackend } from "@/lib/backend";
import { Button, ErrorNote, Icon, Sheet } from "@/components/primitives";

/** The connector answer, made clickable. Deploy it the moment the curveball lands. */
export function ConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const backend = useBackend();
  const go = async () => {
    try {
      await backend.connectExternal();
      onClose();
    } catch {
      /* inline */
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Connect your own wallet">
      <div className="space-y-4">
        <p className="text-[14px] text-ink-2">
          Bring the wallet you already use. It joins this same Rimau session: same limits, same support, same Earn. Your keys stay yours either way.
        </p>
        <ul className="text-[13px] text-muted space-y-1.5 list-disc pl-5">
          <li>Newcomers get the built-in account created at sign-in.</li>
          <li>Power users connect MetaMask or any wallet and trade from it here.</li>
          <li>One integration on Rimau's side handles both.</li>
        </ul>
        <ErrorNote message={backend.error} onDismiss={backend.clearError} />
        <Button size="lg" className="w-full" variant="secondary" onClick={go} loading={!!backend.busy}>
          <Icon.Fox /> Connect MetaMask
        </Button>
      </div>
    </Sheet>
  );
}
