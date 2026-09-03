"use client";

import type { ExternalWallet, Person, SessionWallet } from "@/lib/session/types";
import { shortAddr } from "@/lib/format";

export type Threat = "none" | "exchange-db" | "dynamic-infra" | "insider";

const INK = "#14171f";
const MUTED = "#6b7280";
const LINE = "#e6e8ec";
const BRAND = "#e8590c";
const ENCLAVE = "#5b3fd6";
const INFO = "#2f5fd0";
const DOWN = "#c93b3b";

/**
 * The whole story in one picture, bound to the live wallet. Rendered as SVG so
 * it can be exported as the standalone artefact the delivery checklist asks for.
 */
export function KeySplitDiagram({ wallet, external, threat, person }: { wallet: SessionWallet; external: ExternalWallet | null; threat: Threat; person: Person | null }) {
  const device = wallet.shares.find((s) => s.location === "device");
  const enclave = wallet.shares.find((s) => s.location === "enclave");
  const backup = wallet.shares.find((s) => s.location === "backup");

  const hitExchange = threat === "exchange-db" || threat === "insider";
  const hitDynamic = threat === "dynamic-infra";

  return (
    <svg viewBox="0 0 960 560" className="w-full h-auto" role="img" aria-label="2-of-2 TSS-MPC key split for this wallet">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={MUTED} />
        </marker>
      </defs>

      {/* Signing lane */}
      <rect x="300" y="150" width="360" height="150" rx="16" fill="#fafafa" stroke={LINE} />
      <text x="480" y="178" textAnchor="middle" fontSize="12" fontWeight="700" fill={MUTED} letterSpacing="1.5">
        2-OF-2 SIGNING SESSION · {wallet.curve.toUpperCase()}
      </text>
      <line x1="300" y1="225" x2="660" y2="225" stroke={BRAND} strokeWidth="2" className="flow-line" />
      <rect x="360" y="205" width="240" height="40" rx="20" fill="#fff" stroke={LINE} />
      <text x="480" y="230" textAnchor="middle" fontSize="13" fontWeight="600" fill={INK}>
        partial signature + partial signature
      </text>
      <text x="480" y="270" textAnchor="middle" fontSize="12" fill={INK} fontWeight="700">
        one valid signature · the full private key never exists
      </text>
      <text x="480" y="288" textAnchor="middle" fontSize="11" fill={MUTED}>
        not at rest · not in memory · not at signing time
      </text>

      {/* Device */}
      <Node x={40} y={110} w={240} h={230} title={`User's device ${wallet.deviceId}`} subtitle={person?.name ?? "Exchange user"} accent={BRAND} dim={threat !== "none"}>
        <Chip x={56} y={190} w={208} label="CLIENT SHARE" value={device?.id ?? "—"} accent={BRAND} />
        <text x="56" y="246" fontSize="11" fill={MUTED}>
          <tspan x="56" dy="0">Encrypted at rest on the device.</tspan>
          <tspan x="56" dy="15">Unlocked by the user's own sign-in.</tspan>
          <tspan x="56" dy="15">Never leaves the device in plaintext.</tspan>
        </text>
        <text x="56" y="306" fontSize="11" fill={INK} fontWeight="600">
          Wallet · {shortAddr(wallet.address)}
        </text>
        {external && (
          <text x="56" y="324" fontSize="11" fill={MUTED}>
            + {external.label} {shortAddr(external.address)} (connector)
          </text>
        )}
      </Node>

      {/* Enclave */}
      <Node x={680} y={110} w={240} h={230} title="Dynamic · hardware enclave" subtitle="Trusted execution environment" accent={ENCLAVE} hit={hitDynamic} dim={threat === "exchange-db" || threat === "insider"}>
        <Chip x={696} y={190} w={208} label="SERVER SHARE" value={enclave?.id ?? "—"} accent={ENCLAVE} />
        <text x="696" y="246" fontSize="11" fill={MUTED}>
          <tspan x="696" dy="0">Generated and used only inside the TEE.</tspan>
          <tspan x="696" dy="15">Operators cannot read it out.</tspan>
          <tspan x="696" dy="15">Signs only with the user's session.</tspan>
        </text>
        <text x="696" y="306" fontSize="11" fill={INK} fontWeight="600">
          Fireblocks MPC platform underneath
        </text>
      </Node>

      {/* Exchange backend */}
      <Node x={300} y={380} w={360} h={150} title="Exchange backend" subtitle="Their platform team's stack" accent={INK} hit={hitExchange}>
        <text x="316" y="440" fontSize="12" fill={INK}>
          <tspan x="316" dy="0">Holds: user records · session tokens · positions ledger</tspan>
        </text>
        <rect x="316" y="456" width="328" height="34" rx="8" fill={hitExchange ? "#fdecec" : "#e7f6ee"} />
        <text x="480" y="478" textAnchor="middle" fontSize="13" fontWeight="700" fill={hitExchange ? DOWN : "#1f8a5b"}>
          Key material held: none
        </text>
        <text x="480" y="512" textAnchor="middle" fontSize="11" fill={MUTED}>
          No custody position. No concentration. Nothing to license as a custodian.
        </text>
      </Node>

      {/* Backup */}
      <Node x={680} y={380} w={240} h={150} title="Encrypted share backup" subtitle={`location: ${backup?.backupLocation ?? wallet.backup.location}`} accent={INFO} hit={hitDynamic}>
        <text x="696" y="440" fontSize="11" fill={MUTED}>
          <tspan x="696" dy="0">Ciphertext of the client share.</tspan>
          <tspan x="696" dy="15">Decrypts only on a user device,</tspan>
          <tspan x="696" dy="15">through the Encryption Proxy.</tspan>
        </text>
        <text x="696" y="512" fontSize="11" fill={INK} fontWeight="600">
          {wallet.recoveredAt ? `Used to restore device ${wallet.deviceId}` : "Optional cloud copy → 2-of-3"}
        </text>
      </Node>

      {/* Connectors */}
      <path d="M160 340 L160 455 L300 455" fill="none" stroke={MUTED} strokeWidth="1.5" markerEnd="url(#arrow)" />
      <text x="168" y="400" fontSize="11" fill={MUTED}>session token only</text>
      <path d="M800 340 L800 380" fill="none" stroke={MUTED} strokeWidth="1.5" strokeDasharray="4 4" />
      <text x="808" y="364" fontSize="11" fill={MUTED}>encrypted export</text>

      {threat !== "none" && (
        <g>
          <rect x="40" y="16" width="880" height="64" rx="12" fill="#fdecec" stroke={DOWN} />
          <text x="480" y="42" textAnchor="middle" fontSize="13" fontWeight="700" fill={DOWN}>
            {threat === "exchange-db" && "Attacker inside Exchange's database"}
            {threat === "dynamic-infra" && "Attacker inside Dynamic's infrastructure, outside the enclave"}
            {threat === "insider" && "Malicious insider at Exchange"}
          </text>
          <text x="480" y="64" textAnchor="middle" fontSize="12" fill={INK}>
            Red is what they reach. The signature needs both shares. They have at most one, and only as ciphertext.
          </text>
        </g>
      )}
      {threat === "none" && (
        <text x="480" y="60" textAnchor="middle" fontSize="13" fill={MUTED}>
          Two shares, two places, never combined. The wallet is {wallet.address}.
        </text>
      )}
    </svg>
  );
}

