"use client";

import { useState } from "react";
import { CircleDot, Lock, Eye, EyeOff, ChevronRight } from "lucide-react";
import { useRole, type Role } from "@/contexts/RoleContext";

const ROLE_PASSWORDS: Record<"회장" | "총무", string> = {
  회장: process.env.NEXT_PUBLIC_PRESIDENT_PASSWORD ?? "6789",
  총무: process.env.NEXT_PUBLIC_SECRETARY_PASSWORD ?? "2345",
};

export function LoginScreen() {
  const { login } = useRole();
  const [selected, setSelected] = useState<"회장" | "총무" | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleAdminSelect = (role: "회장" | "총무") => {
    setSelected(role);
    setPassword("");
    setError("");
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ROLE_PASSWORDS[selected as "회장" | "총무"]) {
      login(selected as Role);
    } else {
      setError("비밀번호가 올바르지 않습니다.");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 to-green-800 px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
            <CircleDot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">파슉슉버디탁</h1>
          <p className="text-green-300 text-sm mt-1">골프동호회 관리 시스템</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          {!selected ? (
            <>
              <h2 className="text-base font-bold text-slate-800 mb-1">역할을 선택하세요</h2>
              <p className="text-xs text-slate-400 mb-5">회장·총무는 비밀번호가 필요합니다</p>
              <div className="space-y-3">
                {(["회장", "총무"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleAdminSelect(role)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-slate-200 hover:border-green-400 hover:bg-green-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                        <Lock size={16} className="text-green-700" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-800">{role}</p>
                        <p className="text-xs text-slate-400">등록·수정·삭제 가능</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-green-600" />
                  </button>
                ))}

                <div className="relative flex items-center gap-2 my-1">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-400">또는</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <button
                  onClick={() => login("일반")}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center transition-colors">
                      <CircleDot size={16} className="text-slate-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-800">일반</p>
                      <p className="text-xs text-slate-400">조회만 가능</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600" />
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-4 transition-colors"
              >
                ← 뒤로
              </button>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#0B4619" }}>
                  <Lock size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">{selected} 로그인</h2>
                  <p className="text-xs text-slate-400">관리자 비밀번호를 입력하세요</p>
                </div>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-3">
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    autoFocus
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={!password}
                  className="w-full py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                  style={{ background: "#0B4619" }}
                >
                  로그인
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-green-400/60 text-xs mt-6">파슉슉버디탁 골프동호회</p>
      </div>
    </div>
  );
}
