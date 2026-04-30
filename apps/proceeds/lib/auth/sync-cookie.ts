export async function syncCookie(token: string): Promise<void> {
  const res = await fetch("/api/auth/sync-cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    throw new Error(`Failed to sync auth cookie (HTTP ${res.status})`);
  }
}
