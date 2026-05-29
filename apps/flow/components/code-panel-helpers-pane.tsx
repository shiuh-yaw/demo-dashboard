/**
 * Helpers tab body — standalone Dynamic SDK calls integrators wire
 * into their own UI alongside the integration sequence.
 *
 * Each card shows the function signature, prose rationale, docs link,
 * and a Shiki-highlighted code snippet. No numbered ordering — these
 * are sibling utilities, not a sequence.
 */

import { CodeFrame, DocsLink, renderProse } from "./code-panel-atoms";
import type { HelperCard } from "./code-panel-types";

export function HelpersPane({ helpers }: { helpers: HelperCard[] }) {
  return (
    <ul className="flex flex-col gap-6 m-0 p-0" style={{ listStyle: "none" }}>
      {helpers.map((h) => (
        <li key={h.id}>
          <HelperCardItem helper={h} />
        </li>
      ))}
    </ul>
  );
}

function HelperCardItem({ helper }: { helper: HelperCard }) {
  return (
    <article className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="font-mono text-[13.5px] text-(--brand-fg) leading-none">
          <span className="font-semibold">{helper.sig[0]}</span>
          <span className="text-(--brand-muted)">{helper.sig[1]}</span>
        </span>
        {/* Docs link occupies the top-right affordance slot — the
            categorisation pill (helper.tag) lived here previously but
            the docs link is the higher-value action. Tag is still in
            the data model for potential reintroduction elsewhere.
            Helpers with no `docsUrl` (scenario-flavoured variants of
            a base call) render without the link. */}
        {helper.docsUrl ? <DocsLink href={helper.docsUrl} /> : null}
      </div>
      <p className="text-sm text-(--brand-fg-secondary) leading-relaxed">
        {renderProse(helper.desc)}
      </p>
      <CodeFrame
        filename={`${helper.sig[0]}.ts`}
        html={helper.html}
        rawCode={helper.rawCode}
      />
    </article>
  );
}
