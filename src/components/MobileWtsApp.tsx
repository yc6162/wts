"use client";

import { useEffect } from "react";
import { AuthProvider, useAuthStore } from "@/store/auth-store";
import { MarketProvider, useMarketStore } from "@/store/market-store";
import { realtimeClient } from "@/lib/realtime";
import { ChartPanel } from "@/components/panels/ChartPanel";
import { CurrentPanel } from "@/components/panels/CurrentPanel";
import { DailyPanel } from "@/components/panels/DailyPanel";
import { OrderBookPanel } from "@/components/panels/OrderBookPanel";
import { SymbolSearch } from "@/components/SymbolSearch";
import { TabBar } from "@/components/TabBar";

// Provider를 한 곳에 모아 화면 컴포넌트가 로직에만 집중하게 한다.
export function MobileWtsApp() {
  return (
    <AuthProvider>
      <MarketProvider>
        <RealtimeShell />
      </MarketProvider>
    </AuthProvider>
  );
}

// 공통 실시간 연결을 앱 시작 시 미리 열어두는 셸이다.
function RealtimeShell() {
  const { user } = useAuthStore();
  const { activeTab } = useMarketStore();

  useEffect(() => {
    realtimeClient.connect();
    return () => realtimeClient.disconnect();
  }, []);

  return (
    <main className="wts-shell">
      <section className="top-area">
        <div>
          <p className="account-label">로그인</p>
          <h1>{user?.name ?? "Guest"}</h1>
        </div>
        <div className="account-box">
          <span>계좌</span>
          <strong>{user?.accountNo ?? "-"}</strong>
        </div>
      </section>

      <SymbolSearch />
      <TabBar />

      <section className="panel-area">
        {activeTab === "current" && <CurrentPanel />}
        {activeTab === "chart" && <ChartPanel />}
        {activeTab === "daily" && <DailyPanel />}
        {activeTab === "orderbook" && <OrderBookPanel />}
      </section>
    </main>
  );
}
