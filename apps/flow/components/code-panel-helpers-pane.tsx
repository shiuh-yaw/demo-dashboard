/**
 * Helpers tab body — standalone Dynamic SDK calls integrators wire
 * into their own UI alongside the integration sequence.
 *
 * Each card shows the function signature, prose rationale, docs link,
 * and a Shiki-highlighted code snippet. No numbered ordering — these
 * are sibling utilities, not a sequence.
 *
 * When helpers span multiple tag groups (e.g. wallet helpers followed
 * by exchange helpers), a lightweight section divider is rendered at
 * the boundary so the two integration paths read as distinct sections.
 */

import { CodeFrame, DocsLink, renderProse } from "@dynamic-demos/ui";
import type { HelperCard } from "./code-panel-types";

/** Tag values that get their own labelled section divider. */
const SECTION_TAGS = new Set(["Exchange"]);

export function HelpersPane({ helpers }: { helpers: HelperCard[] }) {
  return (
    <ul className="flex flex-col gap-6 m-0 p-0" style={{ listStyle: "none" }}>
      {helpers.map((h, i) => {
        const prev = i > 0 ? helpers[i - 1] : null;
        const needsDivider =
          SECTION_TAGS.has(h.tag) && (!prev || prev.tag !== h.tag);

        return (
          <li key={h.id}>
            {needsDivider && <SectionDivider label={h.tag} />}
            <HelperCardItem helper={h} />
          </li>
        );
      })}
    </ul>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div
      id={label.toLowerCase()}
      className="flex items-center gap-3 pb-2 mb-2"
    >
      <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-(--brand-primary) whitespace-nowrap">
        {label}
      </span>
      <span className="h-px flex-1 bg-(--brand-border)" />
    </div>
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
