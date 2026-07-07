"use client";

import { useState, useEffect, useMemo } from "react";
import { Trophy, Crown, Medal, ChevronDown, Check, Pencil, BarChart3, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import * as db from "@/lib/db";
import { useRole } from "@/contexts/RoleContext";
import type { Rounding, Member } from "@/types";
import { cn, formatHandicap, getHandicapBadgeColor, formatDate } from "@/lib/utils";

// ── 타입 ──────────────────────────────────────────────────────────────────────

type RoundScore = { gross: number; net: number; handicap: number };
// roundingId → memberId → score
type AllRoundScores = Record<string, Record<string, RoundScore>>;


// ── 상수 ──────────────────────────────────────────────────────────────────────

const RANK_STYLE = [
  { Icon: Crown, color: "text-yellow-500", bg: "bg-yellow-50",  ring: "ring-yellow-200" },
  { Icon: Medal, color: "text-slate-400",  bg: "bg-slate-50",   ring: "ring-slate-200"  },
  { Icon: Medal, color: "text-amber-600",  bg: "bg-amber-50",   ring: "ring-amber-200"  },
];

const STATUS_LABEL: Record<string, string> = {
  scheduled: "예정", in_progress: "진행중", completed: "완료", cancelled: "취소",
};

const PAR = 72;

/** 넷스코어 - 파72 = 핸디캡 대비 성과 (음수일수록 잘 침) */
function getPerformance(net: number) {
  const diff = Math.round((net - PAR) * 10) / 10;
  if (diff <= -5) return { diff, emoji: "🏆", label: "탁월", color: "text-yellow-600" };
  if (diff <= -1) return { diff, emoji: "⭐", label: "우수", color: "text-green-600"  };
  if (diff === 0) return { diff, emoji: "🎯", label: "기준타", color: "text-blue-600"  };
  if (diff <=  5) return { diff, emoji: "👍", label: "보통",  color: "text-slate-600"  };
  if (diff <= 10) return { diff, emoji: "😅", label: "열위",  color: "text-amber-600"  };
  return               { diff, emoji: "💪", label: "분발",    color: "text-red-500"    };
}

function fmtDiff(diff: number) {
  return diff > 0 ? `+${diff}` : String(diff);
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [roundings, setRoundings] = useState<Rounding[]>([]);
  const [members,   setMembers]   = useState<Member[]>([]);
  const [allScores, setAllScores] = useState<AllRoundScores>({});
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [activeTab,  setActiveTab]  = useState<"rounding" | "alltime">("rounding");
  const { isAdmin } = useRole();
  const [inputs, setInputs]         = useState<Record<string, string>>({}); // memberId → gross string
  const [handicapInputs, setHandicapInputs] = useState<Record<string, string>>({}); // memberId → handicap string
  const [editing, setEditing]       = useState<string | null>(null);        // memberId being edited
  const [alltimePage, setAlltimePage] = useState(1);
  const ALLTIME_PER_PAGE = 10;

  useEffect(() => {
    Promise.all([db.getRoundings(), db.getMembers(), db.getRoundScores()])
      .then(([r, m, scores]) => {
        setRoundings(r);
        setMembers(m);
        setAllScores(scores);
        const recent = [...r].sort((a, b) => b.date.localeCompare(a.date))[0];
        if (recent) {
          setSelectedId(recent.id);
          setSelectedYear(recent.date.slice(0, 4));
        }
      })
      .catch(console.error);
  }, []);

  // 연도 목록 (내림차순)
  const years = useMemo(() =>
    [...new Set(roundings.map((r) => r.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a)),
    [roundings]
  );

  // 선택된 연도의 라운딩 (최신 순)
  const yearRoundings = useMemo(() =>
    [...roundings]
      .filter((r) => r.date.startsWith(selectedYear))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [roundings, selectedYear]
  );

  const selectedRounding = roundings.find((r) => r.id === selectedId) ?? null;

  // 선택된 라운딩의 참석 회원
  const attendees = useMemo(() => {
    if (!selectedRounding) return [];
    return selectedRounding.attendances
      .filter((a) => a.status === "attending")
      .map((a) => members.find((m) => m.id === a.memberId))
      .filter(Boolean) as Member[];
  }, [selectedRounding, members]);

  // 선택된 라운딩의 저장된 점수
  const roundScores = allScores[selectedId] ?? {};

  // 점수 저장
  const submitScore = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    const saved = roundScores[memberId];
    const grossStr = (inputs[memberId] ?? "").trim();
    const handicapStr = (handicapInputs[memberId] ?? String(saved?.handicap ?? member?.handicap ?? "")).trim();
    const gross = parseInt(grossStr, 10);
    const handicap = parseFloat(handicapStr);
    if (isNaN(gross) || gross < 18 || gross > 200) return;
    if (isNaN(handicap) || handicap < -10 || handicap > 54) return;
    const roundedHandicap = Math.round(handicap * 10) / 10;
    const net = Math.round((gross - roundedHandicap) * 10) / 10;
    const updated: AllRoundScores = {
      ...allScores,
      [selectedId]: { ...roundScores, [memberId]: { gross, handicap: roundedHandicap, net } },
    };
    setAllScores(updated);
    db.upsertRoundScore(selectedId, memberId, { gross, handicap: roundedHandicap, net }).catch(console.error);
    setInputs((prev) => { const n = { ...prev }; delete n[memberId]; return n; });
    setHandicapInputs((prev) => { const n = { ...prev }; delete n[memberId]; return n; });
    setEditing(null);
  };

  // 삭제
  const deleteScore = (memberId: string) => {
    const updated: AllRoundScores = { ...allScores };
    if (updated[selectedId]) {
      const next = { ...updated[selectedId] };
      delete next[memberId];
      updated[selectedId] = next;
    }
    setAllScores(updated);
    db.deleteRoundScore(selectedId, memberId).catch(console.error);
  };

  // 라운딩 순위 계산
  const roundRanking = useMemo(() => {
    return Object.entries(roundScores)
      .map(([memberId, score]) => ({ memberId, ...score, member: members.find((m) => m.id === memberId) }))
      .filter((r) => r.member)
      .sort((a, b) => a.net - b.net);
  }, [roundScores, members]);

  // 통산 순위 계산 (라운딩 참여 횟수 ≥ 1)
  const allTimeRanking = useMemo(() => {
    const map = new Map<string, { totalNet: number; totalGross: number; totalHandicap: number; count: number; member: Member }>();
    for (const [, scores] of Object.entries(allScores)) {
      for (const [memberId, score] of Object.entries(scores)) {
        const member = members.find((m) => m.id === memberId);
        if (!member) continue;
        const scoreHandicap = score.handicap ?? Math.round((score.gross - score.net) * 10) / 10;
        const prev = map.get(memberId) ?? { totalNet: 0, totalGross: 0, totalHandicap: 0, count: 0, member };
        map.set(memberId, {
          member,
          count: prev.count + 1,
          totalNet: prev.totalNet + score.net,
          totalGross: prev.totalGross + score.gross,
          totalHandicap: prev.totalHandicap + scoreHandicap,
        });
      }
    }
    return [...map.values()]
      .map((v) => ({ ...v, avgNet: v.totalNet / v.count, avgGross: v.totalGross / v.count, avgHandicap: v.totalHandicap / v.count }))
      .sort((a, b) => a.avgNet - b.avgNet);
  }, [allScores, members]);

  const completedCount = Object.keys(roundScores).length;
  const alltimeTotalPages = Math.ceil(allTimeRanking.length / ALLTIME_PER_PAGE);
  const pagedAlltime = allTimeRanking.slice(
    (alltimePage - 1) * ALLTIME_PER_PAGE,
    alltimePage * ALLTIME_PER_PAGE
  );

  if (!isAdmin) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">리더보드</h1>
          <p className="text-sm text-slate-400 mt-0.5">회장·총무 전용 메뉴입니다</p>
        </div>
        <div className="card px-6 py-16 text-center">
          <Trophy size={36} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-semibold text-slate-700">접근 권한이 없습니다</p>
          <p className="text-xs text-slate-400 mt-1">리더보드는 회장과 총무만 조회 및 관리할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">리더보드</h1>
          <p className="text-sm text-slate-400 mt-0.5">라운딩별 순위 · 통산 성적</p>
        </div>
      </div>

      {/* 라운딩 선택: 연도 탭 + 드롭다운 */}
      <div className="card p-4 space-y-3">
        {/* 연도 탭 */}
        <div className="flex items-center gap-1">
          <ChevronLeft size={14} className="text-slate-300 shrink-0" />
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => {
                  setSelectedYear(y);
                  // 해당 연도의 첫 번째(최신) 라운딩 자동 선택
                  const first = [...roundings]
                    .filter((r) => r.date.startsWith(y))
                    .sort((a, b) => b.date.localeCompare(a.date))[0];
                  if (first) { setSelectedId(first.id); setInputs({}); setHandicapInputs({}); setEditing(null); }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                  selectedYear === y
                    ? "text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
                style={selectedYear === y ? { background: "#0B4619" } : {}}
              >
                {y}년
                <span className={cn("ml-1.5 text-[10px]", selectedYear === y ? "text-white/70" : "text-slate-400")}>
                  {roundings.filter((r) => r.date.startsWith(y)).length}
                </span>
              </button>
            ))}
          </div>
          <ChevronRight size={14} className="text-slate-300 shrink-0" />
        </div>

        {/* 선택된 연도의 라운딩 드롭다운 */}
        <div className="relative">
          <select
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); setInputs({}); setHandicapInputs({}); setEditing(null); }}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-9 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 appearance-none"
          >
            {yearRoundings.map((r) => (
              <option key={r.id} value={r.id}>
                {r.date} · {r.title} · {r.courseName} [{STATUS_LABEL[r.status]}]
              </option>
            ))}
            {yearRoundings.length === 0 && (
              <option disabled>{selectedYear}년 라운딩 없음</option>
            )}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* 선택된 라운딩 정보 */}
        {selectedRounding && (
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span>📅 {formatDate(selectedRounding.date)} {selectedRounding.teeTime}</span>
            <span>📍 {selectedRounding.courseName}</span>
            <span>👥 참석 {attendees.length}명</span>
            <span className={cn("font-semibold", completedCount === attendees.length && attendees.length > 0 ? "text-green-600" : "text-amber-500")}>
              ✏️ 점수 입력 {completedCount}/{attendees.length}
            </span>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([["rounding", "라운딩 순위", Trophy], ["alltime", "통산 순위", BarChart3]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === key ? "bg-white text-green-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── 라운딩 순위 탭 ── */}
      {activeTab === "rounding" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* 점수 입력 - 관리자만 */}
          {isAdmin && <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50">
              <h2 className="text-sm font-semibold text-slate-800">참가자 점수 입력</h2>
            </div>

            {attendees.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                참석자가 없습니다.<br />
                <span className="text-xs">라운딩 관리에서 참석자를 등록해주세요.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {attendees.map((member) => {
                  const saved  = roundScores[member.id];
                  const isEdit = editing === member.id;
                  const inputVal = inputs[member.id] ?? "";
                  const handicapInputVal = handicapInputs[member.id] ?? String(saved?.handicap ?? member.handicap);

                  return (
                    <div key={member.id} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* 아바타 */}
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: "linear-gradient(135deg, #0B4619, #1A9438)" }}>
                          {member.avatarInitials}
                        </div>
                        {/* 이름 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-slate-800">{member.name}</p>
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", getHandicapBadgeColor(saved?.handicap ?? member.handicap))}>
                              H{formatHandicap(saved?.handicap ?? member.handicap)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{member.department}</p>
                        </div>
                        {/* 점수 표시/입력 */}
                        {saved && !isEdit ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-800">{saved.gross}타</p>
                              <p className="text-[10px] text-slate-400">H {formatHandicap(saved.handicap)}</p>
                            </div>
                            <button onClick={() => {
                              setEditing(member.id);
                              setInputs((p) => ({ ...p, [member.id]: String(saved.gross) }));
                              setHandicapInputs((p) => ({ ...p, [member.id]: String(saved.handicap) }));
                            }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                              <Pencil size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number" min={18} max={200} placeholder="타수"
                              value={inputVal}
                              onChange={(e) => setInputs((p) => ({ ...p, [member.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") submitScore(member.id);
                                if (e.key === "Escape") {
                                  setEditing(null);
                                  setInputs((p) => { const n={...p}; delete n[member.id]; return n; });
                                  setHandicapInputs((p) => { const n={...p}; delete n[member.id]; return n; });
                                }
                              }}
                              className="w-16 border border-green-400 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-400"
                              autoFocus={isEdit}
                            />
                            <input
                              type="number" min={-10} max={54} step={0.1} placeholder="핸디"
                              value={handicapInputVal}
                              onChange={(e) => setHandicapInputs((p) => ({ ...p, [member.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") submitScore(member.id);
                                if (e.key === "Escape") {
                                  setEditing(null);
                                  setInputs((p) => { const n={...p}; delete n[member.id]; return n; });
                                  setHandicapInputs((p) => { const n={...p}; delete n[member.id]; return n; });
                                }
                              }}
                              className="w-16 border border-green-400 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                            <button onClick={() => submitScore(member.id)}
                              disabled={!inputVal || !handicapInputVal}
                              className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors">
                              <Check size={13} />
                            </button>
                            {isEdit && (
                              <button onClick={() => {
                                setEditing(null);
                                setInputs((p) => { const n={...p}; delete n[member.id]; return n; });
                                setHandicapInputs((p) => { const n={...p}; delete n[member.id]; return n; });
                              }}
                                className="text-xs text-slate-400 hover:text-slate-600">취소</button>
                            )}
                          </div>
                        )}
                      </div>
                      {/* 넷 미리보기 */}
                    </div>
                  );
                })}
              </div>
            )}
          </div>}

          {/* 순위 */}
          <div className={cn("card overflow-hidden", !isAdmin && "lg:col-span-2")}>
            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">이 라운딩 순위</h2>
                <p className="text-xs text-slate-400 mt-0.5">핸디캡 대비 성과 기준</p>
              </div>
              {roundRanking.length > 0 && (
                <span className="text-xs bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded-full">
                  {roundRanking.length}명 완료
                </span>
              )}
            </div>

            {roundRanking.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-sm">
                <Trophy size={32} className="mx-auto mb-3 text-slate-200" />
                점수를 입력하면 순위가 표시됩니다
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {roundRanking.map((entry, idx) => {
                  const rank = idx + 1;
                  const style = RANK_STYLE[idx];
                  return (
                    <div key={entry.memberId}
                      className={cn("flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors",
                        rank === 1 && "bg-yellow-50/40")}>
                      {/* 순위 아이콘 */}
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                        style ? style.bg : "bg-slate-50")}>
                        {style ? <style.Icon size={15} className={style.color} />
                          : <span className="text-xs font-bold text-slate-400">{rank}</span>}
                      </div>
                      {/* 아바타 */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: "linear-gradient(135deg, #0B4619, #1A9438)" }}>
                        {entry.member!.avatarInitials}
                      </div>
                      {/* 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-800">{entry.member!.name}</p>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", getHandicapBadgeColor(entry.handicap))}>
                            H{formatHandicap(entry.handicap)}
                          </span>
                        </div>
                      </div>
                      {/* 핸디캡 대비 성과 */}
                      {(() => {
                        const p = getPerformance(entry.net);
                        return (
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-lg">{p.emoji}</span>
                              <span className={cn("text-xl font-black tabular-nums", p.color)}>{fmtDiff(p.diff)}</span>
                            </div>
                            <p className={cn("text-[10px] font-semibold", p.color)}>{p.label}</p>
                          </div>
                        );
                      })()}
                      {/* 삭제 */}
                      <button onClick={() => deleteScore(entry.memberId)}
                        className="text-[10px] text-slate-300 hover:text-red-400 transition-colors ml-1">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 통산 순위 탭 ── */}
      {activeTab === "alltime" && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="text-sm font-semibold text-slate-800">통산 순위</h2>
            <p className="text-xs text-slate-400 mt-0.5">핸디캡 대비 평균 성과 기준</p>
          </div>

          {allTimeRanking.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <BarChart3 size={32} className="mx-auto mb-3 text-slate-200" />
              아직 기록된 점수가 없습니다
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {["순위", "회원", "평균 핸디캡", "라운딩 수", "평균타수", "평균 성과", "최고 성과"].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pagedAlltime.map((entry, idx) => {
                      const rank = (alltimePage - 1) * ALLTIME_PER_PAGE + idx + 1;
                      const style = RANK_STYLE[rank - 1];
                      // 이 회원의 최저 넷 스코어
                      const memberNets = Object.values(allScores)
                        .map((rs) => rs[entry.member.id]?.net)
                        .filter((n): n is number => n !== undefined);
                      const bestPerf = memberNets.length > 0 ? getPerformance(Math.min(...memberNets)) : null;
                      const avgPerf  = getPerformance(Math.round(entry.avgNet));

                      return (
                        <tr key={entry.member.id} className={cn("table-row-hover", rank === 1 && "bg-yellow-50/30")}>
                          <td className="px-4 py-3.5">
                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", style ? style.bg : "bg-slate-50")}>
                              {style ? <style.Icon size={13} className={style.color} />
                                : <span className="text-xs font-bold text-slate-400">{rank}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                style={{ background: "linear-gradient(135deg, #0B4619, #1A9438)" }}>
                                {entry.member.avatarInitials}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{entry.member.name}</p>
                                <p className="text-xs text-slate-400">{entry.member.department}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", getHandicapBadgeColor(entry.avgHandicap))}>
                              {formatHandicap(Math.round(entry.avgHandicap * 10) / 10)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              <CalendarDays size={12} className="text-slate-400" />
                              <span className="font-semibold text-slate-700">{entry.count}회</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-700 tabular-nums">
                            {entry.avgGross.toFixed(1)}타
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              <span className="text-base">{avgPerf.emoji}</span>
                              <span className={cn("font-black tabular-nums", avgPerf.color)}>{fmtDiff(avgPerf.diff)}</span>
                              <span className={cn("text-[10px] font-semibold", avgPerf.color)}>{avgPerf.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {bestPerf ? (
                              <div className="flex items-center gap-1">
                                <span className="text-base">{bestPerf.emoji}</span>
                                <span className={cn("font-bold tabular-nums", bestPerf.color)}>{fmtDiff(bestPerf.diff)}</span>
                              </div>
                            ) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {alltimeTotalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-50">
                  <span className="text-xs text-slate-400">
                    {(alltimePage - 1) * ALLTIME_PER_PAGE + 1}–{Math.min(alltimePage * ALLTIME_PER_PAGE, allTimeRanking.length)} / {allTimeRanking.length}명
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAlltimePage((p) => Math.max(1, p - 1))}
                      disabled={alltimePage === 1}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: alltimeTotalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setAlltimePage(p)}
                        className={cn(
                          "w-7 h-7 rounded-lg text-xs font-medium transition-colors",
                          alltimePage === p ? "text-white" : "hover:bg-slate-100 text-slate-500"
                        )}
                        style={alltimePage === p ? { background: "#0B4619" } : {}}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setAlltimePage((p) => Math.min(alltimeTotalPages, p + 1))}
                      disabled={alltimePage === alltimeTotalPages}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* 통산 통계 요약 */}
              <div className="px-5 py-4 border-t border-slate-50 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-800">{allTimeRanking.length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">참여 회원</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-800">
                    {Object.keys(allScores).filter((id) => Object.keys(allScores[id]).length > 0).length}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">기록된 라운딩</p>
                </div>
                <div className="text-center">
                  {allTimeRanking[0] ? (() => {
                    const p = getPerformance(allTimeRanking[0].avgNet);
                    return (
                      <>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xl">{p.emoji}</span>
                          <span className={cn("text-2xl font-black", p.color)}>{fmtDiff(p.diff)}</span>
                        </div>
                        <p className={cn("text-xs font-semibold mt-0.5", p.color)}>{p.label}</p>
                      </>
                    );
                  })() : <p className="text-2xl font-black text-slate-800">-</p>}
                  <p className="text-xs text-slate-400 mt-0.5">최고 성과</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
