import { SecuredByFireblocks } from "@dynamic-demos/ui";

// Brand chrome - color scheme only. The bottom attribution mirrors the reference
// checkout's treatment and credits Fireblocks.
//
// No links or actions here on purpose: this footer ships inside an integrator's
// iframe / webview, where a "For developers" link out to our docs and a "Reset"
// dev affordance are both our UI leaking into their product. The guide lives on
// the scenario page instead.
//
// The mark itself is `SecuredByFireblocks` from @dynamic-demos/ui, shared with
// apps/flow so the two can't drift.

export function Disclosure() {
  return (
    <footer className="disclosure">
      <SecuredByFireblocks className="mb-3.5" />
    </footer>
  );
}
