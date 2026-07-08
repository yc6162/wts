"use client";

import { useEffect } from "react";
import { AuthProvider, useAuthStore } from "@/store/auth-store";
import { MarketProvider, useMarketStore } from "@/store/market-store";
import { realtimeClient } from "@/lib/realtime";
import { QueryProvider } from "@/components/QueryProvider";
import { ChartPanel } from "@/domains/chart/components/ChartPanel";
import { CurrentPanel } from "@/domains/current/components/CurrentPanel";
import { DailyPanel } from "@/domains/daily/components/DailyPanel";
import { OrderBookPanel } from "@/domains/orderbook/components/OrderBookPanel";
import { SymbolSearch } from "@/domains/market/components/SymbolSearch";
import { TabBar } from "@/domains/trading/components/TabBar";

// 앱에 필요한 공통 Provider를 한 곳에서 조립한다.
// Provider 순서가 중요하다. RealtimeShell은 로그인 정보와 시장 상태를 모두 사용한다.
export function MobileWtsApp() {
  return (
    <QueryProvider>
      <AuthProvider>
        <MarketProvider>
          <RealtimeShell />
        </MarketProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

// 실시간 연결은 탭 화면보다 상위에서 한 번만 열고, 탭별 구독만 하위에서 관리한다.
// 사용자가 로그인 ID를 바꾸면 기존 연결을 닫고 새 ID로 다시 연결한다.
function RealtimeShell() {
  const { user } = useAuthStore();
  const { activeTab } = useMarketStore();

  useEffect(() => {
    realtimeClient.connect(user?.id ?? "");
    return () => realtimeClient.disconnect();
  }, [user?.id]);

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
