# 모바일 WTS 개발 가이드

이 문서는 모바일 웹 트레이딩 시스템(WTS)을 팀원이 같은 방식으로 개발하기 위한 구조와 흐름을 정리한 가이드입니다.

## 1. 기본 원칙

1. 화면은 실제 수신 데이터만 표시합니다. TR과 실시간 데이터가 모두 없으면 빈 상태를 표시합니다.
2. 모든 화면의 기준 종목은 `market-store`의 `activeCode`입니다.
3. 화면 진입 시 TR을 먼저 조회하고, 이후 실시간 데이터를 같은 화면 state에 병합합니다.
4. TR 조회가 실패해도 실시간 연결과 구독은 계속 동작해야 합니다.
5. 실시간 socket 연결은 공통 영역에서 한 번 만들고, 탭 화면은 구독과 해지만 담당합니다.
6. 탭 이동 시 기존 탭 컴포넌트가 unmount되면서 `unsubscribe()`가 실행됩니다.
7. 종목명은 MasterCode에서 찾고, MasterCode 주소는 env에서만 가져옵니다.
8. TR FID는 6자리, 실시간 FID는 3자리입니다. 실시간 FID 매핑은 `rtsFid.ts`에 모읍니다.
9. `+`, `-` 부호는 등락 방향으로만 쓰고 화면 숫자에는 표시하지 않습니다.

## 2. 폴더 구조

참고 프로젝트처럼 화면 단위를 도메인으로 나누었습니다.

```text
app/
  api/
    master-code/route.ts   # MasterCode proxy
    tr/route.ts            # TR proxy
  layout.tsx
  page.tsx                 # WTS 첫 화면
  globals.css

src/
  domains/
    trading/
      components/
        MobileWtsApp.tsx   # Provider, 실시간 공통 연결, 탭 화면 조립
        TabBar.tsx         # 현재가/차트/일자별/호가 탭
    market/
      components/
        SymbolSearch.tsx   # 종목 검색과 조회
    current/
      components/
        CurrentPanel.tsx   # 현재가
    chart/
      components/
        ChartPanel.tsx     # 차트
    daily/
      components/
        DailyPanel.tsx     # 일자별
    orderbook/
      components/
        OrderBookPanel.tsx # 호가

  components/
    QueryProvider.tsx      # React Query Provider
    StatTile.tsx           # 공통 시세 타일

  hooks/
    useWtsQueries.ts       # MasterCode/TR useQuery 모음

  lib/
    tradingApi.ts          # TR 호출과 응답 매핑
    realtime.ts            # socket.io RTS 연결/구독/해지
    rtsFid.ts              # 실시간 FID 매핑
    masterCode.ts          # MasterCode 정규화
    format.ts              # 숫자/등락 색상 포맷

  store/
    auth-store.tsx         # 로그인 사용자 store
    market-store.tsx       # 현재 탭, 현재 종목, MasterCode store

  types/
    trading.ts             # 공통 타입
```

## 3. 환경 변수

로컬 실행 시 `.env.local`에 다음 값을 둡니다. Git에는 올리지 않습니다.

```env
NEXT_PUBLIC_TR_API_URL=https://securities.miraeasset.com
NEXT_PUBLIC_RTS_URL=https://newrts.securities.miraeasset.com
NEXT_PUBLIC_MASTER_CODE_URL=https://securities.miraeasset.com/code/wtscode.wjson
```

공유용 예시는 `.env.example`만 관리합니다.

## 4. 화면 시작 흐름

```text
app/page.tsx
  -> MobileWtsApp
  -> QueryProvider
  -> AuthProvider
  -> MarketProvider
  -> RealtimeShell
      -> realtimeClient.connect(loginId)
      -> SymbolSearch
      -> TabBar
      -> activeTab에 맞는 도메인 Panel 렌더링
```

`RealtimeShell`은 앱 시작 시 RTS를 공통으로 연결합니다. 각 탭 화면은 `realtimeClient.subscribe()`와 `unsubscribe()`만 사용합니다.

## 5. 외부 종목코드 진입

외부에서 종목코드를 받아 들어오는 경우를 위해 URL query를 지원합니다.

```text
/?code=006800
/?code=006800&tab=chart
/?symbol=006800
```

`src/store/market-store.tsx`가 `code`, `symbol`, `tab` 값을 읽어 초기 상태로 씁니다.

이후 앱 안에서 종목이나 탭이 바뀌면 URL도 다음처럼 갱신됩니다.

