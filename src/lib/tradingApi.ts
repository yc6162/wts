import { masterSymbols } from "@/data/mockMarket";
import { normalizeMasterCodes } from "@/lib/masterCode";
import type { ChartPoint, DailyPrice, LoginUser, MarketSymbol, OrderBook, QuoteSnapshot, TrResult } from "@/types/trading";

const MASTER_CODE_URL = "/api/master-code";

// API 서버 응답이 없어도 화면 흐름이 멈추지 않도록 공통 TR 래퍼를 둔다.
async function requestTr<T>(
  path: string,
  param: Record<string, string>,
  mapper: (data: Record<string, unknown>, code: string) => T | null
): Promise<TrResult<T>> {
  try {
    const response = await fetch("/api/tr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, param }),
      cache: "no-store"
    });

    if (!response.ok) {
      return { ok: false, data: null, error: `TR failed: ${response.status}` };
    }

    const data = (await response.json()) as Record<string, unknown>;
    if (data.result && data.result !== "success") {
      return { ok: false, data: null, error: String(data.message ?? "TR result failed") };
    }

    // TR마다 종목코드 파라미터명이 달라서 001301과 code를 둘 다 확인한다.
    return { ok: true, data: mapper(data, param["001301"] ?? param.code ?? "") };
  } catch (error) {
    return { ok: false, data: null, error: error instanceof Error ? error.message : "TR error" };
  }
}

// 로그인 기반 화면에서 공통으로 참조할 임시 사용자 세션을 만든다.
export async function loginByDemoId(id: string): Promise<LoginUser> {
  return {
    id,
    name: "데모사용자",
    accountNo: "123-45-678901",
    token: `demo-token-${id}`
  };
}

// 서버 라우트를 통해 미래에셋 MasterCode를 조회한다.
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
export function fetchQuote(code: string) {
  return requestTr<QuoteSnapshot>("/bp/b010.json", { "001301": code }, mapQuoteTr);
}

// 차트 TR을 조회한다.
export function fetchChart(code: string) {
  return requestTr<ChartPoint[]>(
    "/bp/c030.json",
    {
      gubn: "D",
      code,
      count: "100",
      date: todayText(),
      unit: "1",
      dataIndex: "1",
      gap: "1"
    },
    mapChartTr
  );
}

// 일자별 TR을 조회한다.
export function fetchDailyPrices(code: string) {
  return requestTr<DailyPrice[]>(
    "/bp/c020.json",
    {
      "001301": code,
      isGridHeader: "Y",
      rowCount: "15",
      iKey: "2",
      save: "",
      page: "1"
    },
    mapDailyTr
  );
}

// 호가 TR을 조회한다.
export function fetchOrderBook(code: string) {
  return requestTr<OrderBook>("/bp/b020.json", { "001301": code }, mapOrderBookTr);
}

// 현재가 TR 응답을 화면 모델로 변환한다.
function mapQuoteTr(data: Record<string, unknown>, code: string): QuoteSnapshot | null {
  const price = readSignedNumber(data, "002023");
  if (!price) return null;

  return {
    code,
    name: readText(data, "001022"),
    price: price.value,
    priceSign: price.sign,
    change: readDirectionalNumber(data, "002311") ?? 0,
    changeRate: readDirectionalNumber(data, "002033") ?? 0,
    open: readNumber(data, "002029") ?? 0,
    high: readNumber(data, "002030") ?? 0,
    low: readNumber(data, "002031") ?? 0,
    volume: readNumber(data, "002024") ?? 0,
    tradeTime: readText(data, "001300")
  };
}

// 일자별 TR 응답을 최근 일자 목록으로 변환한다.
function mapDailyTr(data: Record<string, unknown>): DailyPrice[] {
  const rows = Array.isArray(data.a012641) ? (data.a012641 as Record<string, unknown>[]) : [];

  return rows.map((row) => {
    const close = readSignedNumber(row, "012023");

    return {
      date: formatDate(readText(row, "012646")),
      close: close?.value ?? 0,
      closeSign: close?.sign ?? 0,
      change: readDirectionalNumber(row, "012023") ?? 0,
      changeRate: readDirectionalNumber(row, "012033") ?? 0,
      volume: readNumber(row, "012024") ?? 0
    };
  });
}

