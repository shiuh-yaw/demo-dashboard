"use client";

/**
 * "Lose the device": discard everything the SDK persisted in this browser.
 *
 * The client key share and the session live in web storage; wiping them is
 * the closest a single browser gets to a second device. The enclave share is
 * untouched (it is not here), and the encrypted backup Dynamic keeps is what
 * the next sign-in restores from.
 */
export async function wipeSdkStorage(): Promise<void> {
  try {
    Object.keys(localStorage)
      .filter((k) => /dynamic|waas/i.test(k))
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  try {
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs
        .filter((d) => d.name && /dynamic|waas|keyshare/i.test(d.name))
        .map(
          (d) =>
            new Promise<void>((resolve) => {
              const req = indexedDB.deleteDatabase(d.name!);
              req.onsuccess = req.onerror = req.onblocked = () => resolve();
            }),
        ),
    );
  } catch {
    /* ignore */
  }
}
