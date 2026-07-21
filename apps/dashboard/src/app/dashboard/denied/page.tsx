import Link from "next/link";

/**
 * Access-denied page. Reached when a visitor holds a valid Dynamic session but
 * is not allowlisted (off-domain, deactivated) or lacks the required role.
 * Lives outside the (operator) group so its own render never re-triggers the
 * gate that redirected here.
 */
export default function DeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafbfc] p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Access not available
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Your account is signed in but does not have access to this workspace.
          Ask an owner or admin to grant you a role, then sign in again.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Back to demos
        </Link>
      </div>
    </div>
  );
}
