import { Crown, Medal } from "lucide-react";
import type { Member, Rounding } from "@/types";
import { cn } from "@/lib/utils";

interface RankingCardProps {
  members: Member[];
  roundings: Rounding[];
}

const RANK_MEDALS = [
  { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-50" },
  { icon: Medal, color: "text-slate-400",  bg: "bg-slate-50"  },
  { icon: Medal, color: "text-amber-600",  bg: "bg-amber-50"  },
];

export function RankingCard({ members, roundings }: RankingCardProps) {
  const completedRoundings = roundings.filter((r) => r.status === "completed");
  const attendanceTotal = completedRoundings.length || roundings.length;
  const sourceRoundings = completedRoundings.length > 0 ? completedRoundings : roundings;

  const top = [...members]
    .filter((m) => m.status === "active")
    .map((member) => {
      const attendedCount = sourceRoundings.filter((rounding) =>
        rounding.attendances.some((a) => a.memberId === member.id && a.status === "attending")
      ).length;
      const attendanceRate = attendanceTotal > 0 ? Math.round((attendedCount / attendanceTotal) * 100) : 0;

      return { member, attendedCount, attendanceRate };
    })
    .sort((a, b) =>
      b.attendedCount - a.attendedCount ||
      b.attendanceRate - a.attendanceRate ||
      a.member.name.localeCompare(b.member.name, "ko")
    )
    .slice(0, 5);

  return (
    <div className="card">
      <div className="card-header border-b border-slate-50 pb-4">
        <h2 className="text-base font-semibold text-slate-800">실시간 랭킹</h2>
        <p className="text-xs text-slate-400 mt-0.5">참석률 Top5</p>
      </div>
      <div className="divide-y divide-slate-50">
        {top.map(({ member, attendedCount, attendanceRate }, idx) => {
          const medal = RANK_MEDALS[idx];
          return (
            <div key={member.id} className={cn("flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50/80 transition-colors")}>
              {/* 순위 */}
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                medal ? medal.bg : "bg-slate-50"
              )}>
                {medal ? (
                  <medal.icon size={14} className={medal.color} />
                ) : (
                  <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                )}
              </div>

              {/* 아바타 */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: "linear-gradient(135deg, #0B4619, #1A9438)" }}
              >
                {member.avatarInitials}
              </div>

              {/* 이름 및 부서 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{member.name}</p>
                <p className="text-xs text-slate-400 truncate">
                  {member.department} · {member.position} · 참석률 {attendanceRate}%
                </p>
              </div>

              {/* 참석회수 배지 */}
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
                {attendedCount}회
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
