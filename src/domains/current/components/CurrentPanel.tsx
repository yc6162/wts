"use client";

import { useEffect, useState } from "react";
import { realtimeClient } from "@/lib/realtime";
import { useQuoteQuery } from "@/hooks/useWtsQueries";
import { formatNumber, formatRate, getChangeClass } from "@/lib/format";
import { useMarketStore } from "@/store/market-store";
import { StatTile } from "@/components/StatTile";
import type { QuoteSnapshot } from "@/types/trading";

// 현재가 탭은 TR 스냅샷 위에 quote 실시간 값을 덮어쓴다.
export function CurrentPanel() {
  const { activeCode } = useMarketStore();
  const quoteQuery = useQuoteQuery(activeCode);
  const [quote, setQuote] = useState<Partial<QuoteSnapshot> | null>(null);

  useEffect(() => {
    setQuote(quoteQuery.data?.data ?? null);
  }, [activeCode, quoteQuery.data]);

  useEffect(() => {
    const key = `current-${activeCode}`;

    realtimeClient.subscribe(key, activeCode, (message) => {
      if (message.type !== "quote" || message.code !== activeCode) return;
      setQuote((prev) => ({ ...(prev ?? {}), ...(message.payload as Partial<QuoteSnapshot>) }));
    });

    return () => {
      realtimeClient.unsubscribe(key);
    };
  }, [activeCode]);

  if (!quote?.price) return <div className="empty-state">수신된 현재가 데이터가 없습니다.</div>;

  const change = quote.change ?? 0;
  const changeRate = quote.changeRate ?? 0;

  return (
    <div className="current-panel">
      <div className="price-card">
        <span className="status-pill">{quoteQuery.data?.ok ? "TR 조회 완료" : "실시간 대기"}</span>
        <p>{quote.tradeTime ?? "-"}</p>
        <strong className={getChangeClass(change)}>{formatNumber(quote.price)}</strong>
        <em className={getChangeClass(change)}>
          {formatNumber(change)} ({formatRate(changeRate)})
        </em>
      </div>

      <div className="stat-grid">
        {quote.open !== undefined && <StatTile label="시가" value={formatNumber(quote.open)} changeValue={quote.open - quote.price} />}
        {quote.high !== undefined && <StatTile label="고가" value={formatNumber(quote.high)} changeValue={quote.high - (quote.open ?? quote.high)} />}
        {quote.low !== undefined && <StatTile label="저가" value={formatNumber(quote.low)} changeValue={quote.low - (quote.open ?? quote.low)} />}
        {quote.volume !== undefined && <StatTile label="거래량" value={formatNumber(quote.volume)} />}
      </div>
    </div>
  );
}
