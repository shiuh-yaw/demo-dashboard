export const money = (n: number, opts: { digits?: number } = {}) => {
  const digits = opts.digits ?? 2;
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
};

export const num = (n: number, digits = 2) =>
  new Intl.NumberFormat("en-SG", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

export const pct = (n: number, digits = 2) => `${n >= 0 ? "+" : ""}${num(n, digits)}%`;

export const shortAddr = (a: string, head = 6, tail = 4) =>
  a.length > head + tail + 2 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a;

export const shortHash = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

export const clock = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export const relTime = (ts: number) => {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
};

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
