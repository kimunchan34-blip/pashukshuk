"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar, MapPin, Clock, Users, Shuffle,
  CheckCircle, XCircle, AlertCircle, Plus,
  Pencil, Trash2, UserPlus, X, ChevronDown, ChevronRight,
} from "lucide-react";
import { MOCK_ROUNDINGS } from "@/lib/mock-data";
import { GroupAssignment } from "@/components/roundings/GroupAssignment";
import { AddRoundingModal } from "@/components/roundings/AddRoundingModal";
import type { Rounding, AttendanceStatus, GroupMember, Member } from "@/types";
import { formatDate, getStatusLabel, cn } from "@/lib/utils";
import * as db from "@/lib/db";
import { useRole } from "@/contexts/RoleContext";

const STATUS_BADGE: Record<string, string> = {
  scheduled:   "bg-blue-100 text-blue-700",
  in_progress: "bg-green-100 text-green-700",
  completed:   "bg-slate-100 text-slate-600",
  cancelled:   "bg-red-100 text-red-600",
};

const ATTENDANCE_NEXT: Record<AttendanceStatus, AttendanceStatus> = {
  attending: "absent",
  absent:    "waitlist",
  waitlist:  "attending",
};

const ATTENDANCE_ICON = {
  attending: CheckCircle,
  absent:    XCircle,
  waitlist:  AlertCircle,
};

const ATTENDANCE_COLOR: Record<AttendanceStatus, string> = {
  attending: "text-green-600",
  absent:    "text-red-400",
  waitlist:  "text-amber-500",
};

const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  attending: "참석",
  absent:    "불참",
  waitlist:  "대기",
};

