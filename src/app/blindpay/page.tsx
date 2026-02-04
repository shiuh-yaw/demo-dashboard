/**
 * BlindPay API Documentation Page
 *
 * Documentation for BlindPay API endpoints for stablecoin to fiat conversions.
 * Reference: https://www.blindpay.com/docs/getting-started/overview
 */

import { ExternalLink, Terminal, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "../components/page-header";

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
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md font-mono text-xs text-slate-600">
                <Terminal className="w-3.5 h-3.5" />
                <span>POST /api/blindpay/payouts/quote</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md font-mono text-xs text-slate-600">
                <Terminal className="w-3.5 h-3.5" />
                <span>POST /api/blindpay/payins/quote</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documentation */}
      <div className="space-y-6">
        {/* Authentication */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Authentication
          </h3>
          <div className="space-y-3 text-xs text-slate-500">
            <div>
              <h4 className="font-medium text-slate-900 mb-1">
                Request Headers
              </h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>
                  <code className="bg-slate-50 px-1 py-0.5 rounded">
                    Authorization: Bearer &lt;JWT&gt;
                  </code>{" "}
                  - Dynamic JWT token
                </li>
                <li>
                  <code className="bg-slate-50 px-1 py-0.5 rounded">
                    x-dynamic-environment-id
                  </code>{" "}
                  - Your Dynamic environment ID
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Payout Flow */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Payout Flow (Stablecoin to Fiat)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Convert stablecoins from your wallet to fiat currency in a bank
            account. Two-step process: create quote, then execute after token
            approval.
          </p>

          <div className="space-y-4">
            {/* Step 1: Quote */}
            <div className="border-l-2 border-blue-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-blue-600">
                  Step 1
                </span>
                <span className="text-xs font-medium text-slate-900">
                  Create Payout Quote
                </span>
              </div>
              <div className="mb-2">
                <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
                  POST /api/blindpay/payouts/quote
                </code>
              </div>
              <div className="text-xs text-slate-500 mb-2">Request Body:</div>
              <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto text-xs">
                {`{
  "bank_account_id": "ba_...",      // BlindPay bank account ID
  "currency_type": "sender",        // "sender" or "receiver"
  "cover_fees": false,              // Whether to cover fees
  "request_amount": 100.00,         // Amount in dollars
  "network": "base_sepolia",        // Network: base_sepolia, base, ethereum, etc.
  "token": "USDC"                   // Token: USDC, USDT, or USDB
}`}
              </pre>
              <div className="text-xs text-slate-500 mt-2">
                Response includes{" "}
                <code className="bg-slate-50 px-1 py-0.5 rounded">
                  quote_id
                </code>{" "}
                for next step.
              </div>
            </div>

            {/* Step 2: Execute */}
            <div className="border-l-2 border-green-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-3 h-3 text-green-600" />
                <span className="text-xs font-semibold text-green-600">
                  Step 2
                </span>
                <span className="text-xs font-medium text-slate-900">
                  Approve Tokens & Execute
                </span>
              </div>
              <div className="text-xs text-slate-500 mb-2">
                1. Approve tokens on frontend using the amount from quote
              </div>
              <div className="mb-2">
                <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
                  POST /api/blindpay/payouts/execute
                </code>
              </div>
              <div className="text-xs text-slate-500 mb-2">Request Body:</div>
              <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto text-xs">
                {`{
  "quote_id": "quote_...",          // From step 1
  "approval_tx_hash": "0x..."       // Optional: transaction hash
}`}
              </pre>
            </div>

            {/* Status Check */}
            <div className="border-l-2 border-slate-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-slate-900">
                  Check Status
                </span>
              </div>
              <div className="mb-2">
                <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
                  GET /api/blindpay/payouts/[id]
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Payin Flow */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Payin Flow (Fiat to Stablecoin)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Convert fiat currency from a bank account to stablecoins in your
            wallet. Two-step process: create quote with banking details, then
            execute after fiat deposit.
          </p>

          <div className="space-y-4">
            {/* Step 1: Quote */}
            <div className="border-l-2 border-blue-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-blue-600">
                  Step 1
                </span>
                <span className="text-xs font-medium text-slate-900">
                  Create Payin Quote
                </span>
              </div>
              <div className="mb-2">
                <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
                  POST /api/blindpay/payins/quote
                </code>
              </div>
              <div className="text-xs text-slate-500 mb-2">Request Body:</div>
              <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto text-xs">
                {`{
  "blockchain_wallet_id": "bw_...", // BlindPay blockchain wallet ID
  "currency_type": "sender",         // "sender" or "receiver"
  "cover_fees": false,               // Whether to cover fees
  "request_amount": 100.00,          // Amount in dollars
  "payment_method": "ach",           // "ach", "wire", "pix", or "sepa"
  "token": "USDC"                    // Token: USDC, USDT, or USDB
}`}
              </pre>
              <div className="text-xs text-slate-500 mt-2">
                Response includes{" "}
                <code className="bg-slate-50 px-1 py-0.5 rounded">
                  payin_quote_id
                </code>{" "}
                and banking details for deposit.
              </div>
            </div>

            {/* Step 2: Execute */}
            <div className="border-l-2 border-green-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-3 h-3 text-green-600" />
                <span className="text-xs font-semibold text-green-600">
                  Step 2
                </span>
                <span className="text-xs font-medium text-slate-900">
                  Deposit Fiat & Execute
                </span>
              </div>
              <div className="text-xs text-slate-500 mb-2">
                1. Deposit fiat to the bank account provided in quote
              </div>
              <div className="mb-2">
                <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
                  POST /api/blindpay/payins/execute
                </code>
              </div>
              <div className="text-xs text-slate-500 mb-2">Request Body:</div>
              <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto text-xs">
                {`{
  "payin_quote_id": "payin_quote_..." // From step 1
}`}
              </pre>
            </div>

            {/* Status Check */}
            <div className="border-l-2 border-slate-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-slate-900">
                  Check Status
                </span>
              </div>
              <div className="mb-2">
                <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
                  GET /api/blindpay/payins/[id]
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Rates */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Exchange Rates
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Get exchange rates for currency conversions. Returns FX quote if
            available, otherwise falls back to full quote if bank account
            provided.
          </p>
          <div className="mb-2">
            <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
              GET /api/blindpay/rates
            </code>
          </div>
          <div className="text-xs text-slate-500 mb-2">Query Parameters:</div>
          <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto text-xs">
            {`?from=USDC                    // USDC, USDT, or USDB
&to=USD                      // USD, BRL, MXN, COP, ARS, or stablecoin
&amount=1000                 // Amount to convert
&currency_type=sender         // "sender" or "receiver"
&bank_account_id=ba_...       // Optional: for full quote
&network=base_sepolia         // Optional: required if bank_account_id provided
&cover_fees=false             // Optional: default false`}
          </pre>
        </div>

        {/* Supported Networks & Tokens */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Supported Networks & Tokens
          </h3>
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
        </div>

        {/* Test Accounts & Sandbox */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Test Accounts & Sandbox
          </h3>
          <div className="space-y-3 text-xs text-slate-500">
            <div>
              <h4 className="font-medium text-slate-900 mb-1">
                Testnet Support
              </h4>
              <p className="mb-2">
                BlindPay supports testnet networks for development. Use{" "}
                <code className="bg-slate-50 px-1 py-0.5 rounded">
                  base_sepolia
                </code>{" "}
                network with testnet stablecoins for testing.
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
        </div>

        {/* External Documentation */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Official Documentation
              </h3>
              <p className="text-xs text-slate-500">
                For detailed API reference and integration guides
              </p>
            </div>
            <Link
              href="https://www.blindpay.com/docs/getting-started/overview"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View BlindPay Docs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
