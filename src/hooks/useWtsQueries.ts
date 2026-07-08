import { useQuery } from "@tanstack/react-query";
import { fetchChart, fetchDailyPrices, fetchOrderBook, fetchQuote, loadMasterCodes } from "@/lib/tradingApi";

// MasterCode는 종목 검색에서 계속 재사용하므로 30분 동안 React Query 캐시에 보관한다.
export function useMasterCodeQuery() {
  return useQuery({
    queryKey: ["master-code"],
    queryFn: loadMasterCodes,
    staleTime: 1000 * 60 * 30
  });
}

// 현재가 TR 조회 query다. code가 비어 있으면 불필요한 요청을 보내지 않는다.
export function useQuoteQuery(code: string) {
  return useQuery({
    queryKey: ["tr", "quote", code],
    queryFn: () => fetchQuote(code),
    enabled: code.length > 0
  });
}

// 호가 TR 조회 query다. queryKey에 code를 넣어 종목 변경 시 자동 재조회되게 한다.
export function useOrderBookQuery(code: string) {
  return useQuery({
    queryKey: ["tr", "orderbook", code],
    queryFn: () => fetchOrderBook(code),
    enabled: code.length > 0
  });
}

// 일자별 TR 조회 query다. 첫 조회 데이터 위에 실시간 현재가를 덧씌우는 구조로 사용한다.
export function useDailyPricesQuery(code: string) {
  return useQuery({
    queryKey: ["tr", "daily", code],
    queryFn: () => fetchDailyPrices(code),
    enabled: code.length > 0
  });
}

// 차트 TR 조회 query다. 캔들 원본은 TR에서 받고 마지막 봉만 실시간으로 보정한다.
export function useChartQuery(code: string) {
  return useQuery({
    queryKey: ["tr", "chart", code],
    queryFn: () => fetchChart(code),
    enabled: code.length > 0
  });
}
