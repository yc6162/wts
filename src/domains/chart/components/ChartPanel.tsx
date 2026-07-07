"use client";

import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, createChart, HistogramSeries, type IChartApi, type ISeriesApi, type Time } from "lightweight-charts";
import { realtimeClient } from "@/lib/realtime";
import { useChartQuery } from "@/hooks/useWtsQueries";
import { useMarketStore } from "@/store/market-store";
import type { ChartPoint, QuoteSnapshot } from "@/types/trading";

// 차트 탭은 TR 캔들 데이터를 그리고 quote 실시간으로 마지막 봉을 갱신한다.
export function ChartPanel() {
  const { activeCode } = useMarketStore();
  const chartQuery = useChartQuery(activeCode);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [points, setPoints] = useState<ChartPoint[]>([]);

  useEffect(() => {
    setPoints(chartQuery.data?.data ?? []);
  }, [activeCode, chartQuery.data]);

  useEffect(() => {
    const key = `chart-${activeCode}`;

    realtimeClient.subscribe(key, activeCode, (message) => {
      if (message.type !== "quote" || message.code !== activeCode) return;
      const quote = message.payload as Partial<QuoteSnapshot>;
      setPoints((prev) => updateLastPoint(prev, quote.price ?? 0));
    });

    return () => {
      realtimeClient.unsubscribe(key);
    };
  }, [activeCode]);

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      height: 330,
      layout: {
        background: { color: "#17212b" },
        textColor: "#8ea1ae"
      },
      grid: {
        vertLines: { color: "#22313d" },
        horzLines: { color: "#22313d" }
      },
      rightPriceScale: { borderColor: "#314251" },
      timeScale: { borderColor: "#314251", timeVisible: true }
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#f05a5a",
      downColor: "#4e9df7",
      borderUpColor: "#f05a5a",
      borderDownColor: "#4e9df7",
      wickUpColor: "#f05a5a",
      wickDownColor: "#4e9df7"
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: ""
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const observer = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    if (!points.length) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      return;
    }

    const sortedPoints = [...points].sort((a, b) => a.time - b.time);

    candleSeriesRef.current.setData(
      sortedPoints.map((point) => ({
        time: point.time as Time,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close
      }))
    );
    volumeSeriesRef.current.setData(
      sortedPoints.map((point) => ({
        time: point.time as Time,
        value: point.volume,
        color: point.close >= point.open ? "rgba(240,90,90,0.45)" : "rgba(78,157,247,0.45)"
      }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [points]);

  return (
    <div className="chart-panel">
      <div ref={containerRef} className="lw-chart" />
      {!points.length && <div className="chart-empty">수신된 차트 데이터가 없습니다.</div>}
    </div>
  );
}

// 실시간 현재가를 마지막 차트 봉에 반영한다.
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
