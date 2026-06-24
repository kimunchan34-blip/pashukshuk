"use client";

import { usePathname } from "next/navigation";
import { CircleDot, Bell } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/": "대시보드",
  "/members": "회원 관리",
  "/roundings": "라운딩 관리",
  "/finance": "회비 관리",
  "/leaderboard": "리더보드",
};

export function MobileHeader() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "파슉슉버디탁";

  return (
    <header
      className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 border-b border-slate-100 bg-white/95 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "#0B4619" }}
        >
          <CircleDot size={14} className="text-white" />
        </div>
        <span className="font-semibold text-slate-800 text-sm">{title}</span>
      </div>
      <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
      </button>
    </header>
  );
}
