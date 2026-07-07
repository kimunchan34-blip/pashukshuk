"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Flag, Wallet, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: LayoutDashboard },
  { href: "/members", label: "회원", icon: Users },
  { href: "/roundings", label: "라운딩", icon: Flag },
  { href: "/finance", label: "회비", icon: Wallet },
  { href: "/leaderboard", label: "순위", icon: Trophy },
];

export function MobileNav() {
  const pathname = usePathname();
  const { isAdmin } = useRole();
  const navItems = NAV_ITEMS.filter((item) => item.href !== "/leaderboard" || isAdmin);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100"
      style={{ background: "#fff", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                isActive ? "text-green-700" : "text-slate-400"
              )}
            >
              <Icon
                size={20}
                className={cn(isActive ? "text-green-700" : "text-slate-400")}
              />
              <span className="text-[10px] leading-none">{label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-green-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