// 호가 TR 응답을 5단계 매도/매수 호가로 변환한다.
function mapOrderBookTr(data: Record<string, unknown>): OrderBook | null {
  const askPriceFids = ["004060", "004059", "004058", "004057", "004056"];
  const askQuantityFids = ["004050", "004049", "004048", "004047", "004046"];
  const bidPriceFids = ["004071", "004072", "004073", "004074", "004075"];
  const bidQuantityFids = ["004061", "004062", "004063", "004064", "004065"];

  const asks = askPriceFids.map((fid, index) => {
    const price = readSignedNumber(data, fid);
    return {
      price: price?.value ?? 0,
      quantity: readNumber(data, askQuantityFids[index]) ?? 0,
      changeSign: price?.sign ?? 0
    };
  }).filter((item) => item.price > 0 || item.quantity > 0);

  const bids = bidPriceFids.map((fid, index) => {
    const price = readSignedNumber(data, fid);
    return {
      price: price?.value ?? 0,
      quantity: readNumber(data, bidQuantityFids[index]) ?? 0,
      changeSign: price?.sign ?? 0
    };
  }).filter((item) => item.price > 0 || item.quantity > 0);

  if (!asks.length && !bids.length) return null;
  return { asks, bids };
}

// 차트 TR 응답을 캔들 차트 데이터로 변환한다.
function mapChartTr(data: Record<string, unknown>): ChartPoint[] {
  const rows = Array.isArray(data.a4500) ? (data.a4500 as Record<string, unknown>[]) : [];

  return rows.map((row) => ({
    time: toChartTime(readText(row, "4646"), readText(row, "4034")),
    open: readNumber(row, "4029") ?? 0,
    high: readNumber(row, "4030") ?? 0,
    low: readNumber(row, "4031") ?? 0,
    close: readNumber(row, "4023") ?? 0,
    volume: readNumber(row, "4032") ?? 0
  })).filter((item) => item.time && item.close > 0);
}

// 숫자 앞의 +/-는 표시값이 아니라 등락 방향으로 분리한다.
function readSignedNumber(data: Record<string, unknown>, key: string) {
  const raw = readText(data, key);
  if (!raw) return null;

  const sign = raw.startsWith("+") ? 1 : raw.startsWith("-") ? -1 : 0;
  const value = Number(raw.replace(/[,+-]/g, ""));

  if (!Number.isFinite(value)) return null;
  return { value, sign };
}

// 등락/등락률처럼 색상 판단이 필요한 값은 방향성을 숫자 부호로 유지한다.
function readDirectionalNumber(data: Record<string, unknown>, key: string) {
  const parsed = readSignedNumber(data, key);
  if (!parsed) return null;
  return parsed.sign < 0 ? -parsed.value : parsed.value;
}

// 문자와 숫자 부호를 제거하고 숫자로 변환한다.
function readNumber(data: Record<string, unknown>, key: string) {
  return readSignedNumber(data, key)?.value ?? null;
}

// TR 값의 앞뒤 공백을 제거한다.
function readText(data: Record<string, unknown>, key: string) {
  return String(data[key] ?? "").trim();
}

// 오늘 날짜를 yyyyMMdd로 만든다.
function todayText() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

// yyyyMMdd를 yyyy.MM.dd 형식으로 바꾼다.
function formatDate(value: string) {
  if (value.length !== 8) return value;
  return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)}`;
}

// 차트 라이브러리가 요구하는 초 단위 timestamp를 만든다.
function toChartTime(date: string, time: string) {
  const cleanDate = date.replace(/\s/g, "");
  const cleanTime = time.padStart(6, "0");

  if (cleanDate.length !== 8) return 0;
  return Math.floor(
    new Date(
      Number(cleanDate.slice(0, 4)),
      Number(cleanDate.slice(4, 6)) - 1,
      Number(cleanDate.slice(6, 8)),
      Number(cleanTime.slice(0, 2)),
      Number(cleanTime.slice(2, 4)),
      Number(cleanTime.slice(4, 6))
    ).getTime() / 1000
  );
}
