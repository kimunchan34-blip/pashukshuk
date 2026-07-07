"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Flag, Wallet, Trophy, CircleDot, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";

const NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/members", label: "회원 관리", icon: Users },
  { href: "/roundings", label: "라운딩 관리", icon: Flag },
  { href: "/finance", label: "회비 관리", icon: Wallet },
  { href: "/leaderboard", label: "리더보드", icon: Trophy },
];

export function Sidebar() {
  const pathname = usePathname();
  const { role, isAdmin, logout } = useRole();
  const navItems = NAV_ITEMS.filter((item) => item.href !== "/leaderboard" || isAdmin);

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 flex-col z-30"
      style={{ background: "linear-gradient(180deg, #0B4619 0%, #0a3d15 100%)" }}
    >
      {/* 로고 영역 */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <CircleDot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">파슉슉버디탁</p>
            <p className="text-white/50 text-xs mt-0.5">골프동호회 관리</p>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn("nav-item", isActive && "nav-item-active")}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
              <span>{label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 하단: 역할 표시 + 로그아웃 */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: isAdmin ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.1)" }}>
            <span className={isAdmin ? "text-green-300" : "text-white/60"}>
              {role?.slice(0, 1)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium">{role}</p>
            <p className="text-white/40 text-[10px]">{isAdmin ? "관리자 권한" : "조회 전용"}</p>
          </div>
          <button onClick={logout} title="로그아웃"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
