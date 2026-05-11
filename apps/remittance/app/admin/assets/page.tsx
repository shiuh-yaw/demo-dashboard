import { getSupportedAssets } from "@dynamic-demos/fireblocks";
import { AssetsList } from "@/components/admin/assets-list";

export default async function AdminAssetsPage() {
  let assets: Array<{ id: string; name?: string }> = [];
  let error: string | null = null;

  try {
    assets = await getSupportedAssets();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load assets";
  }

  const relevant = assets.filter(
    (a) =>
      /usdc|base|usd|stable/i.test(a.id) ||
      /usdc|base|usd|stable/i.test(a.name ?? ""),
  );
  const displayAssets = relevant.length > 0 ? relevant : assets.slice(0, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-(--brand-fg)">
          Fireblocks Supported Assets
        </h1>
        <p className="text-sm text-(--brand-muted) mt-1">
          Use the asset{" "}
          <code className="rounded bg-(--brand-row-bg) px-1">id</code> for{" "}
          <code className="rounded bg-(--brand-row-bg) px-1">
            FIREBLOCKS_DEFAULT_ASSET_ID
          </code>{" "}
          in .env
        </p>
      </div>
      <AssetsList assets={displayAssets} total={assets.length} error={error} />
    </div>
  );
}
