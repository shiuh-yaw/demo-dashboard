"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { DISBURSEMENTS } from "@/lib/mock-data";
import type { Disbursement } from "@/lib/mock-data";
import { generateDisbursement } from "@/lib/disbursement-generator";

export type CompletedTransaction = {
  id: string;
  paidAt: string;
  disbursement: Disbursement;
  offrampOrderId: string;
  onrampOrderId: string;
  depositAddress: string;
  blockchain: "Ethereum";
  rate: number;
  expiresAt: string;
};

type MarkPaidResult = {
  offrampOrderId: string;
  onrampOrderId: string;
  depositAddress: string;
  blockchain: "Ethereum";
  rate: number;
  expiresAt: string;
};

interface DisbursementContextValue {
  disbursements: Disbursement[];
  transactions: CompletedTransaction[];
  markPaid: (id: string, result: MarkPaidResult) => void;
}

const DisbursementContext = createContext<DisbursementContextValue | null>(null);

let idCounter = 893;

function getNextId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const num = String(idCounter++).padStart(4, "0");
  return `ETY-${year}-${month}-${num}`;
}

export function DisbursementProvider({ children }: { children: ReactNode }) {
  const [disbursements, setDisbursements] = useState<Disbursement[]>(() =>
    DISBURSEMENTS.map((d) => ({ ...d })),
  );
  const [transactions, setTransactions] = useState<CompletedTransaction[]>([]);
  const disbursementsRef = useRef(disbursements);
  disbursementsRef.current = disbursements;

  const markPaid = useCallback((id: string, result: MarkPaidResult) => {
    const disbursement = disbursementsRef.current.find((d) => d.id === id);
    if (!disbursement) return;

    const transaction: CompletedTransaction = {
      id,
      paidAt: new Date().toISOString(),
      disbursement: { ...disbursement },
      ...result,
    };

    const newId = getNextId();
    const replacement = generateDisbursement(newId);

    setTransactions((prev) => [transaction, ...prev]);
    setDisbursements((prev) => [
      ...prev.filter((d) => d.id !== id),
      replacement,
    ]);
  }, []);

  return (
    <DisbursementContext.Provider value={{ disbursements, transactions, markPaid }}>
      {children}
    </DisbursementContext.Provider>
  );
}

export function useDisbursements(): DisbursementContextValue {
  const ctx = useContext(DisbursementContext);
  if (!ctx)
    throw new Error(
      "useDisbursements must be used within DisbursementProvider",
    );
  return ctx;
}
