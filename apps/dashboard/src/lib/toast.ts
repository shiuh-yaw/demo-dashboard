"use client";

/**
 * Operator toast helpers. One-liners over droplet's sonner-based `toast` so
 * mutating call sites give consistent success/error feedback. Mount the single
 * `<Toaster />` once in the operator layout.
 */

import { toast } from "@/components/droplet-client";

export function toastSuccess(message: string): void {
  toast.success(message);
}

export function toastError(message: string): void {
  toast.error(message);
}
