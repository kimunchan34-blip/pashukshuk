"use client";

import { useState, useEffect } from "react";
import { Search, UserPlus, Filter, ChevronUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { Member } from "@/types";
import { AddMemberModal } from "@/components/members/AddMemberModal";
import * as db from "@/lib/db";
import { useRole } from "@/contexts/RoleContext";
import {
  cn, formatDate, formatHandicap, getHandicapBadgeColor, getStatusLabel,
} from "@/lib/utils";

type SortKey = "name" | "handicap" | "joinedAt" | "department";
type SortDir = "asc" | "desc";

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-500",
  pending:  "bg-amber-100 text-amber-700",
};

export default function MembersPage() {
  const [search, setSearch]           = useState("");
  const [sortKey, setSortKey]         = useState<SortKey>("handicap");
  const [sortDir, setSortDir]         = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [editHandicap, setEditHandicap] = useState<string>("0");
  const [members, setMembers]         = useState<Member[]>([]);
  const { isAdmin } = useRole();
  const [loading, setLoading]         = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    db.getMembers()
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = members
    .filter((m) =>
      (statusFilter === "all" || m.status === statusFilter) &&
      (m.name.includes(search) || m.department.includes(search) || m.position.includes(search))
    )
    .sort((a, b) => {
      let v = 0;
      if (sortKey === "name")       v = a.name.localeCompare(b.name, "ko");
      else if (sortKey === "handicap")  v = a.handicap - b.handicap;
      else if (sortKey === "joinedAt")  v = a.joinedAt.localeCompare(b.joinedAt);
      else if (sortKey === "department") v = a.department.localeCompare(b.department, "ko");
      return sortDir === "asc" ? v : -v;
    });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const startInlineEdit = (member: Member) => {
    setInlineEditId(member.id);
    setEditHandicap(String(member.handicap));
  };

  const saveHandicap = (id: string) => {
    const parsed = parseFloat(editHandicap);
    if (isNaN(parsed)) { setInlineEditId(null); return; }
    const rounded = Math.round(parsed * 10) / 10;
    setMembers((prev) => prev.map((m) => {
      if (m.id !== id) return m;
      const updated = { ...m, handicap: rounded };
      db.upsertMember(updated).catch(console.error);
      return updated;
    }));
    setInlineEditId(null);
  };

  const handleEdit   = (member: Member) => { setEditingMember(member); setAddModalOpen(true); };
  const handleDelete = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    db.deleteMember(id).catch(console.error);
    setDeleteConfirmId(null);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
      : <ChevronUp size={12} className="text-slate-200" />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">회원 관리</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            총 {members.length}명 · 활동 {members.filter((m) => m.status === "active").length}명
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingMember(null); setAddModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ background: "#0B4619" }}
          >
            <UserPlus size={15} />
            <span className="hidden sm:inline">회원 추가</span>
          </button>
        )}
      </div>

      {/* 검색 & 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="이름, 부서, 직급으로 검색..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          {(["all", "active", "pending", "inactive"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-2 rounded-xl text-xs font-medium transition-all",
                statusFilter === s ? "text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:border-green-300")}
              style={statusFilter === s ? { background: "#0B4619" } : {}}>
              {s === "all" ? "전체" : getStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">데이터를 불러오는 중...</div>
        ) : (
          <>
            {/* 데스크탑 */}
            <div className="hidden md:block overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {([["이름","name"],["부서/직책","department"],["핸디캡","handicap"],["가입일","joinedAt"],["상태",null],["관리",null]] as [string, SortKey|null][]).map(([label, key]) => (
                      <th key={label} onClick={() => key && handleSort(key)}
                        className={cn("text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5", key && "cursor-pointer hover:text-slate-700 select-none")}>
                        <span className="flex items-center gap-1">{label}{key && <SortIcon k={key} />}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((member) => (
                    <tr key={member.id} className="table-row-hover">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: "linear-gradient(135deg, #0B4619, #1A9438)" }}>
                            {member.avatarInitials}
                          </div>
                          <span className="font-medium text-slate-800">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-slate-700">{member.department}</p>
                        <p className="text-xs text-slate-400">{member.position}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {inlineEditId === member.id ? (
                          <div className="flex items-center gap-2">
                            <input type="text" inputMode="decimal" value={editHandicap}
                              onChange={(e) => { const r = e.target.value; if (r===""||r==="-"||/^-?\d{0,2}(\.\d?)?$/.test(r)) setEditHandicap(r); }}
                              onKeyDown={(e) => { if(e.key==="Enter") saveHandicap(member.id); if(e.key==="Escape") setInlineEditId(null); }}
                              className="w-20 border border-green-400 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-400" autoFocus />
                            <button onClick={() => saveHandicap(member.id)} className="text-xs text-green-700 font-semibold">저장</button>
                            <button onClick={() => setInlineEditId(null)} className="text-xs text-slate-400">취소</button>
                          </div>
                        ) : (
                          <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full cursor-pointer hover:opacity-80", getHandicapBadgeColor(member.handicap))}
                            onClick={() => startInlineEdit(member)} title="클릭하여 핸디캡 수정">
                            {formatHandicap(member.handicap)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">{formatDate(member.joinedAt)}</td>
                      <td className="px-5 py-3.5">
                        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", STATUS_COLORS[member.status])}>
                          {getStatusLabel(member.status)}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5">
                          {deleteConfirmId === member.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">삭제할까요?</span>
                              <button onClick={() => handleDelete(member.id)} className="text-xs text-red-600 font-semibold hover:text-red-700">확인</button>
                              <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-slate-400">취소</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button onClick={() => handleEdit(member)} className="flex items-center gap-1 text-xs text-green-700 font-medium hover:text-green-800">
                                <Pencil size={12} /> 수정
                              </button>
                              <button onClick={() => setDeleteConfirmId(member.id)} className="flex items-center gap-1 text-xs text-red-400 font-medium hover:text-red-600">
                                <Trash2 size={12} /> 삭제
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일 */}
            <div className="md:hidden divide-y divide-slate-50">
              {filtered.map((member) => (
                <div key={member.id} className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: "linear-gradient(135deg, #0B4619, #1A9438)" }}>
                      {member.avatarInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 text-sm">{member.name}</p>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", STATUS_COLORS[member.status])}>
                          {getStatusLabel(member.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{member.department} · {member.position}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", getHandicapBadgeColor(member.handicap))}>
                        {formatHandicap(member.handicap)}
                      </span>
                      <button onClick={() => handleEdit(member)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-700"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteConfirmId(member.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {deleteConfirmId === member.id && (
                    <div className="mt-2 flex items-center justify-end gap-3 bg-red-50 rounded-xl px-3 py-2">
                      <span className="text-xs text-slate-500">정말 삭제할까요?</span>
                      <button onClick={() => handleDelete(member.id)} className="text-xs text-red-600 font-semibold">확인</button>
                      <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-slate-400">취소</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filtered.length === 0 && !loading && (
              <div className="py-16 text-center text-slate-400 text-sm">검색 결과가 없습니다.</div>
            )}
          </>
        )}
      </div>

      <AddMemberModal
        open={addModalOpen}
        onClose={() => { setAddModalOpen(false); setEditingMember(null); }}
        onAdd={(newMember) => {
          setMembers((prev) => [newMember, ...prev]);
          db.upsertMember(newMember).catch(console.error);
        }}
        onEdit={(updated) => {
          setMembers((prev) => prev.map((m) => m.id === updated.id ? updated : m));
          db.upsertMember(updated).catch(console.error);
        }}
        editMember={editingMember}
      />
    </div>
  );
}
