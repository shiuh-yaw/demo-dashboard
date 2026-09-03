"use client";

/**
 * The presenter's side of the stage. Hidden behind "P". Cues come from the
 * brief; controls drive the parts of the story the audience should not see
 * being set up (device loss, reset, immersive chrome).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBackend } from "@/lib/backend";
import { useSession } from "@/lib/session/store";
import { BEATS, BOUNDARIES, TRAP_QUESTIONS } from "@/lib/session/script";
import type { Beat } from "@/lib/session/types";
import { clock } from "@/lib/format";
import { Badge, Button } from "@/components/primitives";
import { openSheet } from "@/components/open-sheet";

export function PresenterRail() {
  const { state, dispatch, currentBeat } = useSession();
  const backend = useBackend();
  const router = useRouter();
  const [expanded, setExpanded] = useState<Beat>(currentBeat);
  const [confirm, setConfirm] = useState<"lose" | "reset" | null>(null);
  const [tab, setTab] = useState<"beats" | "boundaries">("beats");
  const [, setTick] = useState(0);

  useEffect(() => setExpanded(currentBeat), [currentBeat]);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // "p" toggles the rail. Never while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "p" || e.key === "P") dispatch({ type: "presenter", on: !state.presenter });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.presenter, dispatch]);

  if (!state.presenter) return null;

  const signedIn = !!state.person && !!state.wallet && !state.deviceLost;
  const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const goTo = (beat: Beat) => {
    if (beat === 2) {
      router.push("/portfolio");
      setTimeout(() => openSheet(state.balances.usdc > 0 ? "earn" : "fund"), 300);
    }
    if (beat === 3) {
      router.push("/portfolio");
      setTimeout(() => openSheet("send"), 300);
    }
    if (beat === 4) setConfirm("lose");
    if (beat === 5) router.push("/architecture");
  };

  const lose = async () => {
    setConfirm(null);
    await backend.loseDevice();
    router.replace("/");
  };
  const reset = async () => {
    setConfirm(null);
    await backend.hardReset();
    router.replace("/");
  };

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-[380px] max-w-full z-50 bg-[#14171f] text-white border-l border-white/10 flex flex-col shadow-2xl" aria-label="Presenter">
      <header className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Presenter</span>
        <Badge tone={backend.mode === "live" ? "up" : "info"}>{backend.mode === "live" ? "Live · Sepolia" : "Staged · offline"}</Badge>
        <span className="tnum text-[12px] text-white/60 ml-auto">
          {mm}:{ss}
        </span>
        <button className="text-white/60 hover:text-white" onClick={() => dispatch({ type: "presenter", on: false })} aria-label="Close presenter">
          ×
        </button>
      </header>

      <div className="px-4 py-3 border-b border-white/10 text-[12px] text-white/70 grid grid-cols-2 gap-y-1">
        <span>Account</span>
        <span className="text-white truncate">{state.person?.name ?? (state.deviceLost ? "signed out (device B)" : "—")}</span>
        <span>Device</span>
        <span className="text-white">
          {state.device}
          {state.deviceLost ? " · client share gone" : ""}
        </span>
        <span>Beat</span>
        <span className="text-white">
          {currentBeat} of 5 · {Object.values(state.beatsDone).filter(Boolean).length} done
        </span>
        <span>Address</span>
        <span className="text-white">{state.revealAddress ? "revealed" : "hidden"}</span>
      </div>

      <div className="flex border-b border-white/10 text-[13px]">
        {(["beats", "boundaries"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 font-semibold capitalize ${tab === t ? "text-white border-b-2 border-brand" : "text-white/50"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "beats" ? (
          <ol>
            {BEATS.map((b) => {
              const done = state.beatsDone[b.beat];
              const current = b.beat === currentBeat;
              const open = expanded === b.beat;
              return (
                <li key={b.beat} className={`border-b border-white/10 ${current ? "bg-white/5" : ""}`}>
                  <button className="w-full text-left px-4 py-3 flex items-center gap-3" onClick={() => setExpanded(b.beat)}>
                    <span className={`h-6 w-6 rounded-full grid place-items-center text-[12px] font-bold ${done ? "bg-up text-white" : current ? "bg-brand text-white pulse" : "bg-white/10 text-white/70"}`}>
                      {done ? "✓" : b.beat}
                    </span>
                    <span className="text-[14px] font-semibold flex-1">{b.title}</span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 space-y-3 text-[13px] leading-relaxed">
                      <Cue label="Show">{b.show}</Cue>
                      <Cue label="Say" tone="brand">
                        {b.say}
                      </Cue>
                      <Cue label="Watch" tone="warn">
                        {b.watch}
                      </Cue>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-white/50">Done when: {b.doneWhen}</span>
                        {b.beat > 1 && signedIn && (
                          <Button size="sm" variant="secondary" className="ml-auto" onClick={() => goTo(b.beat)}>
                            {b.beat === 4 ? "Lose device A" : "Go"}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="px-4 py-3 space-y-4 text-[13px]">
            <p className="text-white/60 text-[12px]">Say the boundary before they ask. Overselling one of these in front of a platform team costs the architecture credibility beat 2 built.</p>
            <ul className="space-y-3">
              {BOUNDARIES.map((b) => (
                <li key={b.feature} className="rounded-lg bg-white/5 p-3">
                  <div className="font-semibold">{b.feature}</div>
                  <div className="text-white/70 mt-0.5">{b.claim}</div>
                  <div className="text-amber-300 mt-1">{b.boundary}</div>
                </li>
              ))}
            </ul>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60 mb-2">Three questions, answered cold</div>
              <ol className="list-decimal pl-5 space-y-1.5 text-white/80">
                {TRAP_QUESTIONS.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-3 space-y-2">
        {confirm === "lose" && (
          <Confirm text="Lose device A? The client share and session on this device are discarded. Balance and positions stay on chain." onYes={lose} onNo={() => setConfirm(null)} />
        )}
        {confirm === "reset" && (
          <Confirm text="Reset the whole demo? Signs out, wipes local session and SDK storage. The next run starts from beat 1." onYes={reset} onNo={() => setConfirm(null)} danger />
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "reveal", on: !state.revealAddress })} disabled={!state.wallet}>
            {state.revealAddress ? "Hide address" : "Reveal address"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirm("lose")} disabled={!signedIn}>
            Lose device A
          </Button>
          <Button size="sm" variant="secondary" onClick={() => router.push("/architecture")} disabled={!signedIn}>
            Architecture
          </Button>
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "immersive", on: !state.immersive })}>
            {state.immersive ? "Show Dynamic chrome" : "Immersive chrome"}
          </Button>
          <Button size="sm" variant="danger" className="col-span-2" onClick={() => setConfirm("reset")}>
            Reset demo
          </Button>
        </div>
        <p className="text-[11px] text-white/40 tnum">
          Session started {clock(state.startedAt)} · {backend.busy ?? "idle"}
        </p>
      </div>
    </aside>
  );
}

function Cue({ label, tone, children }: { label: string; tone?: "brand" | "warn"; children: React.ReactNode }) {
  const color = tone === "brand" ? "text-brand" : tone === "warn" ? "text-amber-300" : "text-white/60";
  return (
    <div>
      <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${color}`}>{label}</div>
      <p className="text-white/85 mt-0.5">{children}</p>
    </div>
  );
}

function Confirm({ text, onYes, onNo, danger }: { text: string; onYes: () => void; onNo: () => void; danger?: boolean }) {
  return (
    <div className="rise rounded-lg bg-white/10 p-3 text-[13px]">
      <p className="text-white/85">{text}</p>
      <div className="flex gap-2 mt-2.5">
        <Button size="sm" variant={danger ? "danger" : "primary"} onClick={onYes}>
          Yes, do it
        </Button>
        <Button size="sm" variant="ghost" className="text-white/70" onClick={onNo}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
