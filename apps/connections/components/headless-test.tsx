"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import type { HostMessage } from "@/lib/bridge";

// A local stand-in for the native side: it embeds the headless engine in a
// hidden iframe, calls window.fbHeadless.* on it (the same API iOS drives via
// evaluateJavaScript), and listens for the engine's postMessage bridge output.

type LogLine = { t: number; text: string };

export function HeadlessTest() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [walletKey, setWalletKey] = useState("rainbow");
  const [chain, setChain] = useState<"evm" | "solana" | "">("");
  const [deeplink, setDeeplink] = useState<string | null>(null);
  const [result, setResult] = useState<HostMessage | null>(null);
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
      if (msg.type === "connected" || msg.type === "error" || msg.type === "fallback") {
        setResult(msg);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const drive = (method: "connect" | "cancel", arg: unknown) => {
    const win = iframeRef.current?.contentWindow as unknown as {
      fbHeadless?: { connect: (p: unknown) => void; cancel: (id: string) => void };
    };
    if (!win?.fbHeadless) {
      append("engine not ready");
      return;
    }
    if (method === "connect") win.fbHeadless.connect(arg);
    else win.fbHeadless.cancel(arg as string);
  };

  const connect = () => {
    setDeeplink(null);
    setResult(null);
    const requestId = `req-${++reqRef.current}`;
    drive("connect", { requestId, walletKey, chain: chain || undefined });
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
            background: result.type === "connected" ? "#eafaf1" : "#fdecea",
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
