"use client";

import { useEffect, useState } from "react";
import { fetchOrderBook } from "@/lib/tradingApi";
import { realtimeClient } from "@/lib/realtime";
import { formatNumber } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useMarketStore } from "@/store/market-store";
import type { OrderBook } from "@/types/trading";

// 호가 탭은 TR 조회 후 orderbook 실시간 패킷으로 잔량을 갱신한다.
export function OrderBookPanel() {
  const { user } = useAuthStore();
  const { activeCode } = useMarketStore();
  const [book, setBook] = useState<OrderBook | null>(null);

  useEffect(() => {
    let mounted = true;
    const key = `orderbook-${activeCode}`;

    fetchOrderBook(activeCode, user?.id ?? "").then((result) => {
      if (mounted) setBook(result.data);
    });

    realtimeClient.subscribe(key, activeCode, (message) => {
      if (message.type !== "orderbook" || message.code !== activeCode) return;
      setBook((prev) => ({
        asks: (message.payload as Partial<OrderBook>).asks ?? prev?.asks ?? [],
        bids: (message.payload as Partial<OrderBook>).bids ?? prev?.bids ?? []
      }));
    });

    return () => {
      mounted = false;
      realtimeClient.unsubscribe(key);
    };
  }, [activeCode, user?.id]);

  if (!book) return <div className="empty-state">수신된 호가 데이터가 없습니다.</div>;

  return (
    <div className="orderbook-panel">
      <div className="orderbook-head">
        <span>매도잔량</span>
        <span>가격</span>
        <span>매수잔량</span>
      </div>
      {book.asks.map((ask) => (
        <div className="order-row ask" key={`ask-${ask.price}`}>
          <span>{formatNumber(ask.quantity)}</span>
          <strong>{formatNumber(ask.price)}</strong>
          <span />
        </div>
      ))}
      {book.bids.map((bid) => (
        <div className="order-row bid" key={`bid-${bid.price}`}>
          <span />
          <strong>{formatNumber(bid.price)}</strong>
          <span>{formatNumber(bid.quantity)}</span>
        </div>
      ))}
    </div>
  );
}
