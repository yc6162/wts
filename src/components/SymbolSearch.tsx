"use client";

import { useMemo, useState } from "react";
import { useMarketStore } from "@/store/market-store";

// MasterCode 목록을 이용해 종목을 선택하는 검색 컴포넌트다.
export function SymbolSearch() {
  const { activeCode, selectedSymbol, symbols, setActiveCode } = useMarketStore();
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return symbols.slice(0, 4);
    return symbols.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(text)).slice(0, 5);
  }, [keyword, symbols]);

  // 입력한 코드나 종목명으로 첫 번째 매칭 종목을 적용한다.
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
        <span>{selectedSymbol?.market ?? "미지정"}</span>
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
              key={symbol.code}
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
