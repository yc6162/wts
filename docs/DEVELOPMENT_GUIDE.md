# 모바일 WTS 개발 가이드

이 문서는 모바일 웹 트레이딩 시스템(WTS)을 함께 개발하는 팀원을 위한 구조 설명서입니다.
화면 개발자는 공통 흐름을 먼저 이해한 뒤, 각 탭 화면을 같은 방식으로 확장해야 합니다.

## 1. 프로젝트 개요

이 프로젝트는 로그인 기반 모바일 웹 WTS입니다.

기본 동작 원칙은 다음과 같습니다.

1. 로그인 정보와 현재 종목코드는 전역 store에서 관리한다.
2. 화면 진입 시 TR을 먼저 조회한다.
3. TR이 실패해도 실시간 연결은 별도로 동작한다.
4. 실시간 데이터가 들어오면 현재 화면 데이터에 병합한다.
5. 탭이 바뀌면 기존 탭 실시간 구독을 해제하고 새 탭 실시간 구독을 건다.
6. 데이터가 없으면 가짜 데이터를 보여주지 않는다.

## 2. 주요 폴더 구조

```text
app/
  api/
    master-code/route.ts   # 미래에셋 MasterCode proxy
    tr/route.ts            # 미래에셋 TR proxy
  layout.tsx               # Next root layout
  page.tsx                 # 첫 화면
  globals.css              # 모바일 WTS 공통 스타일

src/
  components/
    MobileWtsApp.tsx       # 전체 화면 조립 및 RTS 공통 연결
    QueryProvider.tsx      # React Query Provider
    SymbolSearch.tsx       # 종목 검색/조회
    TabBar.tsx             # 현재가/차트/일자별/호가 탭
    panels/                # 탭별 화면
  hooks/
    useWtsQueries.ts       # MasterCode/TR useQuery 모음
  lib/
    tradingApi.ts          # TR 호출 및 응답 매핑
    realtime.ts            # socket.io RTS 연결/구독/해제
    rtsFid.ts              # 실시간 FID 매핑
    masterCode.ts          # MasterCode 정규화
    format.ts              # 숫자/등락 색상 포맷
  store/
    auth-store.tsx         # 로그인 사용자 store
    market-store.tsx       # 현재 탭/종목/MasterCode store
  types/
    trading.ts             # 공통 타입
```

## 3. 환경 변수

로컬 실행 시 `.env.local`에 다음 값을 둡니다.

```env
NEXT_PUBLIC_TR_API_URL=https://securities.miraeasset.com
NEXT_PUBLIC_RTS_URL=https://newrts.securities.miraeasset.com
NEXT_PUBLIC_MASTER_CODE_URL=https://securities.miraeasset.com/code/wtscode.wjson
```

`.env.local`은 Git에 올리지 않습니다.
공유용 예시는 `.env.example`에만 둡니다.

## 4. 데이터 흐름

### 4.1 전체 앱 시작 흐름

```text
MobileWtsApp
  -> QueryProvider
  -> AuthProvider
  -> MarketProvider
  -> RealtimeShell
      -> realtimeClient.connect(loginId)
      -> SymbolSearch
      -> TabBar
      -> activeTab에 맞는 panel 렌더링
```

`RealtimeShell`은 앱 시작 시 RTS를 공통으로 연결합니다.
각 화면은 직접 RTS 연결을 만들지 않고, `realtimeClient.subscribe()`와 `unsubscribe()`만 호출합니다.

### 4.2 탭 화면 공통 흐름

각 탭은 같은 패턴을 따릅니다.

```text
activeCode 확인
  -> useQuery로 TR 조회
  -> TR 결과를 화면 state에 반영
  -> realtimeClient.subscribe(activeCode)
  -> 실시간 push 수신 시 화면 state에 병합
  -> unmount 또는 탭 이동 시 unsubscribe
```

현재 적용된 탭은 다음과 같습니다.

```text
현재가: CurrentPanel.tsx
차트: ChartPanel.tsx
일자별: DailyPanel.tsx
호가: OrderBookPanel.tsx
```

