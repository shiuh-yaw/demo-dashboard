/**
 * BlindPay API Documentation Page
 *
 * Documentation for BlindPay API endpoints for stablecoin to fiat conversions.
 * Reference: https://www.blindpay.com/docs/getting-started/overview
 */

import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  DocSection,
  InlineCode,
  EndpointBadge,
  StatusPill,
  DocLink,
  ApiStepList,
  ApiStep,
  CollapsibleCodeBlock,
  CodeBlock,
} from "@/components/docs";

export default function BlindPayPage() {
  return (
    <div>
      <PageHeader title="BlindPay API" />

      {/* Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              API Active
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              BlindPay API endpoints are ready to accept requests. Use the
              endpoints below for stablecoin to fiat conversions (payouts) and
              fiat to stablecoin conversions (payins).
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill>POST /api/blindpay/payouts/quote</StatusPill>
              <StatusPill>POST /api/blindpay/payins/quote</StatusPill>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Authentication */}
        <DocSection title="Authentication">
          <div className="space-y-3 text-xs text-slate-500">
            <div>
              <h4 className="font-medium text-slate-900 mb-1">
                Request Headers
              </h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>
                  <InlineCode>Authorization: Bearer &lt;JWT&gt;</InlineCode> -
                  Dynamic JWT token
                </li>
                <li>
                  <InlineCode>x-dynamic-environment-id</InlineCode> - Your
                  Dynamic environment ID
                </li>
              </ul>
            </div>
          </div>
        </DocSection>

        {/* Payout Flow */}
        <DocSection title="Payout Flow (Stablecoin to Fiat)">
          <p className="text-xs text-slate-500 mb-4">
            Convert stablecoins from your wallet to fiat currency in a bank
            account. Two-step process: create quote, then execute after token
            approval.
          </p>
          <ApiStepList>
            <ApiStep
              step={1}
              title="Create Payout Quote"
              endpoint="POST /api/blindpay/payouts/quote"
              description="Response includes quote_id for next step."
            >
              <CollapsibleCodeBlock label="Request Body">
                {`{
  "bank_account_id": "ba_...",      // BlindPay bank account ID
  "currency_type": "sender",        // "sender" or "receiver"
  "cover_fees": false,              // Whether to cover fees
  "request_amount": 100.00,         // Amount in dollars
  "network": "base_sepolia",        // Network: base_sepolia, base, ethereum, etc.
  "token": "USDC"                   // Token: USDC, USDT, or USDB
}`}
              </CollapsibleCodeBlock>
            </ApiStep>

            <ApiStep
              step={2}
              title="Approve Tokens & Execute"
              endpoint="POST /api/blindpay/payouts/execute"
              description="Approve tokens on frontend using the amount from quote."
            >
              <CollapsibleCodeBlock label="Request Body">
                {`{
  "quote_id": "quote_...",          // From step 1
  "approval_tx_hash": "0x..."       // Optional: transaction hash
}`}
              </CollapsibleCodeBlock>
            </ApiStep>
          </ApiStepList>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-900">
                Check Status
              </span>
              <EndpointBadge>GET /api/blindpay/payouts/[id]</EndpointBadge>
            </div>
          </div>
        </DocSection>

        {/* Payin Flow */}
        <DocSection title="Payin Flow (Fiat to Stablecoin)">
          <p className="text-xs text-slate-500 mb-4">
            Convert fiat currency from a bank account to stablecoins in your
            wallet. Two-step process: create quote with banking details, then
            execute after fiat deposit.
          </p>
          <ApiStepList>
            <ApiStep
              step={1}
              title="Create Payin Quote"
              endpoint="POST /api/blindpay/payins/quote"
              description="Response includes payin_quote_id and banking details for deposit."
            >
              <CollapsibleCodeBlock label="Request Body">
                {`{
  "blockchain_wallet_id": "bw_...", // BlindPay blockchain wallet ID
  "currency_type": "sender",         // "sender" or "receiver"
  "cover_fees": false,               // Whether to cover fees
  "request_amount": 100.00,          // Amount in dollars
  "payment_method": "ach",           // "ach", "wire", "pix", or "sepa"
  "token": "USDC"                    // Token: USDC, USDT, or USDB
}`}
              </CollapsibleCodeBlock>
            </ApiStep>

            <ApiStep
              step={2}
              title="Deposit Fiat & Execute"
              endpoint="POST /api/blindpay/payins/execute"
              description="Deposit fiat to the bank account provided in quote."
            >
              <CollapsibleCodeBlock label="Request Body">
                {`{
  "payin_quote_id": "payin_quote_..." // From step 1
}`}
              </CollapsibleCodeBlock>
            </ApiStep>
          </ApiStepList>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-900">
                Check Status
              </span>
              <EndpointBadge>GET /api/blindpay/payins/[id]</EndpointBadge>
            </div>
          </div>
        </DocSection>

        {/* Rates */}
        <DocSection title="Exchange Rates">
          <p className="text-xs text-slate-500 mb-4">
            Get exchange rates for currency conversions. Returns FX quote if
            available, otherwise falls back to full quote if bank account
            provided.
          </p>
          <div className="mb-2">
            <EndpointBadge>GET /api/blindpay/rates</EndpointBadge>
          </div>
          <div className="text-xs text-slate-500 mb-2">Query Parameters:</div>
          <CodeBlock>
            {`?from=USDC                    // USDC, USDT, or USDB
&to=USD                      // USD, BRL, MXN, COP, ARS, or stablecoin
&amount=1000                 // Amount to convert
&currency_type=sender         // "sender" or "receiver"
&bank_account_id=ba_...       // Optional: for full quote
&network=base_sepolia         // Optional: required if bank_account_id provided
&cover_fees=false             // Optional: default false`}
          </CodeBlock>
        </DocSection>

        {/* Supported Networks & Tokens */}
        <DocSection title="Supported Networks & Tokens">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Networks</h4>
              <ul className="space-y-1 text-slate-500">
                <li>• base_sepolia</li>
                <li>• base</li>
                <li>• ethereum</li>
                <li>• arbitrum</li>
                <li>• polygon</li>
                <li>• stellar</li>
                <li>• tron</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Stablecoins</h4>
              <ul className="space-y-1 text-slate-500">
                <li>• USDC</li>
                <li>• USDT</li>
                <li>• USDB</li>
              </ul>
              <h4 className="font-medium text-slate-900 mb-2 mt-3">
                Fiat Currencies
              </h4>
              <ul className="space-y-1 text-slate-500">
                <li>• USD</li>
                <li>• BRL</li>
                <li>• MXN</li>
                <li>• COP</li>
                <li>• ARS</li>
              </ul>
            </div>
          </div>
        </DocSection>

        {/* Test Accounts & Sandbox */}
        <DocSection title="Test Accounts & Sandbox">
          <div className="space-y-3 text-xs text-slate-500">
            <div>
              <h4 className="font-medium text-slate-900 mb-1">
                Testnet Support
              </h4>
              <p className="mb-2">
                BlindPay supports testnet networks for development. Use{" "}
                <InlineCode>base_sepolia</InlineCode> network with testnet
                stablecoins for testing.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-1">Test Instance</h4>
              <p className="mb-2">
                The example codebase includes a test instance ID that may be
                used for development. Contact BlindPay support to confirm test
                account access and obtain your own test instance credentials.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-1">
                Getting Started
              </h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Contact BlindPay support for test/sandbox access</li>
                <li>Use testnet networks (e.g., Base Sepolia)</li>
                <li>Complete KYC verification in test environment</li>
                <li>Add test bank accounts for payout testing</li>
              </ul>
            </div>
          </div>
        </DocSection>

        {/* External Documentation */}
        <DocSection>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Official Documentation
              </h3>
              <p className="text-xs text-slate-500">
                For detailed API reference and integration guides
              </p>
            </div>
            <DocLink href="https://www.blindpay.com/docs/getting-started/overview">
              View BlindPay Docs
            </DocLink>
          </div>
        </DocSection>
      </div>
    </div>
  );
}
