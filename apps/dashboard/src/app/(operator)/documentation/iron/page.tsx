/**
 * Iron Finance API Documentation Page
 *
 * Documentation for Iron Finance API endpoints for enterprise stablecoin payment infrastructure.
 * Reference: https://docs.iron.xyz
 */

import { CheckCircle2, Building2, Wallet, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  DocSection,
  CodeBlock,
  InlineCode,
  StatusPill,
  DocLinkCard,
  ApiStepList,
  ApiStep,
  CollapsibleCodeBlock,
} from "@/components/docs";

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
              Iron Finance API endpoints provide enterprise-grade stablecoin
              payment infrastructure with full customer lifecycle management,
              KYC, and third-party payments.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill>POST /api/iron/customers</StatusPill>
              <StatusPill>POST /api/iron/offramps</StatusPill>
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

        {/* Offramp Flow */}
        <DocSection title="Individual Customer Offramp Flow (Crypto to EUR)">
          <p className="text-xs text-slate-500 mb-4">
            Complete flow for a customer to offramp USDC to EUR bank account.
            Includes customer creation, KYC, bank registration, wallet setup,
            and offramp execution.
          </p>
          <ApiStepList>
            <ApiStep
              step={1}
              title="Create Customer"
              endpoint="POST /api/iron/customers"
            >
              <CollapsibleCodeBlock label="Request Body">
                {`{
  "type": "individual",
  "email": "user@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "country_code": "DE"  // Germany
}`}
              </CollapsibleCodeBlock>
            </ApiStep>

            <ApiStep
              step={2}
              title="Start KYC Verification"
              endpoint="POST /api/iron/customers/[id]/kyc"
              description="Response includes verification_url to redirect user."
            >
              <CollapsibleCodeBlock label="Request Body">
                {`{
  "return_url": "https://yourapp.com/kyc-complete"
}`}
              </CollapsibleCodeBlock>
            </ApiStep>

            <ApiStep
              step={3}
              title="Register EUR Bank Account (SEPA)"
              endpoint="POST /api/iron/banks"
            >
              <CollapsibleCodeBlock label="Request Body">
                {`{
  "customer_id": "customer_id_from_step_1",
  "currency": "EUR",
  "account_holder_name": "Jane Doe",
  "iban": "DE89370400440532013000",
  "bank_name": "Deutsche Bank"
}`}
              </CollapsibleCodeBlock>
            </ApiStep>

            <ApiStep
              step={4}
              title="Create Hosted Wallet"
              endpoint="POST /api/iron/wallets/hosted"
              description="For self-hosted wallets (user manages keys), use POST /api/iron/wallets/self-hosted with signature proof."
            >
              <CollapsibleCodeBlock label="Request Body">
                {`{
  "customer_id": "customer_id_from_step_1",
  "blockchain": "ethereum"
}`}
              </CollapsibleCodeBlock>
            </ApiStep>

            <ApiStep
              step={5}
              title="Get Offramp Quote"
              endpoint="POST /api/iron/quotes/offramp"
            >
              <CollapsibleCodeBlock label="Request Body">
                {`{
  "customer_id": "customer_id_from_step_1",
  "source_currency": "USDC",
  "destination_currency": "EUR",
  "source_amount": 100000000,  // 100 USDC (in smallest unit)
  "bank_account_id": "bank_id_from_step_3",
  "wallet_id": "wallet_id_from_step_4"
}`}
              </CollapsibleCodeBlock>
            </ApiStep>

            <ApiStep
              step={6}
              title="Execute Offramp"
              endpoint="POST /api/iron/offramps"
            >
              <CollapsibleCodeBlock label="Request Body">
                {`{
  "quote_id": "quote_id_from_step_5",
  "customer_id": "customer_id_from_step_1",
  "wallet_id": "wallet_id_from_step_4",
  "bank_account_id": "bank_id_from_step_3"
}`}
              </CollapsibleCodeBlock>
            </ApiStep>
          </ApiStepList>
        </DocSection>

        {/* All Endpoints */}
        <DocSection title="All API Endpoints">
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
              <h4 className="font-medium text-slate-900 mb-2 mt-3">
                Onramps/Offramps
              </h4>
              <ul className="space-y-1 text-slate-500 font-mono">
                <li>• POST /api/iron/onramps</li>
                <li>• GET /api/iron/onramps/[id]</li>
                <li>• POST /api/iron/offramps</li>
                <li>• GET /api/iron/offramps/[id]</li>
              </ul>
              <h4 className="font-medium text-slate-900 mb-2 mt-3">
                Third-Party
              </h4>
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
        </DocSection>

        {/* Supported Features */}
        <DocSection title="Supported Features">
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
        </DocSection>

        {/* Getting Started */}
        <DocSection title="Getting Started">
          <div className="space-y-3 text-xs text-slate-500">
            <div>
              <h4 className="font-medium text-slate-900 mb-1">
                1. Get API Access
              </h4>
              <p className="mb-2">
                Contact Iron Finance at{" "}
                <a
                  href="mailto:support@iron.xyz"
                  className="text-blue-600 hover:underline"
                >
                  support@iron.xyz
                </a>{" "}
                to request API access. Choose between sandbox (testing) or
                production environment.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-1">
                2. Configure Environment
              </h4>
              <p className="mb-2">
                Add to your <InlineCode>.env</InlineCode> file:
              </p>
              <CodeBlock>{`IRON_ENVIRONMENT=sandbox
IRON_API_KEY=your_api_key`}</CodeBlock>
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
        </DocSection>

        {/* Documentation Links */}
        <DocSection>
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
            <DocLinkCard
              href="https://docs.iron.xyz"
              title="Official Iron Docs"
              description="Complete API reference"
            />
            <DocLinkCard
              href="https://github.com/ironxyz/mcp-server"
              title="MCP Server"
              description="Test with Claude Desktop"
            />
          </div>
          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
            <div className="text-xs font-medium text-slate-900 mb-1">
              Internal Documentation
            </div>
            <ul className="space-y-1 text-xs text-slate-500">
              <li>
                • <InlineCode>IRON_FINANCE.claude.md</InlineCode> - Complete
                integration guide
              </li>
              <li>
                • <InlineCode>docs/IRON_API_EXAMPLES.md</InlineCode> - Practical
                API examples
              </li>
              <li>
                • <InlineCode>docs/IRON_QUICKSTART.md</InlineCode> - 5-minute
                quick start
              </li>
            </ul>
          </div>
        </DocSection>
      </div>
    </div>
  );
}
