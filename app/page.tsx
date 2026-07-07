"use client";

import { useState, useEffect } from "react";
import { Users, CalendarDays, Wallet, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RankingCard } from "@/components/dashboard/RankingCard";
import { UpcomingRoundings } from "@/components/dashboard/UpcomingRoundings";
import { formatCurrency, formatHandicap, getDaysUntil } from "@/lib/utils";
import type { Member, Rounding } from "@/types";
import * as db from "@/lib/db";

export default function DashboardPage() {
  const [members,  setMembers]  = useState<Member[]>([]);
  const [roundings, setRoundings] = useState<Rounding[]>([]);
  const [balance,  setBalance]  = useState<number>(0);

  useEffect(() => {
    db.getMembers().then(setMembers).catch(console.error);
    db.getRoundings().then(setRoundings).catch(console.error);
    db.getTransactions().then((txs) => {
      if (txs.length > 0) {
        const numId = (id: string) => { const n = parseInt(id.replace(/\D/g, ""), 10); return isNaN(n) ? 0 : n; };
        const last = [...txs].sort((a, b) => a.date.localeCompare(b.date) || numId(a.id) - numId(b.id)).at(-1)!;
        setBalance(last.balance);
      }
    }).catch(console.error);
  }, []);

  const activeMembers = members.filter((m) => m.status === "active");
  const thisMonth = new Date().getMonth();
  const thisMonthRoundings = roundings.filter((r) => new Date(r.date).getMonth() === thisMonth);
  const nextRounding = roundings
    .filter((r) => r.status === "scheduled")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;
  const daysUntilNext = nextRounding ? getDaysUntil(nextRounding.date) : null;

  const avgHandicap = activeMembers.length > 0
    ? (activeMembers.reduce((s, m) => s + m.handicap, 0) / activeMembers.length).toFixed(1)
    : "-";
  const minHandicap = activeMembers.length > 0
    ? formatHandicap(Math.min(...activeMembers.map((m) => m.handicap)))
    : "-";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 페이지 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
          <p className="text-sm text-slate-400 mt-0.5">파슉슉버디탁 골프동호회 현황</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white rounded-xl px-3 py-2 border border-slate-100 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow" />
          실시간 업데이트
        </div>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard
          title="총 회원"
          value={`${members.length}명`}
          sub={`활동 ${activeMembers.length}명`}
          icon={Users}
          accent="green"
        />
        <StatsCard
          title="이번 달 라운딩"
          value={`${thisMonthRoundings.length}회`}
          sub={daysUntilNext !== null ? `다음 라운딩 D-${daysUntilNext}` : "예정 없음"}
          icon={CalendarDays}
          accent="blue"
        />
        <StatsCard
          title="동호회 잔액"
          value={formatCurrency(balance)}
          sub="거래 내역 기준"
          icon={Wallet}
          accent="amber"
        />
        <StatsCard
          title="평균 핸디캡"
          value={avgHandicap}
          sub={`최저 ${minHandicap}`}
          icon={TrendingUp}
          accent="purple"
        />
      </div>

      {/* 배너: 다음 라운딩 */}
      {nextRounding && (
        <div
          className="rounded-2xl p-5 text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0B4619 0%, #1A9438 100%)" }}
        >
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -right-4 top-8 w-24 h-24 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/60 text-xs font-medium uppercase tracking-wide">다음 라운딩</p>
              <h3 className="text-lg font-bold mt-1">{nextRounding.title}</h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <p className="text-white/80 text-sm">📍 {nextRounding.courseName}</p>
                <p className="text-white/80 text-sm">
                  🕖 {nextRounding.date.replace(/-/g, ".")} {nextRounding.teeTime}
                </p>
                <p className="text-white/80 text-sm">
                  👥 {nextRounding.attendances.filter((a) => a.status === "attending").length}
                  /{nextRounding.maxParticipants}명 참석
                </p>
              </div>
            </div>
            {daysUntilNext !== null && (
              <div className="text-right">
                <p className="text-white/60 text-xs">D-Day</p>
                <p className="text-4xl font-black tabular-nums">
                  {daysUntilNext > 0 ? `-${daysUntilNext}` : "DAY"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 하단 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <RankingCard members={members} roundings={roundings} />
        <UpcomingRoundings roundings={roundings} />
      </div>
    </div>
  );
}
