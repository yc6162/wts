"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchChart } from "@/lib/tradingApi";
import { realtimeClient } from "@/lib/realtime";
import { formatNumber } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useMarketStore } from "@/store/market-store";
import type { ChartPoint, QuoteSnapshot } from "@/types/trading";

// 차트 탭은 TR 봉 데이터를 먼저 그리고 quote 실시간으로 마지막 봉을 갱신한다.
export function ChartPanel() {
  const { user } = useAuthStore();
  const { activeCode } = useMarketStore();
  const [points, setPoints] = useState<ChartPoint[]>([]);

  useEffect(() => {
    let mounted = true;
    const key = `chart-${activeCode}`;

    fetchChart(activeCode, user?.id ?? "").then((result) => {
      if (mounted) setPoints(result.data ?? []);
    });

    realtimeClient.subscribe(key, activeCode, (message) => {
      if (message.type !== "quote" || message.code !== activeCode) return;
      const quote = message.payload as Partial<QuoteSnapshot>;
      setPoints((prev) => updateLastPoint(prev, quote.price ?? 0));
    });

    return () => {
      mounted = false;
      realtimeClient.unsubscribe(key);
    };
  }, [activeCode, user?.id]);

  const maxPrice = useMemo(() => Math.max(...points.map((item) => item.high), 1), [points]);
  const minPrice = useMemo(() => Math.min(...points.map((item) => item.low), 0), [points]);

  if (!points.length) return <div className="empty-state">수신된 차트 데이터가 없습니다.</div>;

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <span>1일</span>
        <strong>{formatNumber(points[points.length - 1].close)}</strong>
      </div>
      <div className="candle-chart">
        {points.map((point) => {
          const top = toPercent(point.high, minPrice, maxPrice);
          const bottom = toPercent(point.low, minPrice, maxPrice);
          const open = toPercent(point.open, minPrice, maxPrice);
          const close = toPercent(point.close, minPrice, maxPrice);
          const up = point.close >= point.open;

          return (
            <div className="candle-slot" key={point.time}>
              <span className="wick" style={{ top: `${top}%`, height: `${bottom - top}%` }} />
              <span
                className={`body ${up ? "up" : "down"}`}
                style={{ top: `${Math.min(open, close)}%`, height: `${Math.max(Math.abs(close - open), 2)}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 실시간 현재가를 마지막 봉 종가에 반영한다.
function updateLastPoint(points: ChartPoint[], price: number) {
  if (!points.length || !price) return points;
  const next = [...points];
  const last = next[next.length - 1];
  next[next.length - 1] = {
    ...last,
    close: price,
    high: Math.max(last.high, price),
    low: Math.min(last.low, price)
  };
  return next;
}

// 가격을 차트 영역의 세로 위치 퍼센트로 바꾼다.
function toPercent(value: number, min: number, max: number) {
  return ((max - value) / Math.max(max - min, 1)) * 100;
}
