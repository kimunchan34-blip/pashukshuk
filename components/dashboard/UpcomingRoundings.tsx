import Link from "next/link";
import { Calendar, MapPin, Clock, Users, ChevronRight } from "lucide-react";
import type { Rounding } from "@/types";
import { formatDate, getDaysUntil, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface UpcomingRoundingsProps {
  roundings: Rounding[];
}

export function UpcomingRoundings({ roundings }: UpcomingRoundingsProps) {
  const upcoming = roundings
    .filter((r) => r.status === "scheduled")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  return (
    <div className="card">
      <div className="card-header border-b border-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">예정된 라운딩</h2>
          <p className="text-xs text-slate-400 mt-0.5">다가오는 일정을 확인하세요</p>
        </div>
        <Link
          href="/roundings"
          className="text-xs text-green-700 font-medium hover:text-green-800 flex items-center gap-0.5"
        >
          전체보기 <ChevronRight size={12} />
        </Link>
      </div>

      <div className="divide-y divide-slate-50">
        {upcoming.length === 0 && (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">
            예정된 라운딩이 없습니다.
          </div>
        )}
        {upcoming.map((rounding) => {
          const daysLeft = getDaysUntil(rounding.date);
          const attendingCount = rounding.attendances.filter(
            (a) => a.status === "attending"
          ).length;

          return (
            <Link
              key={rounding.id}
              href={`/roundings/${rounding.id}`}
              className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
            >
              {/* 날짜 배지 */}
              <div
                className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 text-white"
                style={{ background: "linear-gradient(135deg, #0B4619, #116A27)" }}
              >
                <span className="text-[10px] font-medium opacity-80 leading-none">
                  {new Date(rounding.date).getMonth() + 1}월
                </span>
                <span className="text-xl font-bold leading-tight">
                  {new Date(rounding.date).getDate()}
                </span>
              </div>

              {/* 상세 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 truncate">{rounding.title}</p>
                  {daysLeft <= 7 && daysLeft > 0 && (
                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-md shrink-0">
                      D-{daysLeft}
                    </span>
                  )}
                  {daysLeft === 0 && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md shrink-0">
                      오늘
                    </span>
                  )}
                </div>
                <div className="mt-1.5 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin size={11} />
                    <span className="truncate">{rounding.courseName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock size={11} />
                      <span>{rounding.teeTime} 티오프</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Users size={11} />
                      <span>{attendingCount}/{rounding.maxParticipants}명</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 참가비 */}
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-700">{formatCurrency(rounding.fee)}</p>
                <ChevronRight size={14} className="text-slate-300 mt-1 ml-auto group-hover:text-green-600 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
