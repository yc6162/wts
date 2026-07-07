"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadMasterCodes } from "@/lib/tradingApi";
import type { MarketSymbol, WtsTab } from "@/types/trading";

type MarketStore = {
  activeTab: WtsTab;
  activeCode: string;
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

  useEffect(() => {
    loadMasterCodes().then(setSymbols);
  }, []);

  const value = useMemo(
    () => ({ activeTab, activeCode, symbols, setActiveTab, setActiveCode }),
    [activeTab, activeCode, symbols]
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

// 컴포넌트에서 시장 스토어를 꺼내 쓰는 훅이다.
export function useMarketStore() {
  const store = useContext(MarketContext);
  if (!store) throw new Error("useMarketStore must be used inside MarketProvider");
  return store;
}
