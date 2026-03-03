import { getFireblocksClient } from "@/lib/fireblocks";
import { env } from "@/lib/env";
import { VaultAddresses } from "@/components/admin/vault-addresses";

export default async function ConfigAdminVaultsPage() {
  const omnibusVaultId = env.FIREBLOCKS_OMNIBUS_VAULT_ID;
  const assetId = env.FIREBLOCKS_DEFAULT_ASSET_ID ?? "";

  if (!omnibusVaultId) {
    return (
      <Card title="Omnibus Vault">
        <p className="text-sm text-(--widget-error) text-center py-8">
          FIREBLOCKS_OMNIBUS_VAULT_ID is not configured
        </p>
      </Card>
    );
  }

  let vault;
  let addresses;
  let error: string | null = null;

  try {
    const client = getFireblocksClient();
    const [v, addrs] = await Promise.all([
      client.getVaultAccount(omnibusVaultId),
      client.getDepositAddresses(omnibusVaultId, assetId).catch(() => []),
    ]);
    vault = v;
    addresses = addrs;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load vault";
  }

  if (error || !vault) {
    return (
      <Card title="Omnibus Vault">
        <p className="text-sm text-(--widget-error) text-center py-8">
          {error ?? "Vault not found"}
        </p>
      </Card>
    );
  }

  return (
    <Card title={vault.name} description={`Vault ID: ${vault.id}`}>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Assets</h3>
          {vault.assets.length === 0 ? (
            <p className="text-xs text-(--widget-muted)">
              No assets configured
            </p>
          ) : (
            <div className="space-y-1">
              {vault.assets.map((a) => (
                <div
                  key={a.id}
                  className="flex justify-between p-2 rounded bg-(--widget-row-bg) text-sm"
                >
                  <span className="font-mono">{a.id}</span>
                  <div className="text-right text-xs">
                    <span>Total: {a.total}</span>
                    <span className="ml-3">Available: {a.available}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <VaultAddresses
          vaultId={vault.id}
          defaultAssetId={assetId}
          initialAddresses={addresses ?? []}
        />
      </div>
    </Card>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-(--widget-radius-lg) border border-(--widget-border) p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-(--widget-muted) mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
