"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { loginByDemoId } from "@/lib/tradingApi";
import type { LoginUser } from "@/types/trading";

type AuthStore = {
  user: LoginUser | null;
  login: (id: string) => Promise<void>;
};

const AuthContext = createContext<AuthStore | null>(null);

// 로그인 정보와 TR 공통 파라미터를 앱 전체에서 쓰기 위한 Provider다.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LoginUser | null>({
    id: "demo",
    name: "홍길동",
    accountNo: "123-45-678901",
    token: "demo-token"
  });

  const value = useMemo<AuthStore>(
    () => ({
      user,
      login: async (id: string) => setUser(await loginByDemoId(id))
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 컴포넌트에서 로그인 스토어를 꺼내 쓰는 훅이다.
export function useAuthStore() {
  const store = useContext(AuthContext);
  if (!store) throw new Error("useAuthStore must be used inside AuthProvider");
  return store;
}
