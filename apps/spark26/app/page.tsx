import { z } from "zod";
import { resolveOrderState } from "@/lib/resolve-order-state.js";
import { EmptyInstructionsView } from "@/components/views/EmptyInstructionsView.js";
import { LookupErrorView } from "@/components/views/LookupErrorView.js";
import { CancelledOrderView } from "@/components/views/CancelledOrderView.js";
import { ConfirmationView } from "@/components/views/ConfirmationView.js";
import { PaymentView } from "@/components/views/PaymentView.js";
import { PendingView } from "@/components/views/PendingView.js";

export const dynamic = "force-dynamic";

const confirmationSchema = z.string().regex(/^[A-Za-z0-9]{1,32}$/);

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const { confirmation } = await searchParams;
  if (!confirmation) return <EmptyInstructionsView />;

  const parsed = confirmationSchema.safeParse(confirmation);
  if (!parsed.success) {
    return <LookupErrorView confirmation={confirmation} reason="malformed link" />;
  }

  const result = await resolveOrderState(parsed.data);

  switch (result.kind) {
    case "not_found":
      return <LookupErrorView confirmation={parsed.data} />;
    case "cancelled":
      return <CancelledOrderView attendeeName={result.order.attendeeName} />;
    case "paid":
      return <ConfirmationView state={result.order} />;
    case "unpaid":
      return <PaymentView state={result.order} confirmation={parsed.data} />;
    case "pending":
      return <PendingView state={result.order} confirmation={parsed.data} />;
  }
}
