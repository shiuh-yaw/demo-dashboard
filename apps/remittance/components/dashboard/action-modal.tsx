"use client";

import { Dialog, DialogContent, DialogTitle } from "@dynamic-demos/ui";

interface ActionModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** When true, prevents closing by clicking outside or pressing Escape */
  preventOutsideClose?: boolean;
}

export function ActionModal({
  open,
  onClose,
  children,
  preventOutsideClose = false,
}: ActionModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="border-none bg-transparent p-0 shadow-none sm:max-w-[420px]"
        showCloseButton={!preventOutsideClose}
        {...(preventOutsideClose && {
          onInteractOutside: (e) => e.preventDefault(),
          onPointerDownOutside: (e) => e.preventDefault(),
          onEscapeKeyDown: (e) => e.preventDefault(),
        })}
      >
        <span className="sr-only">
          <DialogTitle>Action</DialogTitle>
        </span>
        {children}
      </DialogContent>
    </Dialog>
  );
}
