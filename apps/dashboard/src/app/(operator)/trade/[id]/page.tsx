/**
 * Edit Trade Config Page
 *
 * Page for editing an existing Trade configuration.
 */

import { notFound } from "next/navigation";
import { getTradeConfig } from "@/lib/actions/trade";
import { TradeConfigEditor } from "./trade-config-editor";

interface EditTradeConfigPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTradeConfigPage({
  params,
}: EditTradeConfigPageProps) {
  const { id } = await params;
  const result = await getTradeConfig(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <TradeConfigEditor config={result.data} />;
}
