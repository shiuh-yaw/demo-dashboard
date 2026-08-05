import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Connection result - Fireblocks Connect",
  robots: { index: false, follow: false },
};

/**
 * Stand-in for the integrator's callback endpoint.
 *
 * The flow's whole output is a redirect carrying query params, and the default
 * target used to be an external marketing site - so the demo ended by throwing
 * the user off-site with the interesting part invisible. This page is the
 * default instead: it renders exactly what we handed back, which is what an
 * integrator needs to see.
 *
 * Read-only display of untrusted query input. Values are rendered as text, and
 * `walletImage` is only ever used as an <img src>, never injected as markup.
 */

const FIELDS: Array<{ key: string; label: string; note?: string }> = [
  { key: "address", label: "address", note: "The connected public address" },
  { key: "chain", label: "chain", note: '"evm" or "solana"' },
  { key: "walletName", label: "walletName", note: "Display name" },
  { key: "walletImage", label: "walletImage", note: "Icon URL" },
  { key: "nonce", label: "nonce", note: "Echoed back only if you sent one" },
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Wallet icons often arrive as a base64 `data:` URI thousands of characters
 * long, which rendered as a wall of text taller than the rest of the page. The
 * head is the informative part (`data:image/svg+xml;base64,...`), so keep that
 * and report the real length rather than printing all of it. The icon itself is
 * already visible in the tile above.
 */
const MAX_VALUE_CHARS = 96;

/**
 * Where "connect another wallet" goes back to. `from` is untrusted query input
 * feeding a link, so it is matched against a fixed set of same-origin paths
 * rather than used directly - otherwise this is another open redirect. Anything
 * unrecognised falls back to the bare embed.
 */
const RETURN_PATHS = new Set(["/", "/connect"]);

function returnPath(from: string | undefined): string {
  return from && RETURN_PATHS.has(from) ? from : "/connect";
}

function truncate(value: string): { text: string; truncated: boolean } {
  if (value.length <= MAX_VALUE_CHARS) return { text: value, truncated: false };
  return { text: `${value.slice(0, MAX_VALUE_CHARS)}...`, truncated: true };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const address = first(params.address);
  const walletName = first(params.walletName);
  const walletImage = first(params.walletImage);
  const received = FIELDS.some(({ key }) => first(params[key]));

  return (
    <div className="page">
      <main className="card">
        <p className="eyebrow">Callback</p>
        <h1 className="card__title">
          {received ? "Connection received" : "Nothing received"}
        </h1>
        <p className="card__subtitle">
          {received
            ? "This stands in for your own callback endpoint. These are the query params we appended to your redirect_uri."
            : "This page is the default redirect target. Complete a connection to see the params we hand back."}
        </p>

        {received && (address || walletName) ? (
          <div className="tile tile--static">
            {walletImage ? (
              <span className="tile__icon" aria-hidden="true">
                <img src={walletImage} alt="" width={34} height={34} />
              </span>
            ) : null}
            <span className="tile__label">
              <span className="tile__name">{walletName || "Wallet"}</span>
              {address ? <span className="tile__sub">{address}</span> : null}
            </span>
          </div>
        ) : null}

        {received ? (
          <div className="callback-params">
            {FIELDS.map(({ key, label, note }) => {
              const value = first(params[key]);
              const shown = value ? truncate(value) : null;
              return (
                <div className="param" key={key}>
                  <div className="param__head">
                    <code className="param__name">{label}</code>
                    <span
                      className={`param__req${value ? " param__req--on" : ""}`}
                    >
                      {value ? "received" : "absent"}
                    </span>
                  </div>
                  <p className="param__desc">
                    {shown ? (
                      <>
                        <code className="callback-value">{shown.text}</code>
                        {shown.truncated ? (
                          <span className="callback-value__meta">
                            truncated for display - {value!.length} characters
                          </span>
                        ) : null}
                      </>
                    ) : (
                      note
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}

        <Link
          className="btn-primary btn-primary--block"
          href={returnPath(first(params.from))}
        >
          {received ? "Connect another wallet" : "Open the connect flow"}
        </Link>
      </main>
    </div>
  );
}
