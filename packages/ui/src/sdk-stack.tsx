/**
 * SdkStack — "Built with" callout for scenario pages: the PanelNotice
 * shell (flow's notice colors) with plain mono package names as the
 * body and an optional docs link (e.g. how to add chain support via
 * extensions) in the eyebrow row. Typically passed to
 * <CodePanel notice={...}> so it sits above the integration steps.
 */

import { DocsLink } from "./code-panel-atoms";
import { PanelNotice } from "./panel-notice";

export interface SdkStackProps {
  /** npm package names, rendered as plain mono text in order. */
  packages: string[];
  /** Optional docs link, e.g. the chain-extensions reference. */
  link?: { label: string; href: string };
}

export function SdkStack({ packages, link }: SdkStackProps) {
  return (
    <PanelNotice
      eyebrow="Built with"
      action={
        link ? <DocsLink href={link.href} label={link.label} /> : undefined
      }
    >
      <span className="flex flex-wrap gap-x-3 gap-y-1">
        {packages.map((pkg) => (
          <code
            key={pkg}
            className="font-mono text-[12px] text-(--brand-fg)"
          >
            {pkg}
          </code>
        ))}
      </span>
    </PanelNotice>
  );
}
