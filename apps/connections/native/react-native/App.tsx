// Reference example: a single "Connect wallet" button that runs the flow via
// FireblocksConnect and shows the connected wallet. Everything non-obvious lives
// in FireblocksConnect.ts (the one file you copy into your own app).
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { WebView } from "react-native-webview";

import {
  connectWallet,
  FireblocksConnectCancelled,
  type WalletConnection,
} from "./FireblocksConnect";

// Production connect page. Uses the `fbapp` scheme, which production already
// accepts. (Once PR #7 ships, the page accepts any custom scheme, so you can
// swap in your own here + in app.json.)
const FLOW_URL = "https://connections.dynamic.dev/";
const SCHEME = "fbapp"; // must match app.json → expo.scheme

export default function App() {
  const [connecting, setConnecting] = useState(false);
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onConnect() {
    setError(null);
    setConnecting(true);
    try {
      setWallet(await connectWallet({ flowURL: FLOW_URL, scheme: SCHEME }));
    } catch (e) {
      if (!(e instanceof FireblocksConnectCancelled)) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setConnecting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect a wallet</Text>
          <Text style={styles.subtitle}>Log in with your self-custodial wallet.</Text>
        </View>

        {wallet && (
          <View style={styles.card}>
            <WalletIcon source={wallet.walletImage} name={wallet.walletName} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{wallet.walletName || "Wallet"}</Text>
              <Text style={styles.cardMeta}>
                {wallet.chain} · {shortAddress(wallet.address)}
              </Text>
            </View>
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, connecting && styles.buttonDisabled]}
          onPress={onConnect}
          disabled={connecting}
        >
          {connecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Connect wallet</Text>
          )}
        </Pressable>
        {wallet && (
          <Pressable onPress={() => setWallet(null)}>
            <Text style={styles.reset}>Reset</Text>
          </Pressable>
        )}
        <Text style={styles.secured}>SECURED BY FIREBLOCKS</Text>
      </View>
    </SafeAreaView>
  );
}

function shortAddress(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

// Dynamic serves wallet icons as SVG sprites (sprite.svg#id), which RN's <Image>
// can't render. Draw it in a tiny WebView <img>, exactly like the Swift harness.
// Falls back to an initial avatar when there's no icon URL.
function WalletIcon({ source, name }: { source?: string; name?: string }) {
  if (!source) {
    return (
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(name || "W").charAt(0).toUpperCase()}</Text>
      </View>
    );
  }
  const safe = source.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:transparent}
body{display:flex;align-items:center;justify-content:center}
img{width:100%;height:100%;object-fit:contain;padding:5px;box-sizing:border-box}</style>
</head><body><img src="${safe}"></body></html>`;
  return (
    <View style={styles.icon}>
      <WebView
        source={{ html, baseUrl: "https://iconic.dynamic-static-assets.com/" }}
        style={styles.iconWeb}
        scrollEnabled={false}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, justifyContent: "center", gap: 20, paddingHorizontal: 24 },
  header: { alignItems: "center", gap: 8 },
  title: { fontSize: 24, fontWeight: "700", color: "#0e121b" },
  subtitle: { fontSize: 15, color: "#606770", textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e1e4ea",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1877f2",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  iconWeb: { flex: 1, backgroundColor: "transparent" },
  cardName: { fontSize: 17, fontWeight: "600", color: "#0e121b" },
  cardMeta: { fontSize: 13, color: "#606770", marginTop: 2 },
  error: { color: "#d9822b", fontSize: 13, textAlign: "center" },
  footer: { paddingBottom: 24, paddingHorizontal: 24, gap: 14, alignItems: "center" },
  button: {
    width: "100%",
    backgroundColor: "#1877f2",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  reset: { color: "#1877f2", fontSize: 13, fontWeight: "600" },
  secured: { color: "#99a0ae", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
});
