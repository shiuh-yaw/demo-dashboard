// Integer-cent arithmetic to avoid IEEE 754 representation loss at the
// half-cent boundary. Example: 11 * 1.0850 = 11.935 mathematically, but
// IEEE 754 yields 11.934999…, which `Math.round(x * 100) / 100` then maps
// to 11.93 instead of 11.94. Cvent amounts are always 2-decimal strings,
// so we can parse them into integer cents without loss before applying
// the rate.
export function computeAmountDueUsd(amountStr: string, rate: number): string {
  const [whole = "0", frac = ""] = amountStr.split(".");
  const fracPadded = (frac + "00").slice(0, 2);
  const amountCents = Number.parseInt(whole, 10) * 100 + Number.parseInt(fracPadded, 10);
  const usdCents = Math.round(amountCents * rate);
  const dollars = Math.floor(usdCents / 100);
  const cents = usdCents % 100;
  return `${dollars}.${String(cents).padStart(2, "0")}`;
}
