import { NextResponse } from "next/server";
import { masterSymbols } from "@/data/mockMarket";
import { MIRAE_ASSET_MASTER_CODE_URL, normalizeMasterCodes } from "@/lib/masterCode";

export const dynamic = "force-dynamic";
const MASTER_CODE_URL = process.env.NEXT_PUBLIC_MASTER_CODE_URL ?? MIRAE_ASSET_MASTER_CODE_URL;

// 브라우저 CORS 영향을 피하기 위해 서버에서 미래에셋 MasterCode를 받아온다.
export async function GET() {
  try {
    const response = await fetch(MASTER_CODE_URL, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(masterSymbols);
    }

    const data = normalizeMasterCodes(await response.json());
    return NextResponse.json(data.length > 0 ? data : masterSymbols);
  } catch {
    return NextResponse.json(masterSymbols);
  }
}
