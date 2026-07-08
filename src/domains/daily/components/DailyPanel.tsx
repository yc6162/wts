"use client";

import { useEffect, useState } from "react";
import { realtimeClient } from "@/lib/realtime";
import { useDailyPricesQuery } from "@/hooks/useWtsQueries";
import { formatNumber, formatRate, getChangeClass } from "@/lib/format";
import { useMarketStore } from "@/store/market-store";
import type { DailyPrice, QuoteSnapshot } from "@/types/trading";

// 일자별 탭은 TR 일봉 목록을 기준으로 최신 행만 실시간 현재가로 보정한다.
export function DailyPanel() {
  const { activeCode } = useMarketStore();
  const dailyQuery = useDailyPricesQuery(activeCode);
  const [rows, setRows] = useState<DailyPrice[]>([]);

  useEffect(() => {
    setRows(dailyQuery.data?.data ?? []);
  }, [activeCode, dailyQuery.data]);

  useEffect(() => {
    const key = `daily-${activeCode}`;

    realtimeClient.subscribe(key, activeCode, (message) => {
      if (message.type !== "quote" || message.code !== activeCode) return;
      const quote = message.payload as Partial<QuoteSnapshot>;

      // 일자별 전체 목록을 흔들지 않고 첫 행만 갱신해서 표의 정렬과 행 개수를 유지한다.
      setRows((prev) => updateLatestDailyRow(prev, quote));
    });

    return () => {
      realtimeClient.unsubscribe(key);
    };
  }, [activeCode]);

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
