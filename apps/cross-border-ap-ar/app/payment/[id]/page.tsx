import { PaymentFlow } from "@/components/payment-flow";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentPage({ params }: PageProps) {
  const { id } = await params;
  return <PaymentFlow id={decodeURIComponent(id)} />;
}
