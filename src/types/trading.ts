export type WtsTab = "current" | "chart" | "daily" | "orderbook";

export type MarketSymbol = {
  code: string;
  name: string;
  market: string;
};

export type LoginUser = {
  id: string;
  name: string;
  accountNo: string;
  token: string;
};

export type QuoteSnapshot = {
  code: string;
  name: string;
  price: number;
  priceSign?: number;
  change: number;
  changeRate: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  tradeTime: string;
};

export type ChartPoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type DailyPrice = {
  date: string;
  close: number;
  closeSign?: number;
  change: number;
  changeRate: number;
  volume: number;
};

export type OrderBookLevel = {
  price: number;
  quantity: number;
  changeSign?: number;
};

export type OrderBook = {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
};

export type RealtimeMessage = {
  type: "quote" | "orderbook" | "chart";
  code: string;
  payload: Partial<QuoteSnapshot> | Partial<OrderBook> | ChartPoint;
};

export type TrResult<T> = {
  ok: boolean;
  data: T | null;
  error?: string;
};
