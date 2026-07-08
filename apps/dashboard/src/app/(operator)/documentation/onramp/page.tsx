/**
 * Coinbase Onramp Config Page
 *
 * Placeholder for managing Coinbase onramp configurations.
 * The API endpoint at /coinbase/onramp is already functional.
 */

import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  DocSection,
  InlineCode,
  StatusPill,
  DocLink,
  ApiStepList,
  ApiStep,
  CollapsibleCodeBlock,
} from "@/components/docs";

export default function OnrampPage() {
  return (
    <div>
      <PageHeader title="Coinbase Onramp" />

      {/* Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              API Active
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              The Coinbase Onramp API endpoint is ready to accept requests. Use
              the endpoint below to create onramp orders.
            </p>
            <StatusPill>POST /coinbase/onramp</StatusPill>
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

        {/* API Flow */}
        <DocSection title="Create Onramp Order">
          <p className="text-xs text-slate-500 mb-4">
            Create an onramp order to convert fiat currency into cryptocurrency.
          </p>
          <ApiStepList>
            <ApiStep
              step={1}
              title="Create Onramp Order"
              endpoint="POST /coinbase/onramp"
              description="Creates a Coinbase onramp session for the user."
            >
              <CollapsibleCodeBlock label="Request Body">
                {`{
  "walletAddress": "0x...",   // Destination wallet
  "crypto": "ETH",             // Cryptocurrency
  "fiatAmount": 100,           // Amount in fiat
  "fiatCurrency": "USD"        // Fiat currency
}`}
              </CollapsibleCodeBlock>
            </ApiStep>
          </ApiStepList>
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
            <DocLink href="https://docs.cdp.coinbase.com/onramp/docs/api-onramp">
              View Coinbase Onramp Docs
            </DocLink>
          </div>
        </DocSection>
      </div>
    </div>
  );
}
