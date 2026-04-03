"use client";

import { useMutation } from "@tanstack/react-query";
import {
  sendTokenTransaction,
  type SendTokenParams,
} from "@/lib/transactions/send-token-transaction";

export function useSendTokenTransaction() {
  return useMutation({
    mutationFn: (params: SendTokenParams) => sendTokenTransaction(params),
  });
}
