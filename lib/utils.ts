import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(amount);
}

export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(isoString));
}

export function formatDateShort(isoString: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(isoString));
}

export function getDaysUntil(isoString: string): number {
  const target = new Date(isoString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** 8 → "8", 8.5 → "8.5" (정수면 .0 생략) */
export function formatHandicap(handicap: number): string {
  return Number.isInteger(handicap) ? String(handicap) : handicap.toFixed(1);
}

export function getHandicapBadgeColor(handicap: number): string {
  if (handicap < 0)  return "bg-purple-600 text-white";   // 플러스 핸디캡
  if (handicap <= 9) return "bg-emerald-500 text-white";
  if (handicap <= 18) return "bg-blue-500 text-white";
  if (handicap <= 27) return "bg-amber-500 text-white";
  return "bg-slate-500 text-white";
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "활동",
    inactive: "탈퇴",
    pending: "대기",
    attending: "참석",
    absent: "불참",
    waitlist: "대기",
    scheduled: "예정",
    in_progress: "진행중",
    completed: "완료",
    cancelled: "취소",
    paid: "완납",
    unpaid: "미납",
    partial: "부분납",
  };
  return map[status] ?? status;
}
