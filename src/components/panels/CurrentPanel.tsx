"use client";

import { useEffect, useState } from "react";
import { fetchQuote } from "@/lib/tradingApi";
import { realtimeClient } from "@/lib/realtime";
import { formatNumber, formatRate, getChangeClass } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useMarketStore } from "@/store/market-store";
import { StatTile } from "@/components/StatTile";
import type { QuoteSnapshot } from "@/types/trading";

// 현재가 탭은 TR 조회 후 quote 실시간을 덮어쓴다.
export function CurrentPanel() {
  const { user } = useAuthStore();
  const { activeCode } = useMarketStore();
  const [quote, setQuote] = useState<QuoteSnapshot | null>(null);
  const [trStatus, setTrStatus] = useState("TR 조회 대기");

  useEffect(() => {
    let mounted = true;
    const key = `current-${activeCode}`;

    fetchQuote(activeCode, user?.id ?? "").then((result) => {
      if (!mounted) return;
      setQuote(result.data);
      setTrStatus(result.ok ? "TR 조회 완료" : "TR 실패, 실시간 대기");
    });

    realtimeClient.subscribe(key, activeCode, (message) => {
      if (message.type !== "quote" || message.code !== activeCode) return;
      setQuote((prev) => ({ ...(prev as QuoteSnapshot), ...(message.payload as Partial<QuoteSnapshot>) }));
    });

    return () => {
      mounted = false;
      realtimeClient.unsubscribe(key);
    };
  }, [activeCode, user?.id]);

  if (!quote) return <div className="empty-state">현재가를 불러오는 중입니다.</div>;

  return (
    <div className="current-panel">
      <div className="price-card">
        <span className="status-pill">{trStatus}</span>
        <p>{quote.tradeTime}</p>
        <strong className={getChangeClass(quote.change)}>{formatNumber(quote.price)}</strong>
        <em className={getChangeClass(quote.change)}>
          {formatNumber(quote.change)} ({formatRate(quote.changeRate)})
        </em>
      </div>

      <div className="stat-grid">
        <StatTile label="시가" value={formatNumber(quote.open)} changeValue={quote.open - quote.price} />
        <StatTile label="고가" value={formatNumber(quote.high)} changeValue={quote.high - quote.open} />
        <StatTile label="저가" value={formatNumber(quote.low)} changeValue={quote.low - quote.open} />
        <StatTile label="거래량" value={formatNumber(quote.volume)} />
      </div>
    </div>
  );
}
