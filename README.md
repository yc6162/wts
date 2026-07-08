# Mobile WTS

로그인 기반 모바일 주식 트레이딩 시스템 샘플입니다.

개발 흐름과 파일별 역할은 [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)를 참고하세요.

## IntelliJ에서 열기

1. IntelliJ IDEA에서 `File > Open`을 누릅니다.
2. 이 폴더를 선택합니다: `C:\Users\gasam\OneDrive\문서\WTS_리액트+Next.js`
3. Node.js 인터프리터가 잡혀 있는지 확인합니다.
4. 터미널에서 아래 명령을 실행합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하면 됩니다.

## Git 사용자 설정

이 저장소는 전역 설정이 아니라 프로젝트 안의 로컬 Git 설정으로만 사용자 정보가 잡혀 있습니다.

```bash
git config --local user.name "yc6162"
git config --local user.email "yc6162@users.noreply.github.com"
```

비밀번호나 토큰은 코드나 문서에 저장하지 않습니다. GitHub 로그인이 필요하면 IntelliJ의 GitHub 계정 연결 또는 Windows 자격 증명 관리자에 저장하는 방식이 안전합니다.

## 환경 변수

```env
NEXT_PUBLIC_TR_API_URL=https://your-tr-api.example.com
NEXT_PUBLIC_RTS_URL=https://your-rts-api.example.com
NEXT_PUBLIC_MASTER_CODE_URL=https://your-master-code.example.com/wtscode.wjson
```

MasterCode 주소는 코드에 고정하지 않고 `NEXT_PUBLIC_MASTER_CODE_URL`에서 읽습니다.
MasterCode는 서버 라우트에서 받아오므로 브라우저 CORS 영향을 줄입니다.
TR 서버나 RTS 서버 연결이 실패해도 mock fallback으로 화면 흐름을 확인할 수 있습니다.
