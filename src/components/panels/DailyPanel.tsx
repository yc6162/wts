"use client";

import { useEffect, useState } from "react";
import { fetchDailyPrices } from "@/lib/tradingApi";
import { realtimeClient } from "@/lib/realtime";
import { formatNumber, formatRate, getChangeClass } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useMarketStore } from "@/store/market-store";
import type { DailyPrice, QuoteSnapshot } from "@/types/trading";

// 일자별 탭은 TR 데이터 중심이며 탭 이동 시 별도 실시간 구독은 하지 않는다.
export function DailyPanel() {
  const { user } = useAuthStore();
  const { activeCode } = useMarketStore();
  const [rows, setRows] = useState<DailyPrice[]>([]);

  useEffect(() => {
    let mounted = true;
    const key = `daily-${activeCode}`;

    fetchDailyPrices(activeCode, user?.id ?? "").then((result) => {
      if (mounted) setRows(result.data ?? []);
    });

    realtimeClient.subscribe(key, activeCode, (message) => {
      if (message.type !== "quote" || message.code !== activeCode) return;
      const quote = message.payload as Partial<QuoteSnapshot>;
      setRows((prev) => updateLatestDailyRow(prev, quote));
    });

    return () => {
      mounted = false;
      realtimeClient.unsubscribe(key);
    };
  }, [activeCode, user?.id]);

  if (!rows.length) return <div className="empty-state">수신된 일자별 데이터가 없습니다.</div>;

  return (
    <div className="table-panel">
      <table>
        <thead>
          <tr>
            <th>일자</th>
            <th>종가</th>
            <th>등락</th>
            <th>거래량</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date}>
              <td>{row.date}</td>
              <td>{formatNumber(row.close)}</td>
              <td className={getChangeClass(row.change)}>
                {formatNumber(row.change)} {formatRate(row.changeRate)}
              </td>
              <td>{formatNumber(row.volume)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 현재가 실시간을 일자별 목록의 최신 행에 반영한다.
function updateLatestDailyRow(rows: DailyPrice[], quote: Partial<QuoteSnapshot>) {
  if (!rows.length || !quote.price) return rows;

  const next = [...rows];
  const first = next[0];
  const change = quote.change ?? first.change;
  const changeRate = quote.changeRate ?? first.changeRate;

  next[0] = {
    ...first,
    close: quote.price,
    change,
    changeRate,
    volume: quote.volume ?? first.volume
  };

  return next;
}
