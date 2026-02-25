/**
 * Iron Finance API Documentation Page
 *
 * Documentation for Iron Finance API endpoints for enterprise stablecoin payment infrastructure.
 * Reference: https://docs.iron.xyz
 */

import { ExternalLink, Terminal, ArrowRight, CheckCircle2, Building2, Wallet, CreditCard } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "../components/page-header";

export default function IronFinancePage() {
  return (
    <div>
      <PageHeader title="Iron Finance API" />

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
              Iron Finance API endpoints provide enterprise-grade stablecoin payment infrastructure
              with full customer lifecycle management, KYC, and third-party payments.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md font-mono text-xs text-slate-600">
                <Terminal className="w-3.5 h-3.5" />
                <span>POST /api/iron/customers</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md font-mono text-xs text-slate-600">
                <Terminal className="w-3.5 h-3.5" />
                <span>POST /api/iron/offramps</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Customer Management
          </h3>
          <p className="text-xs text-slate-500">
            Full CRUD for individual and business customers with KYC integration
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <Wallet className="w-4 h-4 text-green-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Hosted Wallets
          </h3>
          <p className="text-xs text-slate-500">
            Iron manages keys or users bring their own (self-hosted)
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Third-Party Payments
          </h3>
          <p className="text-xs text-slate-500">
            Businesses manage payments for users (B2B2C model)
          </p>
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

        {/* Complete Offramp Flow */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Individual Customer Offramp Flow (Crypto to EUR)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Complete flow for a customer to offramp USDC to EUR bank account.
            Includes customer creation, KYC, bank registration, wallet setup, and offramp execution.
          </p>

          <div className="space-y-4">
            {/* Step 1: Create Customer */}
            <div className="border-l-2 border-blue-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-blue-600">
                  Step 1
                </span>
                <span className="text-xs font-medium text-slate-900">
                  Create Customer
                </span>
              </div>
              <div className="mb-2">
                <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
                  POST /api/iron/customers
                </code>
              </div>
              <div className="text-xs text-slate-500 mb-2">Request Body:</div>
              <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto text-xs">
                {`{
  "type": "individual",
  "email": "user@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "country_code": "DE"  // Germany
}`}
              </pre>
            </div>

            {/* Step 2: Start KYC */}
            <div className="border-l-2 border-purple-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-3 h-3 text-purple-600" />
                <span className="text-xs font-semibold text-purple-600">
                  Step 2
                </span>
                <span className="text-xs font-medium text-slate-900">
                  Start KYC Verification
                </span>
              </div>
              <div className="mb-2">
                <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
                  POST /api/iron/customers/[id]/kyc
                </code>
              </div>
              <div className="text-xs text-slate-500 mb-2">Request Body:</div>
              <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto text-xs">
                {`{
  "return_url": "https://yourapp.com/kyc-complete"
}`}
              </pre>
              <div className="text-xs text-slate-500 mt-2">
                Response includes <code className="bg-slate-50 px-1 py-0.5 rounded">verification_url</code> to redirect user.
              </div>
            </div>

            {/* Step 3: Register Bank */}
            <div className="border-l-2 border-green-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-3 h-3 text-green-600" />
                <span className="text-xs font-semibold text-green-600">
                  Step 3
                </span>
                <span className="text-xs font-medium text-slate-900">
                  Register EUR Bank Account (SEPA)
                </span>
              </div>
              <div className="mb-2">
                <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
                  POST /api/iron/banks
                </code>
              </div>
              <div className="text-xs text-slate-500 mb-2">Request Body:</div>
              <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto text-xs">
                {`{
  "customer_id": "customer_id_from_step_1",
  "currency": "EUR",
  "account_holder_name": "Jane Doe",
  "iban": "DE89370400440532013000",
  "bank_name": "Deutsche Bank"
}`}
              </pre>
            </div>

            {/* Step 4: Create Wallet */}
            <div className="border-l-2 border-orange-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-3 h-3 text-orange-600" />
                <span className="text-xs font-semibold text-orange-600">
                  Step 4
                </span>
                <span className="text-xs font-medium text-slate-900">
                  Create Hosted Wallet
                </span>
              </div>
              <div className="mb-2">
                <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
                  POST /api/iron/wallets/hosted
                </code>
              </div>
              <div className="text-xs text-slate-500 mb-2">Request Body:</div>
              <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto text-xs">
                {`{
  "customer_id": "customer_id_from_step_1",
  "blockchain": "ethereum"
}`}
              </pre>
              <div className="text-xs text-slate-500 mt-2">
                For self-hosted wallets (user manages keys), use{" "}
                <code className="bg-slate-50 px-1 py-0.5 rounded">
                  POST /api/iron/wallets/self-hosted
                </code>{" "}
                with signature proof.
              </div>
            </div>

            {/* Step 5: Get Quote */}
            <div className="border-l-2 border-indigo-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-3 h-3 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-600">
                  Step 5
                </span>
                <span className="text-xs font-medium text-slate-900">
                  Get Offramp Quote
                </span>
              </div>
              <div className="mb-2">
                <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
                  POST /api/iron/quotes/offramp
                </code>
              </div>
              <div className="text-xs text-slate-500 mb-2">Request Body:</div>
              <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto text-xs">
                {`{
  "customer_id": "customer_id_from_step_1",
  "source_currency": "USDC",
  "destination_currency": "EUR",
  "source_amount": 100000000,  // 100 USDC (in smallest unit)
  "bank_account_id": "bank_id_from_step_3",
  "wallet_id": "wallet_id_from_step_4"
}`}
              </pre>
            </div>

            {/* Step 6: Execute */}
            <div className="border-l-2 border-pink-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-3 h-3 text-pink-600" />
                <span className="text-xs font-semibold text-pink-600">
                  Step 6
                </span>
                <span className="text-xs font-medium text-slate-900">
                  Execute Offramp
                </span>
              </div>
              <div className="mb-2">
                <code className="bg-slate-50 px-2 py-1 rounded text-xs font-mono">
                  POST /api/iron/offramps
                </code>
              </div>
              <div className="text-xs text-slate-500 mb-2">Request Body:</div>
              <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto text-xs">
                {`{
  "quote_id": "quote_id_from_step_5",
  "customer_id": "customer_id_from_step_1",
  "wallet_id": "wallet_id_from_step_4",
  "bank_account_id": "bank_id_from_step_3"
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
                  GET /api/iron/offramps/[id]
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* All Endpoints */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            All API Endpoints
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Customers</h4>
              <ul className="space-y-1 text-slate-500 font-mono">
                <li>• POST /api/iron/customers</li>
                <li>• GET /api/iron/customers</li>
                <li>• GET /api/iron/customers/[id]</li>
                <li>• PATCH /api/iron/customers/[id]</li>
              </ul>

              <h4 className="font-medium text-slate-900 mb-2 mt-3">Wallets</h4>
              <ul className="space-y-1 text-slate-500 font-mono">
                <li>• POST /api/iron/wallets/hosted</li>
                <li>• POST /api/iron/wallets/self-hosted</li>
                <li>• GET /api/iron/wallets/[id]</li>
              </ul>

              <h4 className="font-medium text-slate-900 mb-2 mt-3">Banks</h4>
              <ul className="space-y-1 text-slate-500 font-mono">
                <li>• POST /api/iron/banks</li>
                <li>• GET /api/iron/banks/[id]</li>
                <li>• DELETE /api/iron/banks/[id]</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Quotes</h4>
              <ul className="space-y-1 text-slate-500 font-mono">
                <li>• POST /api/iron/quotes/onramp</li>
                <li>• POST /api/iron/quotes/offramp</li>
                <li>• GET /api/iron/quotes/[id]</li>
              </ul>

              <h4 className="font-medium text-slate-900 mb-2 mt-3">Onramps/Offramps</h4>
              <ul className="space-y-1 text-slate-500 font-mono">
                <li>• POST /api/iron/onramps</li>
                <li>• GET /api/iron/onramps/[id]</li>
                <li>• POST /api/iron/offramps</li>
                <li>• GET /api/iron/offramps/[id]</li>
              </ul>

              <h4 className="font-medium text-slate-900 mb-2 mt-3">Third-Party</h4>
              <ul className="space-y-1 text-slate-500 font-mono">
                <li>• POST /api/iron/third-party-payments</li>
                <li>• GET /api/iron/third-party-payments/[id]</li>
              </ul>

              <h4 className="font-medium text-slate-900 mb-2 mt-3">KYC</h4>
              <ul className="space-y-1 text-slate-500 font-mono">
                <li>• POST /api/iron/customers/[id]/kyc</li>
                <li>• GET /api/iron/customers/[id]/kyc</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Supported Features */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Supported Features
          </h3>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Blockchains</h4>
              <ul className="space-y-1 text-slate-500">
                <li>• Ethereum</li>
                <li>• Solana</li>
                <li>• Polygon</li>
                <li>• Arbitrum</li>
                <li>• Base</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Crypto</h4>
              <ul className="space-y-1 text-slate-500">
                <li>• USDC</li>
                <li>• USDT</li>
                <li>• USDB</li>
                <li>• EURC</li>
              </ul>
              <h4 className="font-medium text-slate-900 mb-2 mt-3">Fiat</h4>
              <ul className="space-y-1 text-slate-500">
                <li>• USD, EUR, GBP</li>
                <li>• BRL, MXN</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Payment Rails</h4>
              <ul className="space-y-1 text-slate-500">
                <li>• ACH (US)</li>
                <li>• Wire (International)</li>
                <li>• SEPA (Europe)</li>
                <li>• PIX (Brazil)</li>
                <li>• Faster Payments (UK)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Getting Started
          </h3>
          <div className="space-y-3 text-xs text-slate-500">
            <div>
              <h4 className="font-medium text-slate-900 mb-1">
                1. Get API Access
              </h4>
              <p className="mb-2">
                Contact Iron Finance at{" "}
                <a href="mailto:support@iron.xyz" className="text-blue-600 hover:underline">
                  support@iron.xyz
                </a>{" "}
                to request API access. Choose between sandbox (testing) or production environment.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-1">
                2. Configure Environment
              </h4>
              <p className="mb-2">
                Add to your <code className="bg-slate-50 px-1 py-0.5 rounded">.env</code> file:
              </p>
              <pre className="bg-slate-50 p-2 rounded-md overflow-x-auto">
{`IRON_ENVIRONMENT=sandbox
IRON_API_KEY=your_api_key`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-1">
                3. Test Integration
              </h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Use sandbox environment for testing</li>
                <li>Create test customers and wallets</li>
                <li>Test complete onramp/offramp flows</li>
                <li>Move to production when ready</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Documentation Links */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Complete Documentation
              </h3>
              <p className="text-xs text-slate-500">
                Detailed guides and API examples
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="https://docs.iron.xyz"
              target="_blank"
              className="inline-flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group"
            >
              <div>
                <div className="text-xs font-medium text-slate-900">
                  Official Iron Docs
                </div>
                <div className="text-xs text-slate-500">
                  Complete API reference
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>
            <Link
              href="https://github.com/ironxyz/mcp-server"
              target="_blank"
              className="inline-flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group"
            >
              <div>
                <div className="text-xs font-medium text-slate-900">
                  MCP Server
                </div>
                <div className="text-xs text-slate-500">
                  Test with Claude Desktop
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>
          </div>
          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
            <div className="text-xs font-medium text-slate-900 mb-1">
              Internal Documentation
            </div>
            <ul className="space-y-1 text-xs text-slate-500">
              <li>• <code className="bg-white px-1 py-0.5 rounded">IRON_FINANCE.claude.md</code> - Complete integration guide</li>
              <li>• <code className="bg-white px-1 py-0.5 rounded">docs/IRON_API_EXAMPLES.md</code> - Practical API examples</li>
              <li>• <code className="bg-white px-1 py-0.5 rounded">docs/IRON_QUICKSTART.md</code> - 5-minute quick start</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
