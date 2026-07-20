import { redirect } from "next/navigation";

/**
 * Legacy login route - the scenario front door at "/" IS the login
 * surface now (same LoginContent, beside the code panel). 307 there,
 * preserving the query string so OAuth callbacks (`dynamicOauthCode`,
 * `code`/`state`), `sessionExpired` recovery, and `loggedOut` cleanup
 * that still target /login complete on "/" instead.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else if (value !== undefined) {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  redirect(query ? `/?${query}` : "/");
}
