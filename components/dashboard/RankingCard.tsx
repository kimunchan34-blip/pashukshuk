import { Crown, Medal } from "lucide-react";
import type { Member } from "@/types";
import { cn, formatHandicap, getHandicapBadgeColor } from "@/lib/utils";

interface RankingCardProps {
  members: Member[];
}

const RANK_MEDALS = [
  { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-50" },
  { icon: Medal, color: "text-slate-400",  bg: "bg-slate-50"  },
  { icon: Medal, color: "text-amber-600",  bg: "bg-amber-50"  },
];

export function RankingCard({ members }: RankingCardProps) {
  const top = [...members]
    .filter((m) => m.status === "active")
    .sort((a, b) => a.handicap - b.handicap)
    .slice(0, 5);

  return (
    <div className="card">
      <div className="card-header border-b border-slate-50 pb-4">
        <h2 className="text-base font-semibold text-slate-800">실시간 랭킹</h2>
        <p className="text-xs text-slate-400 mt-0.5">평균 핸디캡 기준 Top 5</p>
      </div>
      <div className="divide-y divide-slate-50">
        {top.map((member, idx) => {
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
                <p className="text-xs text-slate-400 truncate">{member.department} · {member.position}</p>
              </div>

              {/* 핸디캡 배지 */}
              <span className={cn(
                "text-xs font-bold px-2.5 py-0.5 rounded-full",
                getHandicapBadgeColor(member.handicap)
              )}>
                {formatHandicap(member.handicap)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
