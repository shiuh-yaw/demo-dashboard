import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@dynamic-demos/dynamic";
import type { TransactionResponse } from "@dynamic-demos/fireblocks";
import { getFireblocksClient } from "@/lib/fireblocks";
import {
  findOutgoingForward,
  isOutgoingInProgress,
  isTxCompleted,
} from "@/lib/deposit-forward";
import type {
  DepositItem,
  DepositStatus,
  StatusResponse,
} from "@/lib/deposit-status-types";

const LIST_LIMIT = 50;

function statusForIncoming(
  incoming: TransactionResponse,
  forward: TransactionResponse | undefined,
): Exclude<DepositStatus, "waiting"> {
  if (String(incoming.status).toUpperCase() === "BLOCKED") {
    return "screening_failed";
  }
  if (forward && isTxCompleted(forward.status)) {
    return "complete";
  }
  if (forward && isOutgoingInProgress(forward.status)) {
    return "transferring";
  }
  if (isTxCompleted(incoming.status)) {
    return "screening";
  }
  return "received";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vaultId: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vaultId } = await params;
    const asset = request.nextUrl.searchParams.get("asset");
    if (!asset) {
      return NextResponse.json(
        { error: "asset query param required" },
        { status: 400 },
      );
    }

    const client = getFireblocksClient();

    const listIncoming = () =>
      client.listTransactions({
        destId: vaultId,
        destType: "VAULT_ACCOUNT",
        assets: asset,
        limit: LIST_LIMIT,
        sort: "DESC",
        orderBy: "createdAt",
      });

    const listOutgoing = () =>
      client.listTransactions({
        sourceId: vaultId,
        sourceType: "VAULT_ACCOUNT",
        assets: asset,
        limit: LIST_LIMIT,
        sort: "DESC",
        orderBy: "createdAt",
      });

    const incomingList = await listIncoming();

    if (incomingList.length === 0) {
      const response: StatusResponse = { asset, deposits: [] };
      return NextResponse.json(response);
    }

    const outgoingTxs = await listOutgoing();

    const deposits: DepositItem[] = incomingList.map((incoming) => {
      const forward = findOutgoingForward(outgoingTxs, incoming.id);
      const status = statusForIncoming(incoming, forward);
      return {
        incomingTxId: incoming.id,
        txHash: incoming.txHash?.trim() || null,
        forwardTxHash: forward?.txHash?.trim() || null,
        amount: incoming.amount,
        status,
        outgoingTxId: forward?.id ?? null,
        createdAt: incoming.createdAt,
        amlScreening: incoming.amlScreening ?? null,
        travelRuleScreening: incoming.travelRuleScreening ?? null,
      };
    });

    const response: StatusResponse = { asset, deposits };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[deposit/status]", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 },
    );
  }
}
