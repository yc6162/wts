import { Suspense } from "react";
import { MobileWtsApp } from "@/domains/trading/components/MobileWtsApp";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <MobileWtsApp />
    </Suspense>
  );
}
