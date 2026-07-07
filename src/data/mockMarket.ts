import type { ChartPoint, DailyPrice, MarketSymbol, OrderBook, QuoteSnapshot } from "@/types/trading";

export const masterSymbols: MarketSymbol[] = [
  { code: "005930", name: "삼성전자", market: "KOSPI" },
  { code: "000660", name: "SK하이닉스", market: "KOSPI" },
  { code: "035420", name: "NAVER", market: "KOSPI" },
  { code: "035720", name: "카카오", market: "KOSPI" },
  { code: "068270", name: "셀트리온", market: "KOSPI" }
];

export const initialQuote: QuoteSnapshot = {
  code: "005930",
  name: "삼성전자",
  price: 84300,
  change: 700,
  changeRate: 0.84,
  open: 83500,
  high: 85100,
  low: 83200,
  volume: 8421931,
  tradeTime: "09:42:18"
};

// 종목 코드에 맞는 기본 현재가를 만든다.
export function createMockQuote(code: string): QuoteSnapshot {
  const symbol = masterSymbols.find((item) => item.code === code) ?? masterSymbols[0];
  const seed = Number(code.slice(-3)) || 300;
  const price = 50000 + seed * 70;

  return {
    code,
    name: symbol.name,
    price,
    change: seed % 2 === 0 ? 600 : -450,
    changeRate: seed % 2 === 0 ? 1.12 : -0.73,
    open: price - 300,
    high: price + 900,
    low: price - 1200,
    volume: 1200000 + seed * 1820,
    tradeTime: "09:40:00"
  };
}

// 차트가 비어 보이지 않도록 30개 봉 데이터를 생성한다.
export function createMockChart(code: string): ChartPoint[] {
  const base = createMockQuote(code).price;

  return Array.from({ length: 30 }, (_, index) => {
    const move = Math.sin(index / 2) * 900 + index * 45;
    const open = Math.round(base + move - 180);
    const close = Math.round(base + move + (index % 2 === 0 ? 260 : -220));

    return {
      time: `07/${String(index + 1).padStart(2, "0")}`,
      open,
      high: Math.max(open, close) + 420,
      low: Math.min(open, close) - 360,
      close,
      volume: 820000 + index * 39000
    };
  });
}

// 일자별 탭에서 사용할 최근 시세 목록을 만든다.
export function createMockDaily(code: string): DailyPrice[] {
  return createMockChart(code)
    .slice(-12)
    .reverse()
    .map((point, index) => ({
      date: `2026.07.${String(7 - index).padStart(2, "0")}`,
      close: point.close,
      change: point.close - point.open,
      changeRate: Number((((point.close - point.open) / point.open) * 100).toFixed(2)),
      volume: point.volume
    }));
}

// 호가 탭에서 사용할 5단계 매도/매수 잔량을 만든다.
export function createMockOrderBook(code: string): OrderBook {
  const price = createMockQuote(code).price;

  return {
    asks: Array.from({ length: 5 }, (_, index) => ({
      price: price + (5 - index) * 100,
      quantity: 14000 + index * 3200
    })),
    bids: Array.from({ length: 5 }, (_, index) => ({
      price: price - (index + 1) * 100,
      quantity: 18000 + index * 2700
    }))
  };
}
