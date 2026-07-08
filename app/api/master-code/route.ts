import { NextResponse } from "next/server";
import { masterSymbols } from "@/data/mockMarket";
import { normalizeMasterCodes } from "@/lib/masterCode";

export const dynamic = "force-dynamic";
const MASTER_CODE_URL = process.env.NEXT_PUBLIC_MASTER_CODE_URL ?? "";

// 브라우저 CORS 영향을 줄이기 위해 서버에서 미래에셋 MasterCode를 받아온다.
export async function GET() {
  if (!MASTER_CODE_URL) {
    return NextResponse.json(masterSymbols);
  }

  try {
    const response = await fetch(MASTER_CODE_URL, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(masterSymbols);
    }

    const buffer = await response.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(buffer);
    const data = normalizeMasterCodes(JSON.parse(text));

    // MasterCode가 비어 있거나 파싱 실패에 가까운 상태면 데모 목록으로 화면 흐름을 유지한다.
    return NextResponse.json(data.length > 0 ? data : masterSymbols);
  } catch {
    return NextResponse.json(masterSymbols);
  }
}
