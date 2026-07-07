import { createMockChart, createMockDaily, createMockOrderBook, createMockQuote, masterSymbols } from "@/data/mockMarket";
import { normalizeMasterCodes } from "@/lib/masterCode";
import type { ChartPoint, DailyPrice, LoginUser, MarketSymbol, OrderBook, QuoteSnapshot, TrResult } from "@/types/trading";

const API_BASE_URL = process.env.NEXT_PUBLIC_TR_API_URL ?? "";
const MASTER_CODE_URL = "/api/master-code";

// API 서버 응답이 없을 때도 화면을 살리기 위한 공통 TR 래퍼다.
async function requestTr<T>(path: string, param: Record<string, string>, fallback: T): Promise<TrResult<T>> {
  if (!API_BASE_URL) {
    return { ok: false, data: fallback, error: "TR API URL is empty" };
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(param),
      cache: "no-store"
    });

    if (!response.ok) {
      return { ok: false, data: fallback, error: `TR failed: ${response.status}` };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    return { ok: false, data: fallback, error: error instanceof Error ? error.message : "TR error" };
  }
}

// 로그인 기반 화면에서 공통으로 참조할 임시 사용자 세션을 만든다.
export async function loginByDemoId(id: string): Promise<LoginUser> {
  return {
    id,
    name: "홍길동",
    accountNo: "123-45-678901",
    token: `demo-token-${id}`
  };
}

// 외부 MasterCode 링크가 있으면 먼저 사용하고, 실패 시 기본 목록을 쓴다.
export async function loadMasterCodes(): Promise<MarketSymbol[]> {
  try {
    const response = await fetch(MASTER_CODE_URL, { cache: "no-store" });
    if (!response.ok) return masterSymbols;
    const data = normalizeMasterCodes(await response.json());
    return data.length > 0 ? data : masterSymbols;
  } catch {
    return masterSymbols;
  }
}

// 현재가 TR을 조회한다.
export function fetchQuote(code: string, userId: string) {
  return requestTr<QuoteSnapshot>("/quote/current", { code, userId }, createMockQuote(code));
}

// 차트 TR을 조회한다.
export function fetchChart(code: string, userId: string) {
  return requestTr<ChartPoint[]>("/quote/chart", { code, userId }, createMockChart(code));
}

// 일자별 TR을 조회한다.
export function fetchDailyPrices(code: string, userId: string) {
  return requestTr<DailyPrice[]>("/quote/daily", { code, userId }, createMockDaily(code));
}

// 호가 TR을 조회한다.
export function fetchOrderBook(code: string, userId: string) {
  return requestTr<OrderBook>("/quote/orderbook", { code, userId }, createMockOrderBook(code));
}
