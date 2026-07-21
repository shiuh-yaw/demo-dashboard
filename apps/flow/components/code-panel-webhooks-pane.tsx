/**
 * Webhooks tab body — a verified-handler reference snippet at the top
 * and per-axis event cards below.
 *
 * Two docs URL flavours:
 *  - `docsUrl` (prop)         → handler-card "Read the docs →" link;
 *                                 points at the setup-page reference
 *                                 (`WEBHOOK_DOCS_URL` in flow-helpers).
 *  - `event.docsUrl` (data)   → per-event schema anchor on the
 *                                 events-overview page, so each event
 *                                 card's link drops the reader at
 *                                 that event's payload section.
 */

import { CodeFrame, DocsLink, renderProse } from "@dynamic-demos/ui";
import type { WebhookEventCard, WebhookHandlerCard } from "./code-panel-types";

export function WebhooksPane({
  handler,
  events,
  docsUrl,
}: {
  handler: WebhookHandlerCard;
  events: WebhookEventCard[];
  docsUrl: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <article className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[13.5px] font-semibold text-(--brand-fg) leading-none">
            Verified handler
          </span>
          <DocsLink href={docsUrl} />
        </div>
        <CodeFrame
          filename="route.ts"
          html={handler.html}
          rawCode={handler.rawCode}
        />
      </article>
      <ul className="flex flex-col gap-6 m-0 p-0" style={{ listStyle: "none" }}>
        {events.map((e) => (
          <li key={e.id}>
            <WebhookEventItem event={e} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function WebhookEventItem({ event }: { event: WebhookEventCard }) {
  return (
    <article className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-mono text-[12.5px] text-(--brand-fg) leading-snug break-all">
            {event.name}
          </span>
          {/* Axis pill — identifies which transaction axis this event
              fires on (execution / settlement / risk). Visual marker
              alongside the per-event docs link. */}
          <AxisPill tag={event.tag} />
        </div>
        <DocsLink href={event.docsUrl} />
      </div>
      <p className="text-sm text-(--brand-fg-secondary) leading-relaxed">
        {renderProse(event.desc)}
      </p>
      <CodeFrame
        filename={`${event.id}.payload.json`}
        html={event.html}
        rawCode={event.rawPayload}
      />
    </article>
  );
}

/**
 * Small uppercase pill labelling a webhook event's transaction axis.
 * Matches the chip style used elsewhere in the panel for the
 * "Webhooks" / "SDK helpers" eyebrows so the pill reads as a
 * categorisation marker, not a status badge.
 */
function AxisPill({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-[0.14em] bg-(--brand-row-bg) text-(--brand-muted) border border-(--brand-border)">
      {tag}
    </span>
  );
}
