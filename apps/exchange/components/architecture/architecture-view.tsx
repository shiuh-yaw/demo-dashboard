"use client";

import { useEffect, useState } from "react";
import { useMilestone } from "@/hooks/use-milestone";
import { useSession } from "@/lib/session/store";
import { clock } from "@/lib/format";
import { Badge, Card, Eyebrow } from "@/components/primitives";
import { KeySplitDiagram, type Threat } from "@/components/architecture/key-split-diagram";
import { Compare } from "@/components/architecture/compare";
import { Boundary } from "@/components/architecture/boundary";

type Tab = "split" | "blast" | "compare" | "boundary";
const TABS: { id: Tab; label: string }[] = [
  { id: "split", label: "The 2-of-2 split" },
  { id: "blast", label: "Blast radius" },
  { id: "compare", label: "Why “encrypted in our database” is a different claim" },
  { id: "boundary", label: "Where Fireblocks ends and Dynamic begins" },
];

/**
 * Beat 5. Not an app screen: the architecture, live, with this session's
 * wallet on it. The address appears here, deliberately, for the first time.
 */
export function ArchitectureView() {
  const { state, dispatch } = useSession();
  const milestone = useMilestone();
  const [tab, setTab] = useState<Tab>("split");
  // Beat 5: the address appears here, deliberately, for the first time.
  useEffect(() => {
    dispatch({ type: "reveal", on: true });
    dispatch({ type: "beat-done", beat: 5 });
    milestone("architecture_viewed");
  }, [dispatch, milestone]);
  const [threat, setThreat] = useState<Threat>("none");
  const wallet = state.wallet!;

  return (
    <div className="rise">
      <Eyebrow className="mb-2">Architecture · this session</Eyebrow>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Who holds what</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="enclave">{wallet.scheme.replace(/_/g, "-").toLowerCase()}</Badge>
          <Badge tone="neutral">{wallet.curve}</Badge>
          <Badge tone="neutral">{wallet.chainName}</Badge>
          {wallet.version && <Badge tone="neutral">wallet {wallet.version}</Badge>}
        </div>
      </div>

      <Card className="p-4 mb-5">
        <div className="flex items-center gap-3 flex-wrap text-[13px]">
          <span className="text-muted">Wallet address</span>
          <span className="mono text-[14px] font-medium break-all">{wallet.address}</span>
          <span className="text-muted ml-auto tnum">
            created {clock(wallet.createdAt)}
            {wallet.recoveredAt && <> · restored on device {wallet.deviceId} {clock(wallet.recoveredAt)}</>}
          </span>
        </div>
      </Card>

      <div className="flex gap-1 flex-wrap mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`h-9 px-3.5 rounded-lg text-[13px] font-medium transition-colors ${tab === t.id ? "bg-ink text-white" : "bg-card border border-line text-ink-2 hover:bg-ground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "split" || tab === "blast") && (
        <div className="@container">
        <div className="grid @[1080px]:grid-cols-[1fr_320px] gap-5">
          <Card className="p-3 sm:p-5">
            <KeySplitDiagram wallet={wallet} external={state.external} threat={tab === "blast" ? threat : "none"} person={state.person} />
          </Card>
          <div className="grid @[640px]:grid-cols-2 @[1080px]:grid-cols-1 gap-4 items-start">
            {tab === "split" ? <SplitNotes /> : <BlastPanel threat={threat} setThreat={setThreat} />}
          </div>
        </div>
        </div>
      )}
      {tab === "compare" && <Compare />}
      {tab === "boundary" && <Boundary />}
    </div>
  );
}

function SplitNotes() {
  const { state } = useSession();
  const w = state.wallet!;
  return (
    <>
      <Card>
        <h3 className="font-semibold">Shares in this wallet</h3>
        <ul className="mt-3 space-y-2.5 text-[13px]">
          {w.shares.map((s) => (
            <li key={s.id} className="flex items-start gap-2.5">
              <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${s.location === "device" ? "bg-brand" : s.location === "enclave" ? "bg-enclave" : "bg-info"}`} />
              <div className="min-w-0">
                <div className="font-medium">{s.label}</div>
                <div className="mono text-[11px] text-muted break-all">{s.id}</div>
                <div className="text-[11px] text-muted tnum">
                  {s.encrypted ? "encrypted at rest" : "plaintext"} · {clock(s.createdAt)}
                  {s.backupLocation && <> · backup: {s.backupLocation}</>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h3 className="font-semibold">Three sentences for the risk team</h3>
        <ol className="mt-3 space-y-2 text-[13px] text-ink-2 list-decimal pl-4">
          <li>The private key is never assembled: not at rest, not in memory, not at signing time.</li>
          <li>Exchange's systems hold session tokens and a ledger. No key material, so no custody.</li>
          <li>The server share lives in a hardware enclave. A breach of the database around it does not reach it.</li>
        </ol>
      </Card>
    </>
  );
}

const THREATS: { id: Threat; label: string; reaches: string[]; not: string[]; verdict: string }[] = [
  {
    id: "exchange-db",
    label: "Attacker inside Exchange's database",
    reaches: ["User records and KYC data", "Session tokens (revocable)", "The positions ledger"],
    not: ["The client share (on the user's device)", "The server share (inside the enclave)", "Any signature over any transaction"],
    verdict: "No spendable key. Nothing to move.",
  },
  {
    id: "dynamic-infra",
    label: "Attacker inside Dynamic's infrastructure",
    reaches: ["Ciphertext of the client-share backup", "Wallet metadata: addresses, chains, timestamps"],
    not: ["The server share in plaintext (it exists only inside the TEE)", "The client share (on the device)", "The backup in plaintext (decrypts only on an authenticated user device)"],
    verdict: "No spendable key. One share, and only its ciphertext.",
  },
  {
    id: "insider",
    label: "Malicious insider at Exchange",
    reaches: ["Everything the database attacker reaches", "The ability to change what the app displays"],
    not: ["The client share", "The server share", "The ability to sign: the enclave signs only with the user's device share in the session"],
    verdict: "Can lie on a screen. Cannot move funds.",
  },
];

function BlastPanel({ threat, setThreat }: { threat: Threat; setThreat: (t: Threat) => void }) {
  const t = THREATS.find((x) => x.id === threat);
  return (
    <>
      <Card>
        <h3 className="font-semibold">Pick an attacker</h3>
        <div className="mt-3 space-y-2">
          {THREATS.map((x) => (
            <button
              key={x.id}
              onClick={() => setThreat(threat === x.id ? "none" : x.id)}
              className={`w-full text-left rounded-xl border px-3.5 py-2.5 text-[13px] font-medium ${threat === x.id ? "border-down bg-down-2 text-down" : "border-line hover:bg-ground"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </Card>
      {t && (
        <Card className="rise">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-down">Reaches</div>
          <ul className="mt-1.5 text-[13px] space-y-1 list-disc pl-4 text-ink-2">
            {t.reaches.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-up mt-4">Does not reach</div>
          <ul className="mt-1.5 text-[13px] space-y-1 list-disc pl-4 text-ink-2">
            {t.not.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-ink text-white px-3.5 py-3 text-[13px] font-semibold">{t.verdict}</div>
        </Card>
      )}
      {!t && (
        <Card>
          <p className="text-[13px] text-muted">Colour in each attacker in turn. The point is what stays white.</p>
        </Card>
      )}
    </>
  );
}
