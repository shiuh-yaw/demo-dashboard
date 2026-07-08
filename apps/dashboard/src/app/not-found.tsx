import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
      <div className="bg-white rounded-xl border border-[#e1e4ea] p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-full bg-[#f5f7fa] flex items-center justify-center mx-auto mb-4">
          <Search className="w-6 h-6 text-[#99a0ae]" />
        </div>
        <h2 className="text-lg font-semibold text-[#0e121b] mb-2">
          Page not found
        </h2>
        <p className="text-sm text-[#525866] mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#335cff] hover:bg-[#2850e8] text-white font-medium text-sm py-2 px-4 rounded-md transition-colors"
        >
          <Home className="w-4 h-4" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
