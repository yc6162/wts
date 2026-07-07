"use client";

import { useEffect, useState } from "react";
import { fetchDailyPrices } from "@/lib/tradingApi";
import { formatNumber, formatRate, getChangeClass } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useMarketStore } from "@/store/market-store";
import type { DailyPrice } from "@/types/trading";

// 일자별 탭은 TR 데이터 중심이며 탭 이동 시 별도 실시간 구독은 하지 않는다.
export function DailyPanel() {
  const { user } = useAuthStore();
  const { activeCode } = useMarketStore();
  const [rows, setRows] = useState<DailyPrice[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchDailyPrices(activeCode, user?.id ?? "").then((result) => {
      if (mounted) setRows(result.data);
    });
    return () => {
      mounted = false;
    };
  }, [activeCode, user?.id]);

  if (!rows.length) return <div className="empty-state">일자별 데이터를 불러오는 중입니다.</div>;

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
