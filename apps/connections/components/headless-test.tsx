"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import type { HostMessage } from "@/lib/bridge";

// A local stand-in for the native side: it embeds the headless engine in a
// hidden iframe, calls window.headlessConnect.* on it (the same API iOS drives via
// evaluateJavaScript), and listens for the engine's postMessage bridge output.

type LogLine = { t: number; text: string };

export function HeadlessTest() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [walletKey, setWalletKey] = useState("rainbow");
  const [chain, setChain] = useState<"evm" | "solana" | "">("");
  const [deeplink, setDeeplink] = useState<string | null>(null);
  const [result, setResult] = useState<HostMessage | null>(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("Hello from Connections");
  const [log, setLog] = useState<LogLine[]>([]);
  const reqRef = useRef(0);

  const append = (text: string) => setLog((l) => [...l, { t: Date.now(), text }]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;
      let msg: HostMessage;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object" || !("type" in msg)) return;
      append(JSON.stringify(msg));
      if (msg.type === "ready") setReady(true);
      if (msg.type === "deeplink") setDeeplink(msg.url);
      if (msg.type === "connected") setConnected(true);
      if (
        msg.type === "connected" ||
        msg.type === "error" ||
        msg.type === "fallback" ||
        msg.type === "signed" ||
        msg.type === "signFailed" ||
        msg.type === "signedTx" ||
        msg.type === "signTxFailed"
      ) {
        setResult(msg);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  type EngineApi = {
    connect: (p: unknown) => void;
    cancel: (id: string) => void;
    sign: (p: unknown) => void;
    signTx: (p: unknown) => void;
  };

  const drive = (method: keyof EngineApi, arg: unknown) => {
    const win = iframeRef.current?.contentWindow as unknown as {
      headlessConnect?: EngineApi;
    };
    if (!win?.headlessConnect) {
      append("engine not ready");
      return;
    }
    if (method === "cancel") win.headlessConnect.cancel(arg as string);
    else win.headlessConnect[method](arg);
  };

  const nextId = () => `req-${++reqRef.current}`;

  const connect = () => {
    setDeeplink(null);
    setResult(null);
    setConnected(false);
    drive("connect", { requestId: nextId(), walletKey, chain: chain || undefined });
  };

  // Signing needs a live wallet session, so both buttons stay disabled until a
  // `connected` message arrives - calling them earlier just returns no_wallet.
  const signMsg = () => {
    setResult(null);
    drive("sign", { requestId: nextId(), message });
  };

  // A deliberately minimal EVM transaction. chainId is required: the engine
  // refuses to sign without one rather than sign on whatever network the wallet
  // happens to be on. Signed only - nothing is broadcast.
  const signTransaction = () => {
    setResult(null);
    drive("signTx", {
      requestId: nextId(),
      transaction: JSON.stringify({
        to: "0x0000000000000000000000000000000000000000",
        value: "0x0",
        chainId: 1,
      }),
    });
  };

  return (
    <div style={{ font: "14px system-ui", maxWidth: 560, margin: "24px auto", padding: 16 }}>
      <h1 style={{ fontSize: 18 }}>Headless engine - test harness</h1>
      <p style={{ color: ready ? "#16794a" : "#a15c00" }}>
        engine: {ready ? "ready ✓" : "initializing…"}
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={walletKey}
          onChange={(e) => setWalletKey(e.target.value)}
          placeholder="wallet key (e.g. rainbow, metamask, phantom)"
          style={{ padding: 8, flex: 1, minWidth: 220 }}
        />
        <select value={chain} onChange={(e) => setChain(e.target.value as typeof chain)} style={{ padding: 8 }}>
          <option value="">auto chain</option>
          <option value="evm">evm</option>
          <option value="solana">solana</option>
        </select>
        <button onClick={connect} disabled={!ready} style={{ padding: "8px 14px" }}>
          Connect
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="message to sign"
          style={{ padding: 8, flex: 1, minWidth: 220 }}
        />
        <button onClick={signMsg} disabled={!connected} style={{ padding: "8px 14px" }}>
          Sign message
        </button>
        <button onClick={signTransaction} disabled={!connected} style={{ padding: "8px 14px" }}>
          Sign transaction
        </button>
      </div>

      {deeplink && (
        <div style={{ marginTop: 20 }}>
          <p>Scan with the wallet app on your phone (proves the headless round-trip):</p>
          <div style={{ background: "#fff", padding: 12, width: "fit-content", border: "1px solid #ddd" }}>
            <QRCodeSVG value={deeplink} size={220} level="Q" />
          </div>
          <p style={{ wordBreak: "break-all", color: "#555", marginTop: 8 }}>{deeplink}</p>
          <a href={deeplink}>Open on this device</a>
        </div>
      )}

      {result && (
        <pre
          style={{
            marginTop: 20,
            padding: 12,
            background:
              result.type === "connected" ||
              result.type === "signed" ||
              result.type === "signedTx"
                ? "#eafaf1"
                : "#fdecea",
            border: "1px solid #ccc",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <h2 style={{ fontSize: 14, marginTop: 24 }}>event log</h2>
      <pre style={{ background: "#0e121b", color: "#e7ebf3", padding: 12, fontSize: 12, maxHeight: 260, overflow: "auto" }}>
        {log.map((l) => `${new Date(l.t).toLocaleTimeString()}  ${l.text}`).join("\n") || "…"}
      </pre>

      {/* The headless engine, hidden - exactly how iOS runs it. */}
      <iframe
        ref={iframeRef}
        src="/headless"
        title="headless engine"
        style={{ width: 0, height: 0, border: 0, position: "absolute" }}
      />
    </div>
  );
}
