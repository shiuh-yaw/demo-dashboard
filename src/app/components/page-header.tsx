import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

/**
 * Consistent page header for dashboard pages.
 * Title on the left, optional actions on the right.
 */
export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