## 5. Store 역할

### 5.1 auth-store

파일: `src/store/auth-store.tsx`

역할:

- 로그인 사용자 정보 보관
- 로그인 ID 제공
- 로그인 액션은 `useMutation` 기반으로 처리

현재는 demo login 형태입니다.
실제 로그인 API가 생기면 `loginByDemoId()`를 실제 login 함수로 교체합니다.

### 5.2 market-store

파일: `src/store/market-store.tsx`

역할:

- 현재 탭 `activeTab`
- 현재 종목코드 `activeCode`
- MasterCode 목록 `symbols`
- 현재 종목 정보 `selectedSymbol`

중요:

- 모든 화면의 기준 종목은 반드시 `activeCode`입니다.
- 탭 이동 후에도 같은 `activeCode`로 TR/RTS가 동작해야 합니다.
- 종목명은 `selectedSymbol`에서 가져옵니다.

## 6. React Query 사용 기준

TR과 MasterCode는 요청성 데이터이므로 `useQuery`를 사용합니다.

파일: `src/hooks/useWtsQueries.ts`

```text
useMasterCodeQuery()
useQuoteQuery(code)
useOrderBookQuery(code)
useDailyPricesQuery(code)
useChartQuery(code)
```

queryKey 규칙:

```text
["master-code"]
["tr", "quote", code]
["tr", "orderbook", code]
["tr", "daily", code]
["tr", "chart", code]
```

이 규칙을 지키면 종목코드 변경 시 자동으로 새 TR이 조회되고,
같은 종목으로 다시 돌아왔을 때 캐시를 활용할 수 있습니다.

`mutation`은 서버 상태를 변경하는 기능에 사용합니다.
현재는 로그인 액션에만 사용 중이며, 추후 주문/관심종목/설정 저장에 사용할 수 있습니다.

## 7. TR 구조

브라우저에서 미래에셋 endpoint를 직접 호출하면 CORS 문제가 날 수 있으므로,
모든 TR은 Next 서버 라우트 `/api/tr`을 통해 호출합니다.

파일:

```text
app/api/tr/route.ts
src/lib/tradingApi.ts
```

현재 TR endpoint:

```text
현재가: /bp/b010.json
호가:   /bp/b020.json
일자별: /bp/c020.json
차트:   /bp/c030.json
```

예시:

```ts
fetchQuote("006800");
fetchOrderBook("006800");
fetchDailyPrices("006800");
fetchChart("006800");
```

TR 응답은 `tradingApi.ts` 안에서 화면 모델로 변환합니다.
화면 컴포넌트에서 TR 원본 FID를 직접 다루지 않는 것이 원칙입니다.

## 8. RTS 실시간 구조

파일:

```text
src/lib/realtime.ts
src/lib/rtsFid.ts
```

RTS 연결 순서:

```text
socket.io connect
  -> sid 수신
  -> sid 업로드
  -> mbrLogin(loginId)
  -> login OK
  -> pushON
  -> push 수신
  -> 화면 state 병합
```

탭 이동 시:

```text
기존 panel unmount
  -> realtimeClient.unsubscribe(key)
새 panel mount
  -> realtimeClient.subscribe(key, activeCode, handler)
```

실시간은 React Query로 관리하지 않습니다.
RTS는 연결 유지와 push 구독/해제가 핵심이므로 event client 방식으로 둡니다.

## 9. FID 규칙

TR FID는 6자리이고, 실시간 FID는 3자리입니다.
대부분 TR FID의 뒤 3자리가 실시간 FID와 매칭됩니다.

예시:

```text
TR 현재가: 002023
RTS 현재가: 023

TR 거래량: 002024
RTS 거래량: 024

TR 호가: 004060
RTS 호가: 060
```

공통 변환은 `src/lib/rtsFid.ts`에서 처리합니다.
화면에서는 FID를 직접 파싱하지 않습니다.

## 10. 등락 부호와 색상

미래에셋 데이터는 숫자 앞에 `+`, `-` 부호가 붙어 올 수 있습니다.

원칙:

