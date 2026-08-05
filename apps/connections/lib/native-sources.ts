import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The real host-harness sources from `native/`, read off disk so anything that
 * quotes them can never drift from the code integrators actually copy.
 *
 * Upstream inlined these with Vite's `?raw` import; Next has no equivalent.
 * Server-only. The one consumer is `/`, which is dynamic (it reads headers for
 * theming), so these are read per-request - `outputFileTracingIncludes` in
 * next.config.ts keeps the files in the deployed bundle.
 */
export type NativeSources = {
  fireblocks: string;
  headless: string;
  walletList: string;
  rn: string;
  android: string;
  androidHeadless: string;
  androidSample: string;
};

const SOURCE_FILES: Record<keyof NativeSources, string> = {
  fireblocks: "native/ios-harness/Sources/FireblocksConnectFlow.swift",
  headless: "native/ios-harness/Sources/FireblocksHeadlessConnect.swift",
  walletList: "native/ios-harness/Sources/WalletListView.swift",
  rn: "native/react-native/FireblocksConnect.ts",
  android:
    "native/android/app/src/main/java/com/fireblocks/connect/FireblocksConnect.kt",
  androidHeadless:
    "native/android/app/src/main/java/com/fireblocks/connect/FireblocksHeadlessConnect.kt",
  androidSample:
    "native/android/app/src/main/java/com/fireblocks/connect/sample/MainActivity.kt",
};

export async function loadNativeSources(): Promise<NativeSources> {
  const entries = await Promise.all(
    Object.entries(SOURCE_FILES).map(async ([key, relativePath]) => {
      const contents = await readFile(
        path.join(process.cwd(), relativePath),
        "utf8",
      );
      return [key, contents] as const;
    }),
  );
  return Object.fromEntries(entries) as NativeSources;
}
