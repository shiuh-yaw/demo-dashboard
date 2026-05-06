/**
 * Client-only exports for @dynamic-demos/dynamic.
 * Use this entry when importing in client components to avoid pulling server code.
 */

export { ConnectedAuthScreen } from "./connected-auth-screen";
export { useAuthForm } from "./use-auth-form";
export type { ConnectedAuthScreenProps, DynamicAuthAdapter } from "./types";

// Phase 1D client-side primitives
export {
  DynamicInit,
  type DynamicInitProps,
  type DynamicInitClientAdapter,
  type DynamicInitCookieSync,
} from "./DynamicInit";
export {
  DynamicAuthProvider,
  type DynamicAuthProviderProps,
} from "./DynamicAuthProvider";