- 화면에는 `+`, `-` 부호를 표시하지 않는다.
- `+`는 상승 색상으로 표시한다.
- `-`는 하락 색상으로 표시한다.
- 값 자체는 절대값으로 표시한다.

공통 포맷:

```text
src/lib/format.ts
```

호가의 경우 가격 앞 부호를 `changeSign`으로 분리해서 색상에 사용합니다.

## 11. MasterCode 구조

파일:

```text
app/api/master-code/route.ts
src/lib/masterCode.ts
```

MasterCode URL은 코드에 고정하지 않고 env에서 읽습니다.

```text
NEXT_PUBLIC_MASTER_CODE_URL=https://securities.miraeasset.com/code/wtscode.wjson
```

미래에셋 MasterCode는 여러 배열을 가진 객체입니다.
예를 들어 `STK`, `GOLD` 등 여러 그룹 아래 종목이 들어올 수 있습니다.

정규화 규칙:

- 모든 배열을 펼친다.
- `ITM_CD`를 `code`로 사용한다.
- `KOR_ITMN`을 `name`으로 사용한다.
- 종목명 앞 `/`, `%` 문자는 제거한다.
- 같은 종목코드는 한 번만 남긴다.

검색 화면은 정규화된 MasterCode만 사용합니다.

## 12. 종목 검색/조회

파일:

```text
src/components/SymbolSearch.tsx
```

동작:

- 종목명 또는 종목코드를 입력한다.
- `조회` 버튼 또는 Enter로 적용한다.
- MasterCode에 있는 종목이면 해당 code를 사용한다.
- MasterCode에 없는 숫자 코드도 입력값 그대로 `activeCode`로 적용한다.

중요:

- 종목 변경은 반드시 `setActiveCode()`로 처리한다.
- 화면별 local state만 바꾸면 안 된다.
- `activeCode`가 바뀌면 모든 탭의 TR/RTS 기준이 같이 바뀐다.

## 13. 새 탭 화면 개발 방법

새 탭을 추가할 때는 아래 순서로 작업합니다.

1. `src/types/trading.ts`에 화면 데이터 타입 추가
2. `src/lib/tradingApi.ts`에 TR 함수와 mapper 추가
3. `src/hooks/useWtsQueries.ts`에 query hook 추가
4. `src/components/panels`에 panel 컴포넌트 추가
5. `src/components/TabBar.tsx`에 탭 추가
6. `MobileWtsApp.tsx`에 렌더 분기 추가
7. 실시간이 필요하면 `realtimeClient.subscribe()` 사용
8. cleanup에서 반드시 `unsubscribe()` 호출

화면 컴포넌트는 다음 패턴을 따릅니다.

```tsx
const { activeCode } = useMarketStore();
const query = useSomeTrQuery(activeCode);
const [viewData, setViewData] = useState(null);

useEffect(() => {
  setViewData(query.data?.data ?? null);
}, [activeCode, query.data]);

useEffect(() => {
  const key = `some-${activeCode}`;

  realtimeClient.subscribe(key, activeCode, (message) => {
    // 실시간 데이터 병합
  });

  return () => realtimeClient.unsubscribe(key);
}, [activeCode]);
```

## 14. 개발 시 주의사항

- 화면에서 TR 원본 FID를 직접 사용하지 않는다.
- 실시간 연결은 화면마다 새로 만들지 않는다.
- 탭 이동 시 구독 해제를 반드시 한다.
- 실제 데이터가 없으면 mock처럼 보이는 값을 표시하지 않는다.
- 종목코드 기준은 항상 store의 `activeCode`다.
- 화면 컴포넌트는 재사용 가능한 작은 컴포넌트 조합으로 만든다.
- 공통 포맷, FID 변환, TR proxy는 중복 구현하지 않는다.
- 커밋 메시지는 한글로 작성한다.

## 15. 실행과 검증

개발 실행:

```bash
npm run dev
```

포트 지정:

```bash
npm run dev -- -p 3001
```

빌드 검증:

```bash
npm run build
```

취약점 확인:

```bash
npm audit --omit=dev
```