function Node({ x, y, w, h, title, subtitle, accent, hit, dim, children }: { x: number; y: number; w: number; h: number; title: string; subtitle: string; accent: string; hit?: boolean; dim?: boolean; children?: React.ReactNode }) {
  return (
    <g opacity={dim && !hit ? 0.9 : 1}>
      <rect x={x} y={y} width={w} height={h} rx="16" fill={hit ? "#fff5f5" : "#fff"} stroke={hit ? DOWN : LINE} strokeWidth={hit ? 2.5 : 1.5} />
      <rect x={x} y={y} width={6} height={h} rx="3" fill={hit ? DOWN : accent} />
      <text x={x + 16} y={y + 26} fontSize="14" fontWeight="700" fill={INK}>
        {title}
      </text>
      <text x={x + 16} y={y + 44} fontSize="11" fill={MUTED}>
        {subtitle}
      </text>
      {children}
    </g>
  );
}

function Chip({ x, y, w, label, value, accent }: { x: number; y: number; w: number; label: string; value: string; accent: string }) {
  return (
    <g>
      <rect x={x} y={y - 22} width={w} height={44} rx="10" fill="#fafafa" stroke={LINE} />
      <text x={x + 10} y={y - 6} fontSize="10" fontWeight="700" fill={accent} letterSpacing="1.2">
        {label}
      </text>
      <text x={x + 10} y={y + 12} fontSize="11" fill={INK} fontFamily="JetBrains Mono, ui-monospace, monospace">
        {value.length > 28 ? `${value.slice(0, 26)}…` : value}
      </text>
    </g>
  );
}
