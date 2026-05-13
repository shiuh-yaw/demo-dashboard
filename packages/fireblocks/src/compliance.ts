/**
 * Fireblocks Compliance (pre-transaction screening).
 *
 * Thin wrapper around the SDK's compliance.screenTransaction call.
 * Collapses Fireblocks's multi-provider response into a single
 * verdict ("allow" | "block" | "review") while preserving the raw
 * SDK response for callers that need full detail.
 *
 * Other compliance surfaces (Travel Rule submission, post-tx alerts,
 * blocklists) intentionally live behind the `fb.api` raw REST escape
 * hatch rather than wrapped here — their shapes vary too much by
 * jurisdiction and partner to abstract usefully (see the fireblocks
 * skill for details).
 */

export interface ScreenTransactionParams {
  fromVaultAccountId?: string;
  fromAddress?: string;
  toAddress: string;
  asset: string; // e.g. "USDC_BASE_TEST"
  amount: string; // string for precision
}

export type ComplianceVerdict = "allow" | "block" | "review";

export interface ScreenTransactionResult {
  verdict: ComplianceVerdict;
  riskScore?: number;
  providers: Array<{ name: string; result: unknown }>;
  /** Full SDK response. Treat as opaque; shape evolves with the SDK. */
  raw: unknown;
}

export class FireblocksComplianceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FireblocksComplianceError";
  }
}

// Minimal shape of what the SDK is expected to provide.
// The wrapper does NOT assume the SDK type system is stable across
// versions — it pulls verdict / riskScore / providerResults defensively.
interface RawSdkResponse {
  data?: {
    verdict?: unknown;
    riskScore?: unknown;
    providerResults?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ComplianceSdk {
  compliance: {
    screenTransaction(params: unknown): Promise<unknown>;
  };
}

function deriveVerdict(raw: RawSdkResponse): ComplianceVerdict {
  const top =
    typeof raw.data?.verdict === "string"
      ? raw.data.verdict.toUpperCase()
      : undefined;
  const providerResults = Array.isArray(raw.data?.providerResults)
    ? (raw.data!.providerResults as Array<{ verdict?: unknown }>)
    : [];
  const providerVerdicts = providerResults
    .map((p) => (typeof p.verdict === "string" ? p.verdict.toUpperCase() : undefined))
    .filter((v): v is string => v !== undefined);
  const combined = [top, ...providerVerdicts].filter(
    (v): v is string => v !== undefined,
  );

  if (combined.includes("BLOCK")) return "block";
  if (combined.includes("REVIEW")) return "review";
  if (combined.length > 0 && combined.every((v) => v === "ALLOW")) return "allow";
  // Default to review when we can't decide — fail-safe; callers can
  // inspect `raw` to make their own decision.
  return "review";
}

function deriveRiskScore(raw: RawSdkResponse): number | undefined {
  const score = raw.data?.riskScore;
  return typeof score === "number" ? score : undefined;
}

function deriveProviders(
  raw: RawSdkResponse,
): Array<{ name: string; result: unknown }> {
  const list = Array.isArray(raw.data?.providerResults)
    ? raw.data!.providerResults
    : [];
  return list.map((p: unknown) => {
    const name =
      typeof p === "object" &&
      p !== null &&
      "name" in p &&
      typeof (p as { name: unknown }).name === "string"
        ? (p as { name: string }).name
        : "unknown";
    return { name, result: p };
  });
}

export interface CreateComplianceModuleDeps {
  sdk: ComplianceSdk;
}

export interface ComplianceModule {
  screenTransaction(params: ScreenTransactionParams): Promise<ScreenTransactionResult>;
}

export function createComplianceModule(
  deps: CreateComplianceModuleDeps,
): ComplianceModule {
  return {
    async screenTransaction(
      params: ScreenTransactionParams,
    ): Promise<ScreenTransactionResult> {
      let raw: unknown;
      try {
        raw = await deps.sdk.compliance.screenTransaction(params);
      } catch (err) {
        throw new FireblocksComplianceError(
          err instanceof Error
            ? err.message
            : "Fireblocks compliance screening failed",
          err,
        );
      }
      const r = raw as RawSdkResponse;
      return {
        verdict: deriveVerdict(r),
        riskScore: deriveRiskScore(r),
        providers: deriveProviders(r),
        raw,
      };
    },
  };
}
