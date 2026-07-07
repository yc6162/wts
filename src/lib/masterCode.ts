import type { MarketSymbol } from "@/types/trading";

export const MIRAE_ASSET_MASTER_CODE_URL = "https://securities.miraeasset.com/code/wtscode.wjson";

type RawMasterCode = {
  ITM_CD?: string;
  KOR_ITMN?: string;
  TMNM?: string;
  code?: string;
  name?: string;
  market?: string;
};

// 미래에셋 MasterCode 원본에서 실제 종목 배열을 찾아낸다.
function extractMasterCodeRows(payload: unknown): RawMasterCode[] {
  if (Array.isArray(payload)) return payload as RawMasterCode[];

  if (payload && typeof payload === "object") {
    return Object.values(payload).flatMap((value) => (Array.isArray(value) ? (value as RawMasterCode[]) : []));
  }

  return [];
}

// 외부 MasterCode 필드를 앱에서 쓰는 공통 종목 형태로 변환한다.
export function normalizeMasterCodes(payload: unknown): MarketSymbol[] {
  return extractMasterCodeRows(payload)
    .map((item) => ({
      code: (item.ITM_CD ?? item.code ?? "").trim(),
      name: (item.KOR_ITMN ?? item.name ?? "").replace(/^[/%]+/, "").trim(),
      market: (item.TMNM ?? item.market ?? "기타").trim()
    }))
    .filter((item) => item.code.length > 0 && item.name.length > 0);
}
