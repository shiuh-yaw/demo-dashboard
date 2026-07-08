/**
 * Checkout API Documentation
 *
 * Comprehensive guide to the Checkout Transaction API with LI.FI cross-chain swap integration.
 */

import { CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  DocSection,
  InlineCode,
  EndpointBadge,
  DocLink,
  ApiStepList,
  ApiStep,
  CollapsibleCodeBlock,
} from "@/components/docs";

export default function CheckoutDocumentationPage() {
  return (
    <div>
      <PageHeader title="Checkout API Documentation" />

      {/* Overview */}
      <DocSection title="Overview" className="mb-6">
        <div className="space-y-3 text-xs text-slate-500">
          <p>
            The Checkout API provides a complete transaction lifecycle
            management system with integrated LI.FI cross-chain swap
            functionality. Transactions progress through a series of states from
            initialization to completion, with automatic status monitoring via
            background workers.
          </p>
          <p>
            LI.FI integration allows users to swap tokens across different
            chains seamlessly. The API handles quote fetching, route selection,
            transaction submission, and status monitoring automatically.
          </p>
        </div>
      </DocSection>

      {/* Authentication */}
      <DocSection title="Authentication" className="mb-6">
        <div className="space-y-4 text-xs text-slate-500">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">
              Public Endpoints
            </h4>
            <p className="mb-2">
              These endpoints do not require authentication:
            </p>
            <ul className="space-y-1 list-disc list-inside ml-2">
              <li>
                <InlineCode>GET /api/checkouts/[id]</InlineCode> - Get checkout
                configuration
              </li>
              <li>
                <InlineCode>POST /api/checkouts/[id]/transactions</InlineCode> -
                Initialize transaction
              </li>
              <li>
                <InlineCode>
                  GET /api/checkouts/[id]/transactions/[txId]/status
                </InlineCode>{" "}
                - Get transaction status
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-2">
              Authenticated Endpoints
            </h4>
            <p className="mb-2">
              These endpoints require Bearer token authentication:
            </p>
            <ul className="space-y-1 list-disc list-inside ml-2">
              <li>
                <InlineCode>Authorization: Bearer &lt;JWT&gt;</InlineCode> -
                Dynamic JWT token
              </li>
              <li>
                <InlineCode>x-dynamic-environment-id</InlineCode> - Your Dynamic
                environment ID
              </li>
            </ul>
          </div>
        </div>
      </DocSection>

      {/* Transaction Lifecycle */}
      <DocSection title="Transaction Lifecycle" className="mb-6">
        <ApiStepList>
          <ApiStep
            step={1}
            title="Initialize Transaction"
            endpoint="POST /api/checkouts/[checkoutId]/transactions"
            description='Create a new transaction or retrieve existing one by externalId. Returns transaction with status "initialized".'
          >
            <CollapsibleCodeBlock label="Request Body">
              {`{
  "externalId": "optional-unique-id",  // Optional: for idempotency
  "metadata": {                        // Optional: custom metadata
    "orderId": "123",
    "userId": "user-456"
  }
}`}
            </CollapsibleCodeBlock>
            <CollapsibleCodeBlock label="Response">
              {`{
  "success": true,
  "data": {
    "transaction": {
      "id": "tx-id",
      "checkoutId": "checkout-id",
      "status": "initialized",
      "externalId": "optional-unique-id",
      "metadata": { ... },
      "createdAt": "2025-01-08T10:00:00Z"
    },
    "created": true
  }
}`}
            </CollapsibleCodeBlock>
          </ApiStep>

          <ApiStep
            step={2}
            title="Get LI.FI Quote"
            endpoint="POST /api/checkouts/[checkoutId]/transactions/[txId]/quote"
            description='Fetches swap routes from LI.FI and automatically stores route data in the transaction. Updates transaction status to "draft". Requires authentication.'
          >
            <CollapsibleCodeBlock label="Request Body">
              {`{
  "fromChainId": 1,            // Source chain ID (e.g., 1 for Ethereum)
  "toChainId": 137,            // Destination chain ID (e.g., 137 for Polygon)
  "fromTokenAddress": "0x...", // Source token address
  "toTokenAddress": "0x...",   // Destination token address
  "fromAmount": "1000000",     // Amount in smallest unit (wei)
  "fromAddress": "0x...",      // Sender wallet address
  "toAddress": "0x..."         // Recipient wallet address
}`}
            </CollapsibleCodeBlock>
            <CollapsibleCodeBlock label="Response">
              {`{
  "success": true,
  "data": {
    "quote": {
      "route": {
        "id": "route-id",
        "fromChainId": 1,
        "toChainId": 137,
        "fromToken": { "address": "0x...", "symbol": "USDC", "decimals": 6 },
        "toToken": { "address": "0x...", "symbol": "USDC", "decimals": 6 },
        "fromAmount": "1000000",
        "toAmount": "990000",
        "gasCostUSD": "2.50",
        "steps": [ ... ]
      },
      "integrator": "your-integrator-id"
    },
    "transaction": { "id": "tx-id", "status": "draft", ... }
  }
}`}
            </CollapsibleCodeBlock>
          </ApiStep>

          <ApiStep
            step={3}
            title="Submit Transaction"
            endpoint="POST /api/checkouts/[checkoutId]/transactions/[txId]/submit"
            description='Submit the transaction hash after the user executes the swap on-chain. Updates status to "submitted" and enqueues background monitoring. Requires authentication.'
          >
            <CollapsibleCodeBlock label="Request Body">
              {`{
  "txHash": "0x..."  // Transaction hash from the blockchain
}`}
            </CollapsibleCodeBlock>
            <CollapsibleCodeBlock label="Response">
              {`{
  "success": true,
  "data": {
    "transaction": { "id": "tx-id", "status": "submitted", "txHash": "0x...", ... },
    "monitorId": "qstash-message-id"
  }
}`}
            </CollapsibleCodeBlock>
          </ApiStep>

          <ApiStep
            step={4}
            title="Monitor Status"
            endpoint="GET /api/checkouts/[checkoutId]/transactions/[txId]/status"
            description="Check transaction status. Background workers automatically poll LI.FI for transfer status and update the transaction. Public endpoint - no authentication required."
          >
            <CollapsibleCodeBlock label="Response">
              {`{
  "success": true,
  "data": {
    "status": "pending",
    "transaction": {
      "id": "tx-id",
      "status": "pending",
      "txHash": "0x...",
      "explorerUrl": "https://explorer.li.fi/...",
      "fromToken": { ... },
      "toToken": { ... },
      ...
    }
  }
}`}
            </CollapsibleCodeBlock>
          </ApiStep>
        </ApiStepList>
      </DocSection>

      {/* Transaction Statuses */}
      <DocSection title="Transaction Statuses" className="mb-6">
        <div className="space-y-2 text-xs text-slate-500">
          {[
            {
              status: "initialized",
              desc: "Transaction created, awaiting route selection",
            },
            {
              status: "draft",
              desc: "Route selected and quote fetched, ready to submit",
            },
            {
              status: "submitted",
              desc: "Transaction hash submitted, awaiting confirmation",
            },
            {
              status: "pending",
              desc: "Awaiting cross-chain transfer completion (monitored by background workers)",
            },
          ].map(({ status, desc }) => (
            <div key={status} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <InlineCode>{status}</InlineCode>
                <span className="ml-2">{desc}</span>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <code className="bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded text-xs font-medium">
                confirmed
              </code>
              <span className="ml-2">Transaction successfully completed</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <code className="bg-red-50 text-red-700 px-1 py-0.5 rounded text-xs font-medium">
                failed
              </code>
              <span className="ml-2">Transaction failed</span>
            </div>
          </div>
          {[
            {
              status: "cancelled",
              desc: "Transaction cancelled by user or system",
            },
            {
              status: "expired",
              desc: "Initialized but never completed (24h timeout)",
            },
            {
              status: "abandoned",
              desc: "Draft but never submitted (1h timeout)",
            },
          ].map(({ status, desc }) => (
            <div key={status} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <InlineCode>{status}</InlineCode>
                <span className="ml-2">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </DocSection>

      {/* Additional Endpoints */}
      <DocSection title="Additional Endpoints" className="mb-6">
        <div className="space-y-4 text-xs text-slate-500">
          <div>
            <h4 className="font-medium text-slate-900 mb-1">
              Get Transaction Details
            </h4>
            <EndpointBadge>
              GET /api/checkouts/[checkoutId]/transactions/[txId]
            </EndpointBadge>
            <p className="text-xs text-slate-500 mt-1">
              Get full transaction object (requires auth)
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-1">
              Update Transaction
            </h4>
            <EndpointBadge>
              PATCH /api/checkouts/[checkoutId]/transactions/[txId]
            </EndpointBadge>
            <p className="text-xs text-slate-500 mt-1">
              Manually update transaction route data (requires auth)
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-1">
              List Transactions
            </h4>
            <EndpointBadge>
              GET
              /api/checkouts/[checkoutId]/transactions?page=1&pageSize=20&status=pending
            </EndpointBadge>
            <p className="text-xs text-slate-500 mt-1">
              List transactions with pagination and filtering (requires auth)
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-1">
              Update Transaction Status
            </h4>
            <EndpointBadge>
              PATCH /api/checkouts/[checkoutId]/transactions/[txId]/status
            </EndpointBadge>
            <p className="text-xs text-slate-500 mt-1">
              Manually update transaction status (requires auth)
            </p>
          </div>
        </div>
      </DocSection>

      {/* Background Processing */}
      <DocSection title="Background Processing" className="mb-6">
        <div className="space-y-3 text-xs text-slate-500">
          <p>
            After a transaction is submitted, background workers automatically
            monitor its status:
          </p>
          <ul className="space-y-2 list-disc list-inside ml-2">
            <li>
              <strong>QStash Worker</strong> - Polls LI.FI API for transaction
              status with exponential backoff
            </li>
            <li>
              <strong>Cron Reconciliation</strong> - Marks stale transactions as
              expired/abandoned and re-enqueues stuck pending transactions
            </li>
            <li>
              <strong>Automatic Updates</strong> - Transaction status is updated
              automatically as the cross-chain transfer progresses
            </li>
          </ul>
        </div>
      </DocSection>

      {/* External Links */}
      <DocSection title="Resources">
        <div className="space-y-2">
          <DocLink href="https://docs.li.fi/integrate-li.fi-widget/using-the-sdk">
            LI.FI SDK Documentation
          </DocLink>
          <br />
          <DocLink href="https://docs.li.fi/api-reference/check-the-status-of-a-cross-chain-transfer">
            LI.FI Status API Reference
          </DocLink>
          <br />
          <DocLink href="https://explorer.li.fi/">LI.FI Explorer</DocLink>
        </div>
      </DocSection>
    </div>
  );
}
