export function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-(--brand-page-bg)">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
