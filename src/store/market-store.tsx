"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadMasterCodes } from "@/lib/tradingApi";
import type { MarketSymbol, WtsTab } from "@/types/trading";

type MarketStore = {
  activeTab: WtsTab;
  activeCode: string;
  selectedSymbol: MarketSymbol | null;
  symbols: MarketSymbol[];
  setActiveTab: (tab: WtsTab) => void;
  setActiveCode: (code: string) => void;
};

const MarketContext = createContext<MarketStore | null>(null);

// 종목, 탭, MasterCode를 화면 전체에서 공유한다.
export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<WtsTab>("current");
  const [activeCode, setActiveCode] = useState("005930");
  const [symbols, setSymbols] = useState<MarketSymbol[]>([]);
  const selectedSymbol = symbols.find((item) => item.code === activeCode) ?? null;

  useEffect(() => {
    loadMasterCodes().then(setSymbols);
  }, []);

  const value = useMemo(
    () => ({
      activeTab,
      activeCode,
      selectedSymbol,
      symbols,
      setActiveTab: (tab: WtsTab) => {
        console.log("[WTS][TAB] change", { from: activeTab, to: tab, code: activeCode });
        setActiveTab(tab);
      },
      setActiveCode: (code: string) => {
        console.log("[WTS][SYMBOL] change", { from: activeCode, to: code, tab: activeTab });
        setActiveCode(code);
      }
    }),
    [activeTab, activeCode, selectedSymbol, symbols]
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

// 컴포넌트에서 시장 스토어를 꺼내 쓰는 훅이다.
export function useMarketStore() {
  const store = useContext(MarketContext);
  if (!store) throw new Error("useMarketStore must be used inside MarketProvider");
  return store;
}
