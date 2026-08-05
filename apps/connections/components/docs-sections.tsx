"use client";

import { useState, type ReactNode } from "react";

// The real host-harness sources, so the docs never drift from what ships in
// `native/`. Read off disk by the server component (see lib/native-sources.ts).
// `import type` is erased at compile time, so this client component never pulls
// the node:fs loader into the browser bundle.
import type { NativeSources } from "@/lib/native-sources";

export type DocsSources = NativeSources;

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
 * Guide sections. `rn` is still authored below but has no surface: the scenario
 * page's tabs cover Web / iOS / Android only, and the standalone /docs route
 * that used to expose React Native was removed. Kept so a React Native tab is a
 * one-line addition rather than a rewrite.
 */
export type Section =
  | "web"
  | "ios"
  | "ios-headless"
  | "rn"
  | "android"
  | "android-headless";

/**
 * One section's content - no nav, no page chrome. The scenario page's right
 * column renders this under its platform / mode tabs; there is no second copy
 * of the guide anywhere.
 */
export function DocsSection({
  section,
  sources,
}: {
  section: Section;
  sources: DocsSources;
}) {
  // A deliberate placeholder, not `window.location.origin`. Reading the live
  // origin printed the dev host ("http://localhost:4013") into copy-paste
  // integration snippets, and it differed between the server and client render,
  // which is a hydration mismatch. Integrators substitute their own deployment.
  const origin = "https://your-connect-page.example";
  return (
    <>
        {section === "web" && (
          <>
        <h2 className="docs-section__title">Hosted connect page</h2>
        <p className="card__subtitle">
          Open{" "}
          <a
            className="docs-inline-link"
            href="/connect"
            target="_blank"
            rel="noreferrer noopener"
          >
            this page
          </a>{" "}
          in the user's browser or a web view. We hand the connected wallet back
          on a redirect URL you control.
        </p>

        <div className="callout">
          <p className="callout__eyebrow">Connect-only</p>
          <p>
            We never request a signature or transaction. We only read the user's
            public wallet address and hand it back to you.
          </p>
        </div>

        <Step n="01" title="Link to the connect page">
          <p className="step__desc">
            Open{" "}
            <a
              className="docs-inline-link"
              href="/connect"
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
              `${origin}/connect`,
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
            Connect-only proves the user can present an address, not that they
            control it. For proof of ownership, add a sign-in step. In
            production, allow-list the <code>redirect_uri</code> values you
            accept to prevent open redirects.
          </p>
        </Step>
          </>
        )}

        {section === "ios" && (
          <>
        <h2 className="docs-section__title">Hosted flow, native result</h2>
        <p className="card__subtitle">
          Same contract, hosted inside a web view. The result comes back on a
          custom URL scheme instead of an <code>https</code> callback. The whole
          integration is one small Swift file,{" "}
          <code>FireblocksConnectFlow.swift</code> - copy it, call it, read the
          result.
        </p>

        <div className="callout">
          <p className="callout__eyebrow">Recommended</p>
          <p>
            Present with <code>ASWebAuthenticationSession</code> - it's built for
            "open web, return via a callback scheme," runs ephemerally (no consent
            prompt, no stale-session lag), and needs no navigation glue. Use a{" "}
            <code>WKWebView</code> only if you need the flow embedded in custom UI.
          </p>
        </div>

        <details className="code-collapse">
          <summary className="code-collapse__summary">
            View the full <code>FireblocksConnectFlow.swift</code> - copy-paste ready
          </summary>
          <CodeBlock
            filename="FireblocksConnectFlow.swift"
            lines={sources.fireblocks.replace(/\n+$/, "").split("\n")}
          />
        </details>

        <Step n="01" title="Register your URL scheme">
          <p className="step__desc">
            Add your app's custom scheme to <code>Info.plist</code>. It only has
            to match the scheme you pass to the flow.
          </p>
          <CodeBlock
            filename="Info.plist"
            lines={[
              "<key>CFBundleURLTypes</key>",
              "<array>",
              "  <dict>",
              "    <key>CFBundleURLSchemes</key>",
              "    <array><string>myapp</string></array>",
              "  </dict>",
              "</array>",
            ]}
          />
        </Step>

        <Step n="02" title="Present the flow">
          <p className="step__desc">
            Call <code>FireblocksConnectFlow.present</code>. It appends{" "}
            <code>redirect_uri</code>, a random <code>nonce</code>, and{" "}
            <code>embedded=1</code> to the URL, opens the session, verifies the
            returned nonce, and hands you a typed result.
          </p>
          <CodeBlock
            filename="ConnectButton.swift"
            lines={[
              "FireblocksConnectFlow.present(",
              `    flowURL: URL(string: "${origin}/connect")!,`,
              '    scheme: "myapp"',
              ") { result in",
              "    switch result {",
              "    case .success(let wallet):",
              "        // wallet.address, wallet.chain,",
              "        // wallet.walletName, wallet.walletImage",
              "    case .failure(.cancelled):",
              "        break",
              "    case .failure(let error):",
              "        // .nonceMismatch / .malformedResult / …",
              "    }",
              "}",
            ]}
          />
          <p className="step__note">
            Forward your App's <code>onOpenURL</code> to{" "}
            <code>FireblocksConnectFlow.handleCallbackURL($0)</code>. Most wallets
            return inside the session, but some (Phantom) finish in their own
            in-app browser and hand the result back via the scheme - this makes
            those complete.
          </p>
        </Step>

        <Step n="03" title="Use the result">
          <p className="step__desc">
            <code>WalletConnection</code> carries the same fields as the web
            callback (the nonce is already verified for you):
          </p>
          <Param name="address" type="String">
            The connected wallet's public address.
          </Param>
          <Param name="chain" type='"evm" | "solana"'>
            Which chain family the address belongs to.
          </Param>
          <Param name="walletName" type="String">
            Display name of the wallet (e.g. <code>MetaMask</code>).
          </Param>
          <Param name="walletImage" type="String">
            Icon URL. Usually an SVG-sprite URL, so render it with a WebKit-backed{" "}
            <code>&lt;img&gt;</code> rather than <code>UIImage</code>.
          </Param>
          <p className="step__note">
            The <code>embedded=1</code> flag tells this page it's inside a native
            container so it opens wallets via their native scheme and avoids
            redirect protocols that would escape to Safari. Real wallet round-trips
            require a physical device - wallets don't run in the Simulator.
          </p>
        </Step>
          </>
        )}

        {section === "ios-headless" && (
          <>
        <h2 className="docs-section__title">
          Native wallet list, no visible web
        </h2>
        <p className="card__subtitle">
          Want your app to render its <strong>own native wallet list</strong> with
          no web UI at all? Keep every bit of connection logic in the web layer and
          drive it from a <strong>hidden</strong> web view. The basic flow above is
          the recommended default; this is for teams that want a fully native
          front-end.
        </p>

        <div className="callout">
          <p className="callout__eyebrow">No SDK in your app</p>
          <p>
            Your app links <strong>no wallet SDK</strong> - no CocoaPods, no native
            crypto. It needs exactly two things: a hidden web view pointed at{" "}
            <code>/headless</code>, and your URL scheme. All the WalletConnect /
            MetaMask / Phantom logic - <em>and the wallet list itself</em> - comes
            from that hidden view. When wallets or the SDK change, you redeploy the
            page; the app never changes.
          </p>
        </div>

        <p className="card__subtitle">
          Before writing any native code, drive the same engine from{" "}
          <a
            className="docs-inline-link"
            href="/headless-test"
            target="_blank"
            rel="noreferrer noopener"
          >
            /headless-test
          </a>
          {" "}- a browser harness that speaks the bridge contract below, so you can
          watch the <code>wallets</code> / <code>connected</code> messages without
          a Swift build.
        </p>

        <Step n="01" title="Get the wallet menu (no static file)">
          <p className="step__desc">
            The engine derives the list live from the Dynamic catalogue and pushes
            it to your app over the bridge (a <code>wallets</code> message) - no
            walletbook file to ship or keep in sync. Each entry:
          </p>
          <Param name="key" type="string">
            Catalogue key you pass back when the user taps it (e.g. <code>metamask</code>).
          </Param>
          <Param name="name / icon" type="string">
            Display name and icon URL for the row.
          </Param>
          <Param name="chains" type='("evm" | "solana")[]'>
            Which chains the wallet supports (drives a native chain picker).
          </Param>
          <Param name="mode" type='"headless" | "fallback"'>
            <code>headless</code> → connect silently through the hidden view.{" "}
            <code>fallback</code> → open the visible flow above (for wallets that
            need a passkey/email screen).
          </Param>
          <Param name="featured" type="boolean">
            Show by default; the rest of the catalogue rides along so search
            matches this page.
          </Param>
          <CodeBlock
            filename="wallets message (web → app)"
            lines={[
              "{",
              '  "type": "wallets",',
              '  "wallets": [',
              '    { "key": "metamask", "name": "MetaMask", "icon": "https://…",',
              '      "chains": ["evm","solana"], "mode": "headless", "featured": true },',
              '    { "key": "phantom", "name": "Phantom", "icon": "https://…",',
              '      "chains": ["solana"], "mode": "headless", "featured": true }',
              "    // …full catalogue follows, featured:false",
              "  ]",
              "}",
            ]}
          />
        </Step>

        <Step n="02" title="Drop in FireblocksHeadlessConnect">
          <p className="step__desc">
            One file. It owns a hidden <code>WKWebView</code> pointed at{" "}
            <code>/headless</code>, drives it over a message bridge, opens the
            wallet deeplink it returns, and calls you back. Pre-warm it at launch.
          </p>
          <CodeBlock
            filename="Connect.swift"
            lines={[
              "FireblocksHeadlessConnect.shared.prewarm()   // at launch",
              "",
              'FireblocksHeadlessConnect.shared.connect(walletKey: "metamask", chain: "evm") { result in',
              "    switch result {",
              "    case .success(let wallet):        // wallet.address, .chain, …",
              "    case .fallbackRequired:           // open the visible flow for this wallet",
              "    case .failure(let code, _):       // stable code, e.g. \"user_rejected\"",
              "    }",
              "}",
            ]}
          />
          <p className="step__note">
            Forward your App's <code>onOpenURL</code> to{" "}
            <code>FireblocksHeadlessConnect.shared.handleReturnURL($0)</code> - that's
            how redirect wallets (Phantom) hand their result back to the hidden view.
          </p>
          <details className="code-collapse">
            <summary className="code-collapse__summary">
              View <code>FireblocksHeadlessConnect.swift</code> - copy-paste ready
            </summary>
            <CodeBlock
              filename="FireblocksHeadlessConnect.swift"
              lines={sources.headless.replace(/\n+$/, "").split("\n")}
            />
          </details>
        </Step>

        <Step n="03" title="Render the list (your UI)">
          <p className="step__desc">
            Load <code>walletbook.json</code>, show the rows, and on tap route to
            the engine (<code>mode: "headless"</code>) or the visible flow
            (<code>mode: "fallback"</code>). The engine also returns{" "}
            <code>.fallbackRequired</code> for anything it can't do silently, so you
            fall back automatically - the user never hits a dead end.{" "}
            <code>WalletListView</code> is a sample you'd swap for your own design.
          </p>
          <details className="code-collapse">
            <summary className="code-collapse__summary">
              View <code>WalletListView.swift</code> - sample list UI
            </summary>
            <CodeBlock
              filename="WalletListView.swift"
              lines={sources.walletList.replace(/\n+$/, "").split("\n")}
            />
          </details>
        </Step>

        <Step n="04" title="The bridge (for reference)">
          <p className="step__desc">
            You don't write this - it's what flows between the hidden view and the
            two files above. Handy when debugging.
          </p>
          <CodeBlock
            filename="bridge messages"
            lines={[
              "// web → app",
              "ready                                  engine initialized",
              "wallets    { wallets: […] }            the wallet menu (live)",
              "deeplink   { url }                     app opens the wallet",
              "opening    { }                         wallet opening (Phantom)",
              "connected  { address, chain, … }       success",
              "fallback   { reason }                  can't go headless → visible flow",
              "error      { code, message }           failed",
              "",
              "// app → web",
              "window.fbHeadless.connect({ walletKey, chain })",
              "window.fbHeadless.handleReturnURL(url)   // redirect wallets",
            ]}
          />
        </Step>
          </>
        )}

        {section === "rn" && (
          <>
        <h2 className="docs-section__title">Hosted flow, native result</h2>
        <p className="card__subtitle">
          Same contract for a React Native app (Expo or bare RN with Expo
          modules). The whole integration is one file,{" "}
          <code>FireblocksConnect.ts</code> - the RN analog of the iOS component.
        </p>

        <div className="callout">
          <p className="callout__eyebrow">Recommended</p>
          <p>
            Use <code>expo-web-browser</code>'s <code>openAuthSessionAsync</code>{" "}
            - it's <code>ASWebAuthenticationSession</code> on iOS and Chrome
            Custom Tabs on Android, the same "open web, return via a callback
            scheme" primitive. Works in Expo and bare RN.
          </p>
        </div>

        <details className="code-collapse">
          <summary className="code-collapse__summary">
            View the full <code>FireblocksConnect.ts</code> - copy-paste ready
          </summary>
          <CodeBlock
            filename="FireblocksConnect.ts"
            lines={sources.rn.replace(/\n+$/, "").split("\n")}
          />
        </details>

        <Step n="01" title="Install the modules">
          <p className="step__desc">
            All three work in Expo and bare RN:
          </p>
          <CodeBlock
            filename="terminal"
            lines={["npx expo install expo-web-browser expo-linking expo-crypto"]}
          />
        </Step>

        <Step n="02" title="Register your URL scheme">
          <p className="step__desc">
            Expo - set it in <code>app.json</code>. Bare RN - add it to{" "}
            <code>Info.plist</code> and an Android intent-filter.
          </p>
          <CodeBlock
            filename="app.json"
            lines={['{ "expo": { "scheme": "myapp" } }']}
          />
        </Step>

        <Step n="03" title="Connect and use the result">
          <p className="step__desc">
            One call. The nonce is verified for you; some wallets (Phantom) return
            out-of-band and are handled inside <code>connectWallet</code> - no
            extra wiring.
          </p>
          <CodeBlock
            filename="ConnectButton.tsx"
            lines={[
              'import { connectWallet } from "./FireblocksConnect";',
              "",
              "try {",
              "  const wallet = await connectWallet({",
              `    flowURL: "${origin}/connect",`,
              '    scheme: "myapp",',
              "  });",
              "  // wallet.address, wallet.chain,",
              "  // wallet.walletName, wallet.walletImage",
              "} catch (e) {",
              "  // FireblocksConnectCancelled | FireblocksConnectError",
              "}",
            ]}
          />
          <p className="step__note">
            <code>walletImage</code> is usually an SVG-sprite URL - render it in a
            WebView <code>&lt;img&gt;</code> rather than <code>&lt;Image&gt;</code>.
            Real wallet round-trips need a physical device.
          </p>
        </Step>
          </>
        )}

        {section === "android" && (
          <>
        <h2 className="docs-section__title">Hosted flow, native result</h2>
        <p className="card__subtitle">
          Same contract for a native Android app. The basic integration is one
          Kotlin file, <code>FireblocksConnect.kt</code> - the Android analog of
          iOS's <code>FireblocksConnectFlow</code> - opening the flow in a{" "}
          <strong>Chrome Custom Tab</strong>.
        </p>

        <div className="callout">
          <p className="callout__eyebrow">Recommended</p>
          <p>
            Present with a <code>Chrome Custom Tab</code> - Android's secure,
            sandboxed in-app browser. The page returns to{" "}
            <code>&lt;scheme&gt;://wallet-callback</code>, caught by{" "}
            <code>FireblocksRedirectActivity</code>.
          </p>
        </div>

        <details className="code-collapse">
          <summary className="code-collapse__summary">
            View <code>FireblocksConnect.kt</code> - copy-paste ready
          </summary>
          <CodeBlock
            filename="FireblocksConnect.kt"
            lines={sources.android.replace(/\n+$/, "").split("\n")}
          />
        </details>

        <Step n="01" title="Add the dependency + return activity">
          <CodeBlock
            filename="build.gradle.kts"
            lines={['implementation("androidx.browser:browser:1.8.0")']}
          />
          <p className="step__desc">
            Register <code>FireblocksRedirectActivity</code> in{" "}
            <code>AndroidManifest.xml</code> (replace <code>fbapp</code> with your
            scheme) so the OS routes the return to your app:
          </p>
          <CodeBlock
            filename="AndroidManifest.xml"
            lines={[
              '<activity',
              '  android:name="com.fireblocks.connect.FireblocksRedirectActivity"',
              '  android:exported="true"',
              '  android:launchMode="singleTask">',
              '  <intent-filter>',
              '    <action android:name="android.intent.action.VIEW" />',
              '    <category android:name="android.intent.category.DEFAULT" />',
              '    <category android:name="android.intent.category.BROWSABLE" />',
              '    <data android:scheme="fbapp" android:host="wallet-callback" />',
              '  </intent-filter>',
              '</activity>',
            ]}
          />
        </Step>

        <Step n="02" title="Present the flow">
          <CodeBlock
            filename="MainActivity.kt"
            lines={[
              "FireblocksConnect.present(this, flowUrl, scheme = \"fbapp\") { result ->",
              "    when (result) {",
              "        is FireblocksConnectResult.Success -> { /* result.wallet.address … */ }",
              "        is FireblocksConnectResult.Cancelled -> {}",
              "        is FireblocksConnectResult.Error -> { /* result.reason */ }",
              "    }",
              "}",
            ]}
          />
        </Step>
          </>
        )}

        {section === "android-headless" && (
          <>
        <h2 className="docs-section__title">
          Native wallet list, no visible web
        </h2>
        <p className="card__subtitle">
          The same headless architecture as iOS: render your own native list, and
          drive a <strong>hidden</strong> <code>WebView</code> that runs the SDK
          and returns results over a JS bridge. No wallet SDK in the app.
        </p>

        <div className="callout">
          <p className="callout__eyebrow">No SDK in your app</p>
          <p>
            Your app links <strong>no wallet SDK</strong>. It needs a hidden{" "}
            <code>WebView</code> pointed at the hosted engine page (
            <code>{origin}/headless</code>, set as <code>ENGINE_URL</code> in{" "}
            <code>FireblocksHeadlessConnect</code>) and your URL scheme; all the
            WalletConnect / MetaMask / Phantom logic - and the wallet list - comes
            from that hosted view. Same bridge contract as iOS.
          </p>
        </div>

        <p className="card__subtitle">
          Before writing any native code, drive the same engine from{" "}
          <a
            className="docs-inline-link"
            href="/headless-test"
            target="_blank"
            rel="noreferrer noopener"
          >
            /headless-test
          </a>
          {" "}- a browser harness that speaks the bridge contract below, so you can
          watch the <code>wallets</code> / <code>connected</code> messages without
          a Kotlin build.
        </p>

        <Step n="01" title="Get the wallet menu (no static file)">
          <p className="step__desc">
            The engine derives the list live from the Dynamic catalogue and pushes
            it over the bridge (a <code>wallets</code> message) - set{" "}
            <code>FireblocksHeadlessConnect.onWallets</code>. Each entry:
          </p>
          <Param name="key" type="String">
            Catalogue key you pass back on tap (e.g. <code>metamask</code>).
          </Param>
          <Param name="name / icon" type="String">
            Display name and icon URL for the row.
          </Param>
          <Param name="chains" type="List&lt;String&gt;">
            <code>evm</code> / <code>solana</code> - drives a native chain picker.
          </Param>
          <Param name="mode" type='"headless" | "fallback"'>
            <code>headless</code> → connect silently; <code>fallback</code> → open
            the visible flow (passkey/email wallets).
          </Param>
          <Param name="featured" type="Boolean">
            Show by default; the rest of the catalogue rides along for search.
          </Param>
        </Step>

        <Step n="02" title="Drop in FireblocksHeadlessConnect">
          <p className="step__desc">
            Owns a hidden <code>WebView</code>, bridges to it (
            <code>addJavascriptInterface</code> + <code>evaluateJavascript</code>),
            opens the wallet deeplink it returns, and calls you back. Pre-warm it
            at launch.
          </p>
          <CodeBlock
            filename="MainActivity.kt"
            lines={[
              "FireblocksHeadlessConnect.prewarm(this)               // at launch",
              'FireblocksHeadlessConnect.onWallets = { render(it) }  // the live list',
              "",
              'FireblocksHeadlessConnect.connect(this, "metamask", "evm") { result ->',
              "    when (result) {",
              "        is FireblocksHeadlessConnect.Result.Success -> { /* result.wallet */ }",
              "        is FireblocksHeadlessConnect.Result.FallbackRequired -> { /* visible flow */ }",
              "        is FireblocksHeadlessConnect.Result.Failure -> { /* result.code */ }",
              "    }",
              "}",
            ]}
          />
          <details className="code-collapse">
            <summary className="code-collapse__summary">
              View <code>FireblocksHeadlessConnect.kt</code> - copy-paste ready
            </summary>
            <CodeBlock
              filename="FireblocksHeadlessConnect.kt"
              lines={sources.androidHeadless.replace(/\n+$/, "").split("\n")}
            />
          </details>
        </Step>

        <Step n="03" title="Wire the manifest + redirect (Android-specific)">
          <p className="step__desc">
            Beyond the basic flow, headless needs two manifest additions. Add a{" "}
            <code>phantom-headless</code> host to the same{" "}
            <code>FireblocksRedirectActivity</code> intent-filter, and a{" "}
            <code>&lt;queries&gt;</code> block so the app can open wallet deeplinks
            on Android 11+:
          </p>
          <CodeBlock
            filename="AndroidManifest.xml"
            lines={[
              "<!-- inside the FireblocksRedirectActivity intent-filter -->",
              '<data android:scheme="fbapp" android:host="wallet-callback" />',
              '<data android:scheme="fbapp" android:host="phantom-headless" />',
              "",
              "<!-- Android 11+ package visibility, at <manifest> level -->",
              "<queries>",
              '  <intent><action android:name="android.intent.action.VIEW" />',
              '    <data android:scheme="metamask" /></intent>',
              '  <intent><action android:name="android.intent.action.VIEW" />',
              '    <data android:scheme="phantom" /></intent>',
              "</queries>",
            ]}
          />
          <p className="step__desc">
            Route the return activity to the engine first (for Phantom's redirect),
            then fall through to the visible flow:
          </p>
          <CodeBlock
            filename="FireblocksRedirectActivity"
            lines={[
              "intent?.data?.let { uri ->",
              "    if (!FireblocksHeadlessConnect.handleReturnURL(uri)) {",
              "        FireblocksConnect.handleRedirect(uri)",
              "    }",
              "}",
            ]}
          />
          <p className="step__note">
            The hidden <code>WebView</code> needs the <code>INTERNET</code>{" "}
            permission (already in the sample manifest). Don't call{" "}
            <code>webView.onPause()</code> on it - that suspends the relay socket.
          </p>
        </Step>

        <Step n="04" title="Render the list (your UI)">
          <p className="step__desc">
            <code>MainActivity</code> is a sample list (search, chain picker,
            connecting state, auto-fallback) you'd swap for your own design.
          </p>
          <details className="code-collapse">
            <summary className="code-collapse__summary">
              View <code>MainActivity.kt</code> - sample list UI
            </summary>
            <CodeBlock
              filename="MainActivity.kt"
              lines={sources.androidSample.replace(/\n+$/, "").split("\n")}
            />
          </details>
        </Step>

        <Step n="05" title="The bridge (for reference)">
          <p className="step__desc">
            You don't write this - it's what flows between the hidden view and the
            engine. Identical to iOS.
          </p>
          <CodeBlock
            filename="bridge messages"
            lines={[
              "// web → app",
              "ready                                  engine initialized",
              "wallets    { wallets: […] }            the wallet menu (live)",
              "deeplink   { url }                     app opens the wallet",
              "opening    { }                         wallet opening (Phantom)",
              "connected  { address, chain, … }       success",
              "fallback   { reason }                  can't go headless → visible flow",
              "error      { code, message }           failed",
              "",
              "// app → web",
              "window.fbHeadless.connect({ walletKey, chain })",
              "window.fbHeadless.handleReturnURL(url)   // redirect wallets",
            ]}
          />
        </Step>
          </>
        )}
    </>
  );
}
