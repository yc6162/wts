import { NextResponse } from "next/server";

const TR_BASE_URL = process.env.NEXT_PUBLIC_TR_API_URL ?? "https://securities.miraeasset.com";

// 브라우저 CORS 영향을 피하기 위해 TR 요청을 서버에서 대신 수행한다.
export async function POST(request: Request) {
  try {
    const { path, param } = (await request.json()) as {
      path?: string;
      param?: Record<string, string>;
    };

    if (!path?.startsWith("/bp/")) {
      return NextResponse.json({ ok: false, message: "invalid tr path" }, { status: 400 });
    }

    const body = new URLSearchParams(param ?? {});
    const response = await fetch(`${TR_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body,
      cache: "no-store"
    });

    const buffer = await response.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(buffer);

    return NextResponse.json(JSON.parse(text), { status: response.ok ? 200 : response.status });
  } catch {
    return NextResponse.json({ ok: false, message: "tr request failed" }, { status: 502 });
  }
}
