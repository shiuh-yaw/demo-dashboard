"use client";

import { useState, type ReactNode } from "react";


function CodeBlock({ filename, lines }: { filename: string; lines: string[] }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard may be unavailable */
    }
  };
  return (
    <div className="code">
      <div className="code__bar">
        <span className="code__file">{filename}</span>
        <button type="button" className="code__copy" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="code__body">
        {lines.map((line, i) => (
          <div className="code__line" key={i}>
            <span className="code__ln">{i + 1}</span>
            <span
              className={
                "code__text" +
                (line.trim().startsWith("//") ? " code__text--comment" : "")
              }
            >
              {line || " "}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
}

function Param({
  name,
  type,
  required,
  children,
}: {
  name: string;
  type: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="param">
      <div className="param__head">
        <code className="param__name">{name}</code>
        <span className="param__type">{type}</span>
        <span className={`param__req${required ? " param__req--on" : ""}`}>
          {required ? "required" : "optional"}
        </span>
      </div>
      <p className="param__desc">{children}</p>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="step">
      <span className="step__num">{n}</span>
      <div className="step__content">
        <h2 className="step__title">{title}</h2>
        <div className="step__body">{children}</div>
      </div>
    </section>
  );
}

/**
 * Guide sections.
 *
 * `web` is authored here because it documents the flow this demo actually runs
 * - the page beside it IS the hosted connect page, so the code and the running
 * widget stay honest together.
 *
 * The native guides are NOT authored here. They used to be (~600 lines ported
 * from upstream's guide) and they drifted: no Flutter, and no signing, months
 * after both shipped. Docs we do not own and cannot test are better linked than
 * copied.
 */
export type Section = "web" | "mobile";

/**
 * The canonical hosted connect page. The flow lives at the ROOT here - there is
 * no `/connect` path on this host - and this is also what the snippets print,
 * so prose and copy-paste cannot drift. Never `window.location.origin`: that
 * printed the dev host into snippets and mismatched between server and client.
 */
const HOSTED_CONNECT_URL = "https://connect.dynamicauth.com/";

/** One guide does not need a card - the native tab's grid earns its cards. */
const WEB_GUIDE_HREF = "https://www.dynamic.xyz/docs/connections/web";

/**
 * Canonical native guides. Linked, never mirrored - see `Section`.
 *
 * `headless` is the one thing that actually differs between these platforms,
 * so it earns the badge; `browser` is each platform's redirect mechanism.
 */
const NATIVE_GUIDES: Array<{
  title: string;
  href: string;
  browser: string;
  headless: boolean;
}> = [
  {
    title: "iOS",
    href: "https://www.dynamic.xyz/docs/connections/ios",
    browser: "ASWebAuthenticationSession",
    headless: true,
  },
  {
    title: "Android",
    href: "https://www.dynamic.xyz/docs/connections/android",
    browser: "Chrome Custom Tab",
    headless: true,
  },
  {
    title: "Flutter",
    href: "https://www.dynamic.xyz/docs/connections/flutter",
    browser: "flutter_web_auth_2",
    headless: true,
  },
  {
    title: "React Native",
    href: "https://www.dynamic.xyz/docs/connections/react-native",
    browser: "expo-web-browser",
    headless: false,
  },
];

/** One outbound guide link. Shared so both tabs open with the same card. */
function GuideCard({
  guide,
}: {
  guide: { title: string; href: string; browser: string; headless: boolean };
}) {
  return (
    <a
      className="docs-link"
      href={guide.href}
      target="_blank"
      rel="noreferrer"
    >
      <span className="docs-link__title">{guide.title}</span>
      <span className="docs-link__note">{guide.browser}</span>
      <span
        className={
          guide.headless ? "docs-link__tag docs-link__tag--on" : "docs-link__tag"
        }
      >
        {guide.headless ? "Headless + signing" : "Redirect only"}
      </span>
    </a>
  );
}

/**
 * One section's content - no nav, no page chrome. The scenario page's right
 * column renders this under its platform / mode tabs; there is no second copy
 * of the guide anywhere.
 */
export function DocsSection({ section }: { section: Section }) {
  return (
    <>
        {section === "web" && (
          <>
        <div className="docs-section__head">
          <h2 className="docs-section__title">Hosted connect page</h2>
          <a
            className="docs-section__ref"
            href={WEB_GUIDE_HREF}
            target="_blank"
            rel="noreferrer noopener"
          >
            Web guide ↗
          </a>
        </div>

        <div className="callout">
          <p className="callout__eyebrow">What this page returns</p>
          <p>
            The hosted flow reads the user&apos;s public wallet address and hands
            it back to you - it requests no signature. That proves the user can
            present an address, not that they control it. To prove control, or to
            sign a transaction, use the headless engine on iOS, Android or Flutter.
          </p>
        </div>

        <Step n="01" title="Link to the connect page">
          <p className="step__desc">
            Open{" "}
            <a
              className="docs-inline-link"
              href={HOSTED_CONNECT_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              this page
            </a>{" "}
            in the user's browser (or a webview) with the following query
            parameters:
          </p>
          <Param name="redirect_uri" type="URL" required>
            Where we send the user back after they connect. Must be an{" "}
            <code>http(s)</code> URL you control. Alias: <code>redirect_url</code>.
          </Param>
          <Param name="nonce" type="string">
            An opaque value we echo back unchanged so you can correlate the
            response to the request. If you don't send one, we don't return one.
          </Param>
          <CodeBlock
            filename="link to open"
            lines={[
              HOSTED_CONNECT_URL,
              "  ?redirect_uri=https://your-app.com/wallet/callback",
              "  &nonce=a1b2c3d4e5",
            ]}
          />
        </Step>

        <Step n="02" title="Receive the result">
          <p className="step__desc">
            After a successful connection we redirect the browser to your{" "}
            <code>redirect_uri</code> with these query parameters appended:
          </p>
          <Param name="address" type="string">
            The connected wallet's public address.
          </Param>
          <Param name="chain" type='"evm" | "solana"'>
            Which chain family the address belongs to.
          </Param>
          <Param name="walletName" type="string">
            Display name of the wallet (e.g. <code>MetaMask</code>).
          </Param>
          <Param name="walletImage" type="URL">
            Icon URL for the wallet (empty for a manually-entered address).
          </Param>
          <Param name="nonce" type="string">
            The exact nonce you passed in, present only if you sent one.
          </Param>
          <CodeBlock
            filename="redirect we send"
            lines={[
              "https://your-app.com/wallet/callback",
              "  ?address=0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
              "  &chain=evm",
              "  &walletName=MetaMask",
              "  &walletImage=https://.../metamask.svg",
              "  &nonce=a1b2c3d4e5",
            ]}
          />
        </Step>

        <Step n="03" title="Read it on your callback">
          <p className="step__desc">
            On your <code>redirect_uri</code>, read the params off the URL:
          </p>
          <CodeBlock
            filename="callback.ts"
            lines={[
              "const params = new URLSearchParams(location.search);",
              "",
              'const address = params.get("address");   // "0x1a2b…9a0b"',
              'const chain = params.get("chain");       // "evm" | "solana"',
              'const nonce = params.get("nonce");       // echoed back, or null',
              "",
              "// Verify `nonce` matches the one you issued, then continue.",
            ]}
          />
          <p className="step__note">
            An address alone proves the user can present it, not that they
            control it. For proof of ownership, add a sign-in step - or use the
            headless engine, where the wallet signs. In production, set{" "}
            <code>NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_HOSTS</code> to the hosts
            you accept: an unrestricted <code>redirect_uri</code> is an open
            redirect.
          </p>
        </Step>
          </>
        )}

        {section === "mobile" && (
          <>
        <h2 className="docs-section__title">Native integrations</h2>

        <div className="docs-links">
          {NATIVE_GUIDES.map((guide) => (
            <GuideCard key={guide.href} guide={guide} />
          ))}
        </div>

        <h3 className="docs-subhead">Headless engine - iOS, Android, Flutter</h3>

        <Step n="01" title="Render your own wallet list">
          <p className="step__desc">
            A hidden web view runs the SDK and pushes the wallet menu to your
            app, derived live from Dynamic&apos;s catalogue. Your app draws the
            list in native UI and links no wallet SDK of its own.
          </p>
        </Step>

        <Step n="02" title="Drive it over the bridge">
          <p className="step__desc">
            Your app calls into the engine; the engine answers with a message
            carrying the same <code>requestId</code>.
          </p>
          <CodeBlock
            filename="app → engine"
            lines={[
              "connect({ requestId, walletKey, chain })",
              "cancel(requestId)",
              "handleReturnURL(url)          // redirect wallets, e.g. Phantom",
              "onDeeplinkFailed(requestId)   // could not open the wallet",
              "sign({ requestId, message })",
              "signTx({ requestId, transaction })",
            ]}
          />
        </Step>

        <Step n="03" title="Sign, once a wallet is connected">
          <p className="step__desc">
            The session stays open after connect, so the wallet can sign. It is
            the wallet app that prompts the user - the key never leaves it.
          </p>
          <CodeBlock
            filename="engine → app"
            lines={[
              "signed       { requestId, signature }                 hex string",
              "signedTx     { requestId, signedTransaction, chain }  RLP hex or base64",
              "signFailed   { requestId, code, message }",
              "signTxFailed { requestId, code, message }",
            ]}
          />
          <p className="step__desc">
            Transactions are <strong>signed only, never broadcast</strong>. EVM
            takes a JSON transaction and requires <code>chainId</code> - without
            one the engine refuses rather than sign on whichever network the
            wallet happens to be on. Solana takes a base64 transaction.
          </p>
        </Step>
          </>
        )}
    </>
  );
}
