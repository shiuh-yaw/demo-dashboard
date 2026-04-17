import { redirect } from "next/navigation";

/**
 * Root route — redirects to payment methods.
 * Middleware handles auth-aware redirection before this runs.
 */
export default function RootPage() {
  redirect("/payment-methods");
}
