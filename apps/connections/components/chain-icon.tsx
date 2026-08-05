// Inline chain logos so the chain picker always renders (no network dependency,
// webview-safe). Ethereum mark stands in for the EVM family; Solana for SOL.

export function ChainIcon({
  chain,
  size = 28,
}: {
  chain: "evm" | "solana" | "polygon";
  size?: number;
}) {
  if (chain === "polygon") {
    return (
      <svg width={size} height={size} viewBox="0 0 38.4 33.5" aria-hidden="true">
        <path
          fill="#8247E5"
          d="M29 10.2c-.7-.4-1.6-.4-2.4 0l-5.6 3.3-3.8 2.2-5.5 3.3c-.7.4-1.6.4-2.4 0l-4.3-2.6c-.7-.4-1.2-1.2-1.2-2.1V9.2c0-.8.4-1.6 1.2-2.1l4.3-2.5c.7-.4 1.6-.4 2.4 0l4.3 2.6c.7.4 1.2 1.2 1.2 2.1v3.3l3.8-2.3V6.4c0-.8-.4-1.6-1.2-2.1L11.5.8c-.7-.4-1.6-.4-2.4 0L1.2 4.3C.4 4.8 0 5.6 0 6.4V20c0 .8.4 1.6 1.2 2.1l7.9 4.6c.7.4 1.6.4 2.4 0l5.5-3.2 3.8-2.2 5.5-3.2c.7-.4 1.6-.4 2.4 0l4.3 2.5c.7.4 1.2 1.2 1.2 2.1v5.1c0 .8-.4 1.6-1.2 2.1l-4.3 2.6c-.7.4-1.6.4-2.4 0l-4.3-2.5c-.7-.4-1.2-1.2-1.2-2.1v-3.3l-3.8 2.3v3.3c0 .8.4 1.6 1.2 2.1l7.9 4.6c.7.4 1.6.4 2.4 0l7.9-4.6c.7-.4 1.2-1.2 1.2-2.1V15.4c0-.8-.4-1.6-1.2-2.1L29 10.2z"
        />
      </svg>
    );
  }
  if (chain === "solana") {
    return (
      <svg width={size} height={size} viewBox="0 0 397.7 311.7" aria-hidden="true">
        <defs>
          <linearGradient
            id="sol-grad"
            x1="360.9"
            y1="-37.5"
            x2="141.2"
            y2="383.3"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#00FFA3" />
            <stop offset="1" stopColor="#DC1FFF" />
          </linearGradient>
        </defs>
        <path
          fill="url(#sol-grad)"
          d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
        />
        <path
          fill="url(#sol-grad)"
          d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
        />
        <path
          fill="url(#sol-grad)"
          d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 256 417" aria-hidden="true">
      <path fill="#343434" d="M127.9 0l-2.8 9.5v275.7l2.8 2.7 127.9-75.6z" />
      <path fill="#8C8C8C" d="M127.9 0L0 212.3l127.9 75.6V154.2z" />
      <path fill="#3C3C3B" d="M127.9 312.2l-1.6 1.9v98.2l1.6 4.6L256 236.6z" />
      <path fill="#8C8C8C" d="M127.9 416.9v-104.7L0 236.6z" />
      <path fill="#141414" d="M127.9 287.9l127.9-75.6-127.9-58.1z" />
      <path fill="#393939" d="M0 212.3l127.9 75.6V154.2z" />
    </svg>
  );
}
