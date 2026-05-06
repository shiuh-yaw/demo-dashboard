"use client";

import { bankAccounts } from "@/lib/mock-data";
import { StatusBadge } from "@/components/ui/status-badge";
import { MonogramChip } from "@/components/ui/monogram-chip";
import { LinkButton } from "@/components/ui/link-button";

export function BankAccountsCard() {
  return (
    <div className="card">
      <div
        className="flex items-center justify-end"
        style={{ padding: "20px 28px 0 28px" }}
      >
        <LinkButton>Add bank account</LinkButton>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Bank</th>
            <th>Account</th>
            <th>Currency</th>
            <th>Added</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bankAccounts.map((acct) => (
            <tr key={acct.id}>
              <td>
                <div className="flex items-center gap-3">
                  <MonogramChip text={acct.bankName} />
                  <div>
                    <div className="text-sm font-semibold text-(--brand-fg)">
                      {acct.bankName}
                    </div>
                    <div className="text-xs text-(--brand-muted) mt-0.5">
                      {acct.accountType}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div className="text-sm font-medium text-(--brand-fg) tabular-nums">
                  •••• {acct.lastFour}
                </div>
                {acct.isPrimary && (
                  <div className="text-xs font-medium text-(--brand-primary) mt-0.5">
                    Primary
                  </div>
                )}
              </td>
              <td>
                <span className="text-(--brand-muted)">
                  {acct.currency} · {acct.country}
                </span>
              </td>
              <td>
                <span className="text-(--brand-muted)">{acct.addedDate}</span>
              </td>
              <td>
                <StatusBadge status={acct.status} />
              </td>
              <td>
                <div className="flex items-center justify-end gap-4">
                  {!acct.isPrimary && acct.status === "Active" && (
                    <LinkButton>Set primary</LinkButton>
                  )}
                  {acct.status === "Pending" && <LinkButton>Verify</LinkButton>}
                  <LinkButton tone="muted">Remove</LinkButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
