# Mobile WTS

로그인 기반 모바일 웹 트레이딩 시스템 샘플입니다.

## 실행

```bash
npm install
npm run dev
```

## 환경 변수

```env
NEXT_PUBLIC_TR_API_URL=https://your-tr-api.example.com
NEXT_PUBLIC_RTS_URL=https://your-rts-api.example.com
NEXT_PUBLIC_MASTER_CODE_URL=https://your-master-code.example.com/wtscode.wjson
```

MasterCode는 서버 라우트에서 받아오므로 브라우저 CORS 영향을 줄입니다.
TR 서버나 RTS 서버가 연결되지 않아도 mock fallback으로 화면과 실시간 흐름을 확인할 수 있습니다.
