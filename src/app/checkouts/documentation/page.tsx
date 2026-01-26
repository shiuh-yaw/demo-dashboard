/**
 * Checkout API Documentation
 *
 * Comprehensive guide to the Checkout Transaction API with LI.FI cross-chain swap integration.
 */

import { ExternalLink, Terminal, CheckCircle } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "../../components/page-header";

export default function CheckoutDocumentationPage() {
  return (
    <div>
      <PageHeader title="Checkout API Documentation" />

      {/* Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Overview</h3>
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
      </div>

      {/* Authentication */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Authentication
        </h3>
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
                <code className="bg-slate-50 px-1 py-0.5 rounded">
                  GET /api/checkouts/[id]
                </code>{" "}
                - Get checkout configuration
              </li>
              <li>
                <code className="bg-slate-50 px-1 py-0.5 rounded">
                  POST /api/checkouts/[id]/transactions
                </code>{" "}
                - Initialize transaction
              </li>
              <li>
                <code className="bg-slate-50 px-1 py-0.5 rounded">
                  GET /api/checkouts/[id]/transactions/[txId]/status
                </code>{" "}
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

      {/* Transaction Lifecycle */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Transaction Lifecycle
        </h3>
        <div className="space-y-3 text-xs text-slate-500">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-semibold text-blue-700">
              1
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 mb-1">
                Initialize Transaction
              </p>
              <code className="bg-slate-50 px-2 py-1 rounded text-slate-600 block mb-1">
                POST /api/checkouts/[checkoutId]/transactions
              </code>
              <p className="text-xs text-slate-500">
                Create a new transaction or retrieve existing one by externalId.
                Returns transaction with status "initialized".
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-slate-700 font-medium">
                  Request Body
                </summary>
                <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto mt-2 text-[10px]">
                  {`{
  "externalId": "optional-unique-id",  // Optional: for idempotency
  "metadata": {                        // Optional: custom metadata
    "orderId": "123",
    "userId": "user-456"
  }
}`}
                </pre>
              </details>
              <details className="mt-2">
                <summary className="cursor-pointer text-slate-700 font-medium">
                  Response
                </summary>
                <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto mt-2 text-[10px]">
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
                </pre>
              </details>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-semibold text-blue-700">
              2
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 mb-1">Get LI.FI Quote</p>
              <code className="bg-slate-50 px-2 py-1 rounded text-slate-600 block mb-1">
                POST /api/checkouts/[checkoutId]/transactions/[txId]/quote
              </code>
              <p className="text-xs text-slate-500">
                Fetches swap routes from LI.FI and automatically stores route
                data in the transaction. Updates transaction status to "draft".
                Requires authentication.
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-slate-700 font-medium">
                  Request Body
                </summary>
                <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto mt-2 text-[10px]">
                  {`{
  "fromChainId": 1,            // Source chain ID (e.g., 1 for Ethereum)
  "toChainId": 137,            // Destination chain ID (e.g., 137 for Polygon)
  "fromTokenAddress": "0x...", // Source token address
  "toTokenAddress": "0x...",   // Destination token address
  "fromAmount": "1000000",     // Amount in smallest unit (wei)
  "fromAddress": "0x...",      // Sender wallet address
  "toAddress": "0x..."         // Recipient wallet address
}`}
                </pre>
              </details>
              <details className="mt-2">
                <summary className="cursor-pointer text-slate-700 font-medium">
                  Response
                </summary>
                <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto mt-2 text-[10px]">
                  {`{
  "success": true,
  "data": {
    "quote": {
      "route": {
        "id": "route-id",
        "fromChainId": 1,
        "toChainId": 137,
        "fromToken": {
          "address": "0x...",
          "symbol": "USDC",
          "decimals": 6,
          "chainId": 1
        },
        "toToken": {
          "address": "0x...",
          "symbol": "USDC",
          "decimals": 6,
          "chainId": 137
        },
        "fromAmount": "1000000",
        "toAmount": "990000",
        "gasCostUSD": "2.50",
        "steps": [ ... ]
      },
      "integrator": "your-integrator-id"
    },
    "transaction": {
      "id": "tx-id",
      "status": "draft",
      "fromToken": { ... },
      "toToken": { ... },
      "fromAmount": "1000000",
      "toAmount": "990000",
      "tool": "lifi",
      ...
    }
  }
}`}
                </pre>
              </details>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-semibold text-blue-700">
              3
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 mb-1">
                Submit Transaction
              </p>
              <code className="bg-slate-50 px-2 py-1 rounded text-slate-600 block mb-1">
                POST /api/checkouts/[checkoutId]/transactions/[txId]/submit
              </code>
              <p className="text-xs text-slate-500">
                Submit the transaction hash after the user executes the swap
                on-chain. Updates status to "submitted" and enqueues background
                monitoring. Requires authentication.
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-slate-700 font-medium">
                  Request Body
                </summary>
                <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto mt-2 text-[10px]">
                  {`{
  "txHash": "0x..."  // Transaction hash from the blockchain
}`}
                </pre>
              </details>
              <details className="mt-2">
                <summary className="cursor-pointer text-slate-700 font-medium">
                  Response
                </summary>
                <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto mt-2 text-[10px]">
                  {`{
  "success": true,
  "data": {
    "transaction": {
      "id": "tx-id",
      "status": "submitted",
      "txHash": "0x...",
      ...
    },
    "monitorId": "qstash-message-id"  // Background job ID
  }
}`}
                </pre>
              </details>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-semibold text-blue-700">
              4
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 mb-1">Monitor Status</p>
              <code className="bg-slate-50 px-2 py-1 rounded text-slate-600 block mb-1">
                GET /api/checkouts/[checkoutId]/transactions/[txId]/status
              </code>
              <p className="text-xs text-slate-500">
                Check transaction status. Background workers automatically poll
                LI.FI for transfer status and update the transaction. Public
                endpoint - no authentication required.
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-slate-700 font-medium">
                  Response
                </summary>
                <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto mt-2 text-[10px]">
                  {`{
  "success": true,
  "data": {
    "status": "pending",  // initialized | draft | submitted | pending | confirmed | failed | cancelled | expired | abandoned
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
                </pre>
              </details>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Statuses */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Transaction Statuses
        </h3>
        <div className="space-y-2 text-xs text-slate-500">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <code className="bg-slate-50 px-1 py-0.5 rounded font-medium text-slate-700">
                initialized
              </code>
              <span className="ml-2">
                Transaction created, awaiting route selection
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <code className="bg-slate-50 px-1 py-0.5 rounded font-medium text-slate-700">
                draft
              </code>
              <span className="ml-2">
                Route selected and quote fetched, ready to submit
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <code className="bg-slate-50 px-1 py-0.5 rounded font-medium text-slate-700">
                submitted
              </code>
              <span className="ml-2">
                Transaction hash submitted, awaiting confirmation
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <code className="bg-slate-50 px-1 py-0.5 rounded font-medium text-slate-700">
                pending
              </code>
              <span className="ml-2">
                Awaiting cross-chain transfer completion (monitored by
                background workers)
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <code className="bg-emerald-50 px-1 py-0.5 rounded font-medium text-emerald-700">
                confirmed
              </code>
              <span className="ml-2">Transaction successfully completed</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <code className="bg-red-50 px-1 py-0.5 rounded font-medium text-red-700">
                failed
              </code>
              <span className="ml-2">Transaction failed</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <code className="bg-slate-50 px-1 py-0.5 rounded font-medium text-slate-700">
                cancelled
              </code>
              <span className="ml-2">
                Transaction cancelled by user or system
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <code className="bg-slate-50 px-1 py-0.5 rounded font-medium text-slate-700">
                expired
              </code>
              <span className="ml-2">
                Initialized but never completed (24h timeout)
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <code className="bg-slate-50 px-1 py-0.5 rounded font-medium text-slate-700">
                abandoned
              </code>
              <span className="ml-2">
                Draft but never submitted (1h timeout)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Endpoints */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Additional Endpoints
        </h3>
        <div className="space-y-4 text-xs text-slate-500">
          <div>
            <h4 className="font-medium text-slate-900 mb-1">
              Get Transaction Details
            </h4>
            <code className="bg-slate-50 px-2 py-1 rounded text-slate-600">
              GET /api/checkouts/[checkoutId]/transactions/[txId]
            </code>
            <p className="text-xs text-slate-500 mt-1">
              Get full transaction object (requires auth)
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-1">
              Update Transaction
            </h4>
            <code className="bg-slate-50 px-2 py-1 rounded text-slate-600">
              PATCH /api/checkouts/[checkoutId]/transactions/[txId]
            </code>
            <p className="text-xs text-slate-500 mt-1">
              Manually update transaction route data (requires auth)
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-1">
              List Transactions
            </h4>
            <code className="bg-slate-50 px-2 py-1 rounded text-slate-600">
              GET
              /api/checkouts/[checkoutId]/transactions?page=1&pageSize=20&status=pending
            </code>
            <p className="text-xs text-slate-500 mt-1">
              List transactions with pagination and filtering (requires auth)
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-1">
              Update Transaction Status
            </h4>
            <code className="bg-slate-50 px-2 py-1 rounded text-slate-600">
              PATCH /api/checkouts/[checkoutId]/transactions/[txId]/status
            </code>
            <p className="text-xs text-slate-500 mt-1">
              Manually update transaction status (requires auth)
            </p>
          </div>
        </div>
      </div>

      {/* Background Processing */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Background Processing
        </h3>
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
      </div>

      {/* External Links */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Resources</h3>
        <div className="space-y-2">
          <Link
            href="https://docs.li.fi/integrate-li.fi-widget/using-the-sdk"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4779FF] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            LI.FI SDK Documentation
          </Link>
          <br />
          <Link
            href="https://docs.li.fi/api-reference/check-the-status-of-a-cross-chain-transfer"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4779FF] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            LI.FI Status API Reference
          </Link>
          <br />
          <Link
            href="https://explorer.li.fi/"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4779FF] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            LI.FI Explorer
          </Link>
        </div>
      </div>
    </div>
  );
}