export default function RoundingsPage() {
  const [roundings, setRoundings]         = useState<Rounding[]>([]);
  const [members, setMembers]             = useState<Member[]>([]);
  const [selected, setSelected]           = useState<Rounding | null>(null);
  const [showGrouping, setShowGrouping]   = useState(false);
  const [addModalOpen, setAddModalOpen]   = useState(false);
  const [editingRounding, setEditingRounding] = useState<Rounding | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { isAdmin } = useRole();
  const [showAddMember, setShowAddMember] = useState(false);
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());
  const addMemberRef = useRef<HTMLDivElement>(null);

  const toggleYear = (year: string) =>
    setCollapsedYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });

  // 연도별 그룹 (내림차순)
  const byYear = useMemo(() => {
    const map = new Map<string, Rounding[]>();
    for (const r of [...roundings].sort((a, b) => b.date.localeCompare(a.date))) {
      const y = r.date.slice(0, 4);
      map.set(y, [...(map.get(y) ?? []), r]);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [roundings]);

  useEffect(() => {
    Promise.all([db.getRoundings(), db.getMembers()])
      .then(([r, m]) => {
        setRoundings(r);
        setMembers(m);
        if (r.length > 0) setSelected(r[0]);
      })
      .catch(console.error);
  }, []);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addMemberRef.current && !addMemberRef.current.contains(e.target as Node))
        setShowAddMember(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── 라운딩 CRUD ─────────────────────────────────────────────── */

  const handleAddRounding = (r: Rounding) => {
    setRoundings((prev) => [r, ...prev]);
    setSelected(r);
    db.upsertRounding(r).catch(console.error);
  };

  const handleEditRounding = (r: Rounding) => {
    setRoundings((prev) => prev.map((x) => x.id === r.id ? r : x));
    if (selected?.id === r.id) setSelected(r);
    setEditingRounding(null);
    setAddModalOpen(false);
    db.upsertRounding(r).catch(console.error);
  };

  const handleDeleteRounding = (id: string) => {
    setRoundings((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      if (selected?.id === id) setSelected(updated[0] ?? null);
      return updated;
    });
    db.deleteRounding(id).catch(console.error);
    setDeleteConfirmId(null);
  };

  /* ── 참석자 관리 ─────────────────────────────────────────────── */

  const updateSelected = (next: Rounding) => {
    setSelected(next);
    setRoundings((prev) => prev.map((r) => r.id === next.id ? next : r));
    db.upsertRounding(next).catch(console.error);
  };

  const cycleAttendance = (memberId: string) => {
    if (!selected) return;
    const next: Rounding = {
      ...selected,
      attendances: selected.attendances.map((a) =>
        a.memberId === memberId
          ? { ...a, status: ATTENDANCE_NEXT[a.status] }
          : a
      ),
    };
    updateSelected(next);
  };

  const removeAttendance = (memberId: string) => {
    if (!selected) return;
    const next: Rounding = {
      ...selected,
      attendances: selected.attendances.filter((a) => a.memberId !== memberId),
    };
    updateSelected(next);
  };

  const addAttendance = (memberId: string) => {
    if (!selected) return;
    if (selected.attendances.some((a) => a.memberId === memberId)) return;
    const next: Rounding = {
      ...selected,
      attendances: [
        ...selected.attendances,
        { memberId, status: "attending", registeredAt: new Date().toISOString() },
      ],
    };
    updateSelected(next);
    setShowAddMember(false);
  };

  /* ── 파생 데이터 ─────────────────────────────────────────────── */

  const attendingMembers: GroupMember[] = (selected?.attendances ?? [])
    .filter((a) => a.status === "attending")
    .map((a) => {
      const m = members.find((x) => x.id === a.memberId);
      return m ? { id: m.id, name: m.name, department: m.department, handicap: m.handicap, avatarInitials: m.avatarInitials } : null;
    })
    .filter(Boolean) as GroupMember[];

  const nonAttendees = members.filter(
    (m) => m.status === "active" && !(selected?.attendances ?? []).some((a) => a.memberId === m.id)
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">라운딩 관리</h1>
          <p className="text-sm text-slate-400 mt-0.5">일정 등록 · 참석 신청 · 조편성</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingRounding(null); setAddModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ background: "#0B4619" }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">라운딩 등록</span>
          </button>
        )}
      </div>

      {!selected && roundings.length === 0 && (
        <div className="card py-16 text-center text-slate-400 text-sm">데이터를 불러오는 중...</div>
      )}

      {selected && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 왼쪽: 라운딩 목록 (연도별 그룹) */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">라운딩 목록</h2>
          {byYear.map(([year, list]) => {
            const collapsed = collapsedYears.has(year);
            return (
              <div key={year}>
                {/* 연도 헤더 */}
                <button
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    {collapsed
                      ? <ChevronRight size={13} className="text-slate-400" />
                      : <ChevronDown  size={13} className="text-slate-500" />}
                    <span className="text-xs font-bold text-slate-500">{year}년</span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{list.length}회</span>
                  </div>
                </button>

                {/* 해당 연도 라운딩 카드들 */}
                {!collapsed && (
                  <div className="space-y-2 mt-1 ml-1">
                    {list.map((rounding) => (
                      <div key={rounding.id} className="relative group">
                        <button
                          onClick={() => { setSelected(rounding); setShowGrouping(false); setDeleteConfirmId(null); }}
                          className={cn(
                            "w-full text-left card p-3.5 transition-all hover:shadow-md",
                            selected.id === rounding.id && "ring-2 ring-green-500 shadow-md"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{rounding.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                <MapPin size={10} /> {rounding.courseName}
                              </p>
                            </div>
                            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0", STATUS_BADGE[rounding.status])}>
                              {getStatusLabel(rounding.status)}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Calendar size={10} /> {rounding.date}</span>
                            <span className="flex items-center gap-1"><Clock size={10} /> {rounding.teeTime}</span>
                          </div>
                        </button>
                        {/* 수정/삭제 버튼 */}
                        {isAdmin && (
                          <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 bg-white/90 rounded-lg px-1.5 py-1 shadow-sm border border-slate-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingRounding(rounding); setAddModalOpen(true); }}
                              className="p-1 rounded hover:bg-green-50 text-green-700" title="수정"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(rounding.id); }}
                              className="p-1 rounded hover:bg-red-50 text-red-400" title="삭제"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                        {deleteConfirmId === rounding.id && (
                          <div className="mt-1 flex items-center justify-end gap-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs">
                            <span className="text-slate-500">삭제할까요?</span>
                            <button onClick={() => handleDeleteRounding(rounding.id)} className="text-red-600 font-semibold">확인</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="text-slate-400">취소</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 오른쪽: 상세 + 참석자 + 조편성 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 라운딩 상세 */}
          <div
            className="rounded-2xl p-5 text-white relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0B4619, #1A9438)" }}
          >
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />
            <div className="flex items-start justify-between relative">
              <h3 className="text-lg font-bold">{selected.title}</h3>
              {isAdmin && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditingRounding(selected); setAddModalOpen(true); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors"
                  >
                    <Pencil size={12} /> 수정
                  </button>
                </div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 relative">
              {[
                { icon: MapPin,   label: "코스",   value: selected.courseName },
                { icon: Calendar, label: "날짜",   value: formatDate(selected.date) },
                { icon: Clock,    label: "티오프", value: selected.teeTime },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white/10 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-white/60 text-xs mb-1">
                    <Icon size={11} /> {label}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 참석 현황 */}
          <div className="card">
            <div className="card-header border-b border-slate-50 flex items-center justify-between pb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">참석 현황</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  참석 {selected.attendances.filter((a) => a.status === "attending").length} ·{" "}
                  불참 {selected.attendances.filter((a) => a.status === "absent").length} ·{" "}
                  대기 {selected.attendances.filter((a) => a.status === "waitlist").length}명
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* 참석자 추가 */}
                {isAdmin && <div className="relative" ref={addMemberRef}>
                  <button
                    onClick={() => setShowAddMember((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <UserPlus size={13} /> 추가
                  </button>
                  {showAddMember && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                      {nonAttendees.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">추가할 회원이 없습니다</p>
                      ) : (
                        <ul className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                          {nonAttendees.map((m) => (
                            <li key={m.id}>
                              <button
                                onClick={() => addAttendance(m.id)}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-green-50 transition-colors text-left"
                              >
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                  style={{ background: "linear-gradient(135deg, #0B4619, #1A9438)" }}>
                                  {m.avatarInitials}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-slate-800">{m.name}</p>
                                  <p className="text-[10px] text-slate-400">{m.department}</p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                }

                {/* 조편성 버튼 */}
                {selected.status === "scheduled" && attendingMembers.length >= 4 && (
                  <button
                    onClick={() => setShowGrouping(!showGrouping)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                      showGrouping ? "text-white" : "bg-green-50 text-green-700 hover:bg-green-100"
                    )}
                    style={showGrouping ? { background: "#0B4619" } : {}}
                  >
                    <Shuffle size={13} />
                    {showGrouping ? "참석자 보기" : "조편성 시작"}
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              {!showGrouping ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selected.attendances.map((attendance) => {
                    const member = members.find((m) => m.id === attendance.memberId);
                    if (!member) return null;
                    const Icon = ATTENDANCE_ICON[attendance.status];
                    return (
                      <div
                        key={attendance.memberId}
                        className="group flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: "linear-gradient(135deg, #0B4619, #1A9438)" }}
                        >
                          {member.avatarInitials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{member.name}</p>
                          <p className="text-xs text-slate-400">{member.department}</p>
                        </div>
                        {/* 상태 토글 버튼 */}
                        <button
                          onClick={() => cycleAttendance(member.id)}
                          className={cn("flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white transition-colors text-xs font-medium", ATTENDANCE_COLOR[attendance.status])}
                          title="클릭하여 상태 변경"
                        >
                          <Icon size={14} />
                          <span className="hidden sm:inline">{ATTENDANCE_LABEL[attendance.status]}</span>
                        </button>
                        {/* 제거 버튼 */}
                        <button
                          onClick={() => removeAttendance(member.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-red-400 transition-all"
                          title="참석자 제거"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                  {selected.attendances.length === 0 && (
                    <p className="col-span-2 text-center text-sm text-slate-400 py-8">
                      참석자가 없습니다. 추가 버튼으로 참석자를 등록하세요.
                    </p>
                  )}
                </div>
              ) : (
                <GroupAssignment attendingMembers={attendingMembers} />
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      <AddRoundingModal
        open={addModalOpen}
        onClose={() => { setAddModalOpen(false); setEditingRounding(null); }}
        onAdd={handleAddRounding}
        onEdit={handleEditRounding}
        editRounding={editingRounding}
      />
    </div>
  );
}
