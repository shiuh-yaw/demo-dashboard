import Link from "next/link";

/**
 * 404 page for the public (unauthenticated) route group. Renders inside the
 * public layout's chrome — no auth/session calls, no Dynamic SDK imports.
 */
export default function PublicNotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        The demo you're looking for doesn't exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-1 rounded-lg bg-[#4779FF] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3a66e0]"
      >
        All demos
      </Link>
    </div>
  );
}
