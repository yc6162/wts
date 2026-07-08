"use client";

import { useMemo, useState } from "react";
import { useMarketStore } from "@/store/market-store";

// MasterCode 목록에서 종목을 찾고 현재 기준 종목을 변경한다.
export function SymbolSearch() {
  const { activeCode, selectedSymbol, symbols, setActiveCode } = useMarketStore();
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return symbols.slice(0, 4);
    return symbols.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(text)).slice(0, 5);
  }, [keyword, symbols]);

  // 입력값과 가장 가까운 종목을 찾고, 없으면 숫자 코드만 직접 적용한다.
  // MasterCode가 늦게 로딩되어도 사용자가 종목코드를 바로 입력할 수 있게 하기 위한 처리다.
  function submitSymbol() {
    const text = keyword.trim();
    if (!text) return;

    const target =
      symbols.find((item) => item.code === text) ??
      symbols.find((item) => item.name.includes(text)) ??
      filtered[0];

    if (!target && !/^\d{4,12}$/.test(text)) {
      console.log("[WTS][SYMBOL] not found", { keyword: text });
      return;
    }

    setActiveCode(target?.code ?? text);
    setKeyword("");
  }

  return (
    <section className="symbol-box">
      <div className="symbol-title">
        <span>{selectedSymbol?.market ?? "미분류"}</span>
        <strong>{selectedSymbol?.name ?? "종목명 없음"}</strong>
        <em>{activeCode}</em>
      </div>
      <div className="symbol-input-row">
        <input
          aria-label="종목 검색"
          value={keyword}
          placeholder="종목명 또는 코드"
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitSymbol();
          }}
        />
        <button type="button" onClick={submitSymbol}>
          조회
        </button>
      </div>
      {keyword && (
        <div className="symbol-list">
          {filtered.map((symbol) => (
            <button
              key={`${symbol.code}-${symbol.market}-${symbol.name}`}
              type="button"
              onClick={() => {
                setActiveCode(symbol.code);
                setKeyword("");
              }}
            >
              <span>{symbol.name}</span>
              <em>{symbol.code}</em>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
