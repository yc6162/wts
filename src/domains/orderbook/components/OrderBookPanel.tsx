"use client";

import { useEffect, useState } from "react";
import { realtimeClient } from "@/lib/realtime";
import { useOrderBookQuery } from "@/hooks/useWtsQueries";
import { formatNumber, getChangeClass } from "@/lib/format";
import { useMarketStore } from "@/store/market-store";
import type { OrderBook } from "@/types/trading";

// 호가 탭은 TR 호가 스냅샷 위에 orderbook 실시간 패킷을 덮어쓴다.
export function OrderBookPanel() {
  const { activeCode } = useMarketStore();
  const orderBookQuery = useOrderBookQuery(activeCode);
  const [book, setBook] = useState<OrderBook | null>(null);

  useEffect(() => {
    setBook(orderBookQuery.data?.data ?? null);
  }, [activeCode, orderBookQuery.data]);

  useEffect(() => {
    const key = `orderbook-${activeCode}`;

    realtimeClient.subscribe(key, activeCode, (message) => {
      if (message.type !== "orderbook" || message.code !== activeCode) return;

      // 매도/매수 중 한쪽만 수신될 수 있어서 이전 값을 fallback으로 남긴다.
      setBook((prev) => ({
        asks: (message.payload as Partial<OrderBook>).asks ?? prev?.asks ?? [],
        bids: (message.payload as Partial<OrderBook>).bids ?? prev?.bids ?? []
      }));
    });

    return () => {
      realtimeClient.unsubscribe(key);
    };
  }, [activeCode]);

  if (!book) return <div className="empty-state">수신된 호가 데이터가 없습니다.</div>;

  return (
    <div className="orderbook-panel">
      <div className="orderbook-head">
        <span>매도수량</span>
        <span>가격</span>
        <span>매수수량</span>
      </div>
      {book.asks.map((ask) => (
        <div className="order-row ask" key={`ask-${ask.price}`}>
          <span>{formatNumber(ask.quantity)}</span>
          <strong className={getChangeClass(ask.changeSign ?? 0)}>{formatNumber(ask.price)}</strong>
          <span />
        </div>
      ))}
      {book.bids.map((bid) => (
        <div className="order-row bid" key={`bid-${bid.price}`}>
          <span />
          <strong className={getChangeClass(bid.changeSign ?? 0)}>{formatNumber(bid.price)}</strong>
          <span>{formatNumber(bid.quantity)}</span>
        </div>
      ))}
    </div>
  );
}
