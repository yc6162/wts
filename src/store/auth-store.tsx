"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginByDemoId } from "@/lib/tradingApi";
import type { LoginUser } from "@/types/trading";

type AuthStore = {
  user: LoginUser | null;
  login: (id: string) => Promise<void>;
};

const AuthContext = createContext<AuthStore | null>(null);

// 로그인 정보는 TR/RTS 공통 파라미터로 쓰이므로 앱 상단 Provider에서 관리한다.
// 지금은 데모 사용자로 시작하고, 실제 로그인 API가 붙으면 loginByDemoId만 교체하면 된다.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LoginUser | null>({
    id: "demo",
    name: "데모사용자",
    accountNo: "123-45-678901",
    token: "demo-token"
  });
  const loginMutation = useMutation({
    mutationFn: loginByDemoId,
    onSuccess: setUser
  });

  const value = useMemo<AuthStore>(
    () => ({
      user,
      login: async (id: string) => {
        await loginMutation.mutateAsync(id);
      }
    }),
    [loginMutation, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 컴포넌트에서 로그인 store를 꺼내 쓰는 진입점이다.
export function useAuthStore() {
  const store = useContext(AuthContext);
  if (!store) throw new Error("useAuthStore must be used inside AuthProvider");
  return store;
}
