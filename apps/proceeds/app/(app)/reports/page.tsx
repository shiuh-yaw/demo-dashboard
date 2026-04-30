import { Suspense } from "react";
import { ReportsScreen } from "@/components/screens/reports";

export const metadata = {
  title: "Payments and Financial Reports — Proceeds",
};

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsScreen />
    </Suspense>
  );
}
