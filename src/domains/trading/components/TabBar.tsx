"use client";

import type { WtsTab } from "@/types/trading";
import { useMarketStore } from "@/store/market-store";

const tabs: Array<{ key: WtsTab; label: string }> = [
  { key: "current", label: "현재가" },
  { key: "chart", label: "차트" },
  { key: "daily", label: "일자별" },
  { key: "orderbook", label: "호가" }
];

// 탭 변경 시 기존 탭 컴포넌트가 unmount되며 실시간 구독 cleanup이 실행된다.
export function TabBar() {
  const { activeTab, setActiveTab } = useMarketStore();

  return (
    <nav className="tab-bar" aria-label="WTS 탭">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={activeTab === tab.key ? "active" : ""}
          onClick={() => setActiveTab(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
