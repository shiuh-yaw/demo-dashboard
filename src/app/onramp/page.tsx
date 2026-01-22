/**
 * Coinbase Onramp Config Page
 *
 * Placeholder for managing Coinbase onramp configurations.
 * The API endpoint at /coinbase/onramp is already functional.
 */

import { ExternalLink, Terminal } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "../components/page-header";

export default function OnrampPage() {
  return (
    <div>
      <PageHeader title="Coinbase Onramp" />

      {/* Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              API Active
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              The Coinbase Onramp API endpoint is ready to accept requests. Use
              the endpoint below to create onramp orders.
            </p>
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md font-mono text-xs text-slate-600">
              <Terminal className="w-3.5 h-3.5" />
              <span>POST /coinbase/onramp</span>
            </div>
          </div>
        </div>
      </div>

      {/* Documentation */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          API Documentation
        </h3>
        <div className="space-y-4 text-xs text-slate-500">
          <div>
            <h4 className="font-medium text-slate-900 mb-1">Request Headers</h4>
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
          <div>
            <h4 className="font-medium text-slate-900 mb-1">Request Body</h4>
            <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto">
              {`{
  "walletAddress": "0x...",   // Destination wallet
  "crypto": "ETH",             // Cryptocurrency
  "fiatAmount": 100,           // Amount in fiat
  "fiatCurrency": "USD"        // Fiat currency
}`}
            </pre>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <Link
            href="https://docs.cdp.coinbase.com/onramp/docs/api-onramp"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4779FF] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Coinbase Onramp Documentation
          </Link>
        </div>
      </div>
    </div>
  );
}
