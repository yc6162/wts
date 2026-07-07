"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useMemo, useState } from "react";
import { useMasterCodeQuery } from "@/hooks/useWtsQueries";
import type { MarketSymbol, WtsTab } from "@/types/trading";

type MarketStore = {
  activeTab: WtsTab;
  activeCode: string;
  selectedSymbol: MarketSymbol | null;
  symbols: MarketSymbol[];
  setActiveTab: (tab: WtsTab) => void;
  setActiveCode: (code: string) => void;
};

const DEFAULT_CODE = "005930";
const validTabs: WtsTab[] = ["current", "chart", "daily", "orderbook"];
const MarketContext = createContext<MarketStore | null>(null);

// URL로 들어온 code/symbol 값을 화면 전체 기준 종목으로 사용한다.
export function MarketProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") ?? searchParams.get("symbol") ?? DEFAULT_CODE;
  const initialTab = toWtsTab(searchParams.get("tab"));
  const [activeTab, changeActiveTab] = useState<WtsTab>(initialTab);
  const [activeCode, changeActiveCode] = useState(initialCode);
  const { data: symbols = [] } = useMasterCodeQuery();
  const selectedSymbol = symbols.find((item) => item.code === activeCode) ?? null;

  // 내부 상태 변경을 URL에도 반영해 외부 공유와 새로고침 흐름을 맞춘다.
  function replaceRoute(nextCode: string, nextTab: WtsTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("code", nextCode);
    params.set("tab", nextTab);
    params.delete("symbol");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const value = useMemo(
    () => ({
      activeTab,
      activeCode,
      selectedSymbol,
      symbols,
      setActiveTab: (tab: WtsTab) => {
        console.log("[WTS][TAB] change", { from: activeTab, to: tab, code: activeCode });
        changeActiveTab(tab);
        replaceRoute(activeCode, tab);
      },
      setActiveCode: (code: string) => {
        const nextCode = code.trim();
        if (!nextCode) return;
        console.log("[WTS][SYMBOL] change", { from: activeCode, to: nextCode, tab: activeTab });
        changeActiveCode(nextCode);
        replaceRoute(nextCode, activeTab);
      }
    }),
    [activeTab, activeCode, selectedSymbol, symbols, searchParams, pathname, router]
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

// 컴포넌트에서 현재 시장 상태를 꺼내 쓰는 진입점이다.
export function useMarketStore() {
  const store = useContext(MarketContext);
  if (!store) throw new Error("useMarketStore must be used inside MarketProvider");
  return store;
}

// URL tab 값이 잘못 들어오면 현재가 탭으로 시작한다.
function toWtsTab(value: string | null): WtsTab {
  if (validTabs.includes(value as WtsTab)) return value as WtsTab;
  return "current";
}
