"use client";

import { Card } from "@/components/primitives";

interface Col { title: string; tag: string; tone: "down" | "up"; steps: { text: string; exposed?: boolean }[]; verdict: string }

const COLS: Col[] = [
  {
    title: "Shamir-style splitting",
    tag: "sounds similar",
    tone: "down",
    steps: [
      { text: "A full key is generated, then cut into shares" },
      { text: "Shares are stored in different places" },
      { text: "To sign, the shares are brought back together", exposed: true },
      { text: "The full key exists in memory while it signs", exposed: true },
      { text: "Signature produced; key discarded until next time" },
    ],
    verdict: "A moment of exposure on every signature, and at generation.",
  },
  {
    title: "Encrypted at rest",
    tag: "“encrypted in our database”",
    tone: "down",
    steps: [
      { text: "A full key is generated and encrypted" },
      { text: "Ciphertext stored in a database or KMS" },
      { text: "To sign, the service decrypts it", exposed: true },
      { text: "A usable key sits in service memory", exposed: true },
      { text: "Anyone with the decryption path has the key" },
    ],
    verdict: "A breach or an insider with the decryption path reaches a spendable key.",
  },
  {
    title: "2-of-2 TSS-MPC",
    tag: "this wallet",
    tone: "up",
    steps: [
      { text: "Two shares generated jointly (DKG); no full key is ever produced" },
      { text: "Client share on the device, server share in the enclave" },
      { text: "To sign, each side computes a partial signature" },
      { text: "Partials combined into one valid signature" },
      { text: "The full private key never exists, anywhere, at any time" },
    ],
    verdict: "No exposure moment to defend. Nothing to breach that spends.",
  },
];

/** Pitch section 2, as a picture. Three claims that sound alike and are not. */
export function Compare() {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {COLS.map((c) => (
        <Card key={c.title} className={c.tone === "up" ? "border-up/40 bg-up-2/30" : ""}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{c.title}</h3>
            <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${c.tone === "up" ? "bg-up text-white" : "bg-ground text-muted"}`}>{c.tag}</span>
          </div>
          <ol className="mt-4 space-y-2.5">
            {c.steps.map((s, i) => (
              <li key={s.text} className="flex items-start gap-2.5 text-[13px]">
                <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full grid place-items-center text-[11px] font-bold ${s.exposed ? "bg-down text-white" : c.tone === "up" ? "bg-up text-white" : "bg-ground text-ink-2"}`}>{i + 1}</span>
                <span className={s.exposed ? "text-down font-medium" : "text-ink-2"}>
                  {s.text}
                  {s.exposed && <span className="ml-1.5 text-[10px] uppercase tracking-wider">exposure</span>}
                </span>
              </li>
            ))}
          </ol>
          <p className={`mt-4 text-[13px] font-semibold ${c.tone === "up" ? "text-up" : "text-ink"}`}>{c.verdict}</p>
        </Card>
      ))}
    </div>
  );
}
