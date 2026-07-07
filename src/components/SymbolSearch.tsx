"use client";

import { useMemo, useState } from "react";
import { useMarketStore } from "@/store/market-store";

// MasterCode 목록을 이용해 종목을 선택하는 검색 컴포넌트다.
export function SymbolSearch() {
  const { activeCode, symbols, setActiveCode } = useMarketStore();
  const [keyword, setKeyword] = useState("");

  const selected = symbols.find((item) => item.code === activeCode);
  const filtered = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return symbols.slice(0, 4);
    return symbols.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(text)).slice(0, 5);
  }, [keyword, symbols]);

  return (
    <section className="symbol-box">
      <div className="symbol-title">
        <span>{selected?.market ?? "KOSPI"}</span>
        <strong>{selected?.name ?? "삼성전자"}</strong>
        <em>{activeCode}</em>
      </div>
      <input
        aria-label="종목 검색"
        value={keyword}
        placeholder="종목명 또는 코드"
        onChange={(event) => setKeyword(event.target.value)}
      />
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
