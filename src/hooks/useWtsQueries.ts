import { useQuery } from "@tanstack/react-query";
import { fetchChart, fetchDailyPrices, fetchOrderBook, fetchQuote, loadMasterCodes } from "@/lib/tradingApi";

// MasterCode를 조회하고 React Query 캐시에 저장한다.
export function useMasterCodeQuery() {
  return useQuery({
    queryKey: ["master-code"],
    queryFn: loadMasterCodes,
    staleTime: 1000 * 60 * 30
  });
}

// 현재가 TR 조회 query다.
export function useQuoteQuery(code: string) {
  return useQuery({
    queryKey: ["tr", "quote", code],
    queryFn: () => fetchQuote(code),
    enabled: code.length > 0
  });
}

// 호가 TR 조회 query다.
export function useOrderBookQuery(code: string) {
  return useQuery({
    queryKey: ["tr", "orderbook", code],
    queryFn: () => fetchOrderBook(code),
    enabled: code.length > 0
  });
}

// 일자별 TR 조회 query다.
export function useDailyPricesQuery(code: string) {
  return useQuery({
    queryKey: ["tr", "daily", code],
    queryFn: () => fetchDailyPrices(code),
    enabled: code.length > 0
  });
}

// 차트 TR 조회 query다.
export function useChartQuery(code: string) {
  return useQuery({
    queryKey: ["tr", "chart", code],
    queryFn: () => fetchChart(code),
    enabled: code.length > 0
  });
}
