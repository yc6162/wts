"use client";

import type { WtsTab } from "@/types/trading";
import { useMarketStore } from "@/store/market-store";

const tabs: Array<{ key: WtsTab; label: string }> = [
  { key: "current", label: "현재가" },
  { key: "chart", label: "차트" },
  { key: "daily", label: "일자별" },
  { key: "orderbook", label: "호가" }
];

// 탭 이동 시 각 화면 컴포넌트의 cleanup이 실시간 해지를 맡는다.
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
