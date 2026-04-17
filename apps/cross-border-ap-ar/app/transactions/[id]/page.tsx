import { TransactionDetail } from "@/components/transaction-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <TransactionDetail id={decodeURIComponent(id)} />;
}