```text
/?code=005930&tab=current
```

따라서 새로고침, 링크 공유, 외부 앱 진입 시에도 같은 종목과 탭 기준으로 시작할 수 있습니다.

## 6. Store 역할

### auth-store

파일: `src/store/auth-store.tsx`

- 로그인 사용자 정보 보관
- TR/RTS에서 사용할 로그인 ID 제공
- 로그인 동작은 `useMutation` 기반으로 처리

현재는 demo login 형태입니다. 실제 로그인 API가 붙으면 `loginByDemoId()`를 실제 로그인 함수로 교체합니다.

### market-store

파일: `src/store/market-store.tsx`

- 현재 탭 `activeTab`
- 현재 종목코드 `activeCode`
- MasterCode 목록 `symbols`
- 현재 종목 정보 `selectedSymbol`
- URL query와 내부 상태 동기화

화면에서 종목 기준이 필요하면 반드시 `useMarketStore()`의 `activeCode`를 사용합니다.

## 7. TR과 React Query

TR과 MasterCode는 서버에서 가져오는 조회성 데이터이므로 React Query를 사용합니다.

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

종목코드가 바뀌면 queryKey가 바뀌기 때문에 해당 종목 기준으로 TR을 다시 조회합니다.

## 8. TR Proxy

브라우저에서 외부 TR endpoint를 직접 호출하지 않고 Next 서버 라우트 `/api/tr`을 거칩니다.

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

TR 응답은 `tradingApi.ts`에서 화면 모델로 변환합니다. 화면 컴포넌트는 원본 FID를 직접 다루지 않습니다.

## 9. RTS 실시간

파일:

```text
src/lib/realtime.ts
src/lib/rtsFid.ts
```

연결 흐름:

```text
socket.io connect
  -> sid 수신
  -> sid 업로드
  -> mbrLogin(loginId)
  -> login OK
  -> pushON
  -> push 수신
  -> FID 정규화
  -> 현재 탭 state에 병합
```

탭 전환 흐름:

```text
기존 panel unmount
  -> realtimeClient.unsubscribe(key)
새 panel mount
  -> realtimeClient.subscribe(key, activeCode, handler)
```

실시간 데이터는 React Query 캐시에 넣지 않습니다. 연결 상태와 push 이벤트 특성상 `realtimeClient` 이벤트 방식으로 처리합니다.

## 10. 도메인 탭 개발 패턴

각 탭은 같은 흐름을 따릅니다.

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
    // 실시간 데이터를 현재 화면 state에 병합한다.
  });

  return () => realtimeClient.unsubscribe(key);
}, [activeCode]);
```

새 탭을 추가할 때는 다음 순서로 작업합니다.

1. `src/types/trading.ts`에 화면 모델 타입 추가
2. `src/lib/tradingApi.ts`에 TR 함수와 mapper 추가
3. `src/hooks/useWtsQueries.ts`에 query hook 추가
4. `src/domains/{domain}/components`에 panel 추가
5. `src/domains/trading/components/TabBar.tsx`에 탭 추가
6. `MobileWtsApp.tsx`에 렌더링 분기 추가
7. 실시간이 필요하면 `realtimeClient.subscribe()`와 cleanup 추가

## 11. MasterCode

파일:

```text
app/api/master-code/route.ts
src/lib/masterCode.ts
```

MasterCode URL은 코드에 직접 넣지 않고 `NEXT_PUBLIC_MASTER_CODE_URL`에서 읽습니다.

정규화 규칙:

- 모든 하위 배열을 펼칩니다.
- `ITM_CD`를 `code`로 사용합니다.
- `KOR_ITMN`을 `name`으로 사용합니다.
- 종목명 앞의 `/`, `%` 문자를 제거합니다.
- 같은 종목코드는 한 번만 남깁니다.

## 12. 종목 검색

파일: `src/domains/market/components/SymbolSearch.tsx`

동작:

- 종목명 또는 종목코드를 입력합니다.
- `조회` 버튼 또는 Enter로 적용합니다.
- MasterCode에 있으면 해당 code를 사용합니다.
- MasterCode에 없어도 숫자 코드면 그대로 `activeCode`로 적용합니다.

종목 변경은 반드시 `setActiveCode()`로 처리합니다. 그래야 TR, RTS, URL 기준값이 같이 바뀝니다.

## 13. 실행과 검증

개발 서버:

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
