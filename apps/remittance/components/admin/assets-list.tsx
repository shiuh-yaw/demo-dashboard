interface Asset {
  id: string;
  name?: string;
}

interface AssetsListProps {
  assets: Asset[];
  total: number;
  error: string | null;
}

export function AssetsList({ assets, total, error }: AssetsListProps) {
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-(--brand-border) bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-(--brand-row-bg) border-b border-(--brand-border)">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-(--brand-fg)">
                Asset ID
              </th>
              <th className="px-4 py-3 text-left font-medium text-(--brand-fg)">
                Name
              </th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr
                key={a.id}
                className="border-b border-(--brand-border) last:border-0 hover:bg-(--brand-row-bg)"
              >
                <td className="px-4 py-3 font-mono text-(--brand-fg)">
                  {a.id}
                </td>
                <td className="px-4 py-3 text-(--brand-muted)">
                  {a.name ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > assets.length && (
        <p className="text-xs text-(--brand-muted)">
          Showing {assets.length} of {total} assets (filtered for USDC/Base/USD)
        </p>
      )}
    </div>
  );
}
