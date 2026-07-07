import type { OrderBook, QuoteSnapshot, RealtimeMessage } from "@/types/trading";

type FieldBag = Record<string, unknown>;

const QUOTE_FIDS = {
  price: "023",
  change: "311",
  volume: "024",
  changeRate: "033",
  open: "027",
  high: "028",
  low: "314"
} as const;

const ASK_PRICE_FIDS = ["060", "059", "058", "057", "056"];
const ASK_QUANTITY_FIDS = ["050", "049", "048", "047", "046"];
const BID_PRICE_FIDS = ["071", "072", "073", "074", "075"];
const BID_QUANTITY_FIDS = ["061", "062", "063", "064", "065"];

// TR 6자리 FID와 RTS 3자리 FID를 같은 키로 읽기 위한 공통 변환이다.
export function toRtsFid(fid: string) {
  return fid.slice(-3);
}

// socket.io push 원본 패킷에서 종목코드를 꺼낸다.
export function readRtsCode(raw: FieldBag) {
  const value = raw.value;
  const nested = value && typeof value === "object" && !Array.isArray(value) ? (value as FieldBag) : {};
  const code = String(raw.code ?? nested.code ?? raw["001301"] ?? nested["001301"] ?? raw["301"] ?? nested["301"] ?? "");

  if (["A", "J", "Q"].includes(code[0]) && code.length < 8) {
    return code.slice(1);
  }

  return code;
}

// RTS 원본 push 패킷을 화면에서 쓰는 공통 메시지로 변환한다.
export function normalizeRtsPacket(raw: FieldBag): RealtimeMessage[] {
  const code = readRtsCode(raw);
  const fields = readFieldBag(raw);
  const messages: RealtimeMessage[] = [];
  const quote = mapQuote(fields, code);
  const orderbook = mapOrderBook(fields);

  if (Object.keys(quote).length > 2) {
    messages.push({ type: "quote", code, payload: quote });
  }

  if (orderbook) {
    messages.push({ type: "orderbook", code, payload: orderbook });
  }

  return messages;
}

// data.value 안에 들어오는 패킷과 루트에 바로 들어오는 패킷을 모두 처리한다.
function readFieldBag(raw: FieldBag): FieldBag {
  const value = raw.value;

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...raw, ...(value as FieldBag) };
  }

  return raw;
}

// 현재가 관련 FID를 QuoteSnapshot 부분 데이터로 변환한다.
function mapQuote(fields: FieldBag, code: string): Partial<QuoteSnapshot> {
  const price = readSignedNumber(fields, QUOTE_FIDS.price);
  const change = readDirectionalNumber(fields, QUOTE_FIDS.change);
  const volume = readNumber(fields, QUOTE_FIDS.volume);
  const changeRate = readDirectionalNumber(fields, QUOTE_FIDS.changeRate);
  const open = readNumber(fields, QUOTE_FIDS.open);
  const high = readNumber(fields, QUOTE_FIDS.high);
  const low = readNumber(fields, QUOTE_FIDS.low);
  const tradeTime = readString(fields, "022") || new Date().toLocaleTimeString("ko-KR", { hour12: false });

  return {
    code,
    ...(price !== null ? { price: price.value } : {}),
    ...(change !== null ? { change } : price?.sign ? { change: price.sign } : {}),
    ...(volume !== null ? { volume } : {}),
    ...(changeRate !== null ? { changeRate } : {}),
    ...(open !== null ? { open } : {}),
    ...(high !== null ? { high } : {}),
    ...(low !== null ? { low } : {}),
    tradeTime
  };
}

// 호가 관련 FID가 충분히 있을 때 OrderBook으로 변환한다.
function mapOrderBook(fields: FieldBag): OrderBook | null {
  const asks = ASK_PRICE_FIDS.map((priceFid, index) => {
    const price = readSignedNumber(fields, priceFid);

    return {
      price: price?.value ?? 0,
      quantity: readNumber(fields, ASK_QUANTITY_FIDS[index]) ?? 0,
      changeSign: price?.sign ?? 0
    };
  }).filter((item) => item.price > 0 || item.quantity > 0);

  const bids = BID_PRICE_FIDS.map((priceFid, index) => {
    const price = readSignedNumber(fields, priceFid);

    return {
      price: price?.value ?? 0,
      quantity: readNumber(fields, BID_QUANTITY_FIDS[index]) ?? 0,
      changeSign: price?.sign ?? 0
    };
  }).filter((item) => item.price > 0 || item.quantity > 0);

  if (asks.length === 0 && bids.length === 0) return null;
  return { asks, bids };
}

// 3자리 RTS FID와 6자리 TR FID를 모두 검색해서 숫자로 바꾼다.
function readNumber(fields: FieldBag, fid: string) {
  return readSignedNumber(fields, fid)?.value ?? null;
}

// 숫자 앞의 +/-는 표시값이 아니라 등락 색상 방향으로 분리한다.
function readSignedNumber(fields: FieldBag, fid: string) {
  const value = readField(fields, fid);
  if (value === undefined || value === null || value === "") return null;

  const text = String(value).trim();
  const sign = text.startsWith("+") ? 1 : text.startsWith("-") ? -1 : 0;
  const numberValue = Number(text.replace(/[,+-]/g, ""));

  if (!Number.isFinite(numberValue)) return null;
  return { value: numberValue, sign };
}

// 등락/등락률은 색상 판단을 위해 방향성을 숫자 부호로 유지한다.
function readDirectionalNumber(fields: FieldBag, fid: string) {
  const parsed = readSignedNumber(fields, fid);
  if (!parsed) return null;
  return parsed.sign < 0 ? -parsed.value : parsed.value;
}

// 3자리 RTS FID와 6자리 TR FID를 모두 검색해서 문자열로 바꾼다.
function readString(fields: FieldBag, fid: string) {
  const value = readField(fields, fid);
  return value === undefined || value === null ? "" : String(value);
}

// 실시간은 3자리, TR은 6자리이므로 뒤 3자리가 같은 값을 같이 본다.
function readField(fields: FieldBag, fid: string) {
  const shortFid = toRtsFid(fid);
  const trFid = fid.length === 6 ? fid : `002${shortFid}`;
  const hogaTrFid = fid.length === 6 ? fid : `004${shortFid}`;

  return fields[shortFid] ?? fields[trFid] ?? fields[hogaTrFid];
}
