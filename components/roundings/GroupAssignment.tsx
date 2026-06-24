"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Shuffle, GripVertical, Users, BarChart3, RefreshCw } from "lucide-react";
import type { GroupMember, RoundingGroup } from "@/types";
import {
  assignGroupsByHandicap,
  evaluateGroupBalance,
  moveMemberBetweenGroups,
} from "@/lib/algorithms/group-assignment";
import { formatHandicap, getHandicapBadgeColor, cn } from "@/lib/utils";

// ─── Draggable Member Card ────────────────────────────────────────────────────

interface MemberCardProps {
  member: GroupMember;
  isDragging?: boolean;
}

function MemberCard({ member, isDragging }: MemberCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-slate-100",
        "shadow-sm cursor-grab active:cursor-grabbing select-none",
        "hover:border-green-200 hover:shadow-md transition-all duration-150",
        isDragging && "opacity-50 shadow-lg border-green-300 scale-105"
      )}
    >
      <GripVertical size={14} className="text-slate-300 shrink-0" />
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ background: "linear-gradient(135deg, #0B4619, #1A9438)" }}
      >
        {member.avatarInitials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{member.name}</p>
        <p className="text-xs text-slate-400 truncate">{member.department}</p>
      </div>
      <span className={cn(
        "text-xs font-bold px-2 py-0.5 rounded-full shrink-0",
        getHandicapBadgeColor(member.handicap)
      )}>
        {formatHandicap(member.handicap)}
      </span>
    </div>
  );
}

// ─── Sortable Member Card (DnD wrapper) ──────────────────────────────────────

function SortableMemberCard({ member, groupId }: { member: GroupMember; groupId: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: member.id,
    data: { type: "member", groupId, member },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MemberCard member={member} isDragging={isDragging} />
    </div>
  );
}

// ─── Group Column ─────────────────────────────────────────────────────────────

interface GroupColumnProps {
  group: RoundingGroup;
  isOver?: boolean;
}

function GroupColumn({ group, isOver }: GroupColumnProps) {
  const avgHandicap =
    group.members.length > 0
      ? (group.members.reduce((s, m) => s + m.handicap, 0) / group.members.length).toFixed(1)
      : "-";

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border-2 transition-all duration-200 min-h-[200px]",
        isOver
          ? "border-green-400 bg-green-50 shadow-md"
          : "border-slate-100 bg-slate-50/60"
      )}
    >
      {/* 조 헤더 */}
      <div
        className="px-4 py-3 rounded-t-xl flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #0B4619, #116A27)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
            <Users size={13} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm">{group.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-white/60 text-xs">평균 H/C</span>
          <span className="text-white font-bold text-sm tabular-nums">{avgHandicap}</span>
        </div>
      </div>

      {/* 멤버 목록 */}
      <SortableContext
        items={group.members.map((m) => m.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 p-3 space-y-2">
          {group.members.map((member) => (
            <SortableMemberCard key={member.id} member={member} groupId={group.id} />
          ))}
          {group.members.length === 0 && (
            <div className="flex items-center justify-center h-16 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-xs text-slate-400">여기로 드래그</p>
            </div>
          )}
        </div>
      </SortableContext>

      {/* 조 인원 요약 */}
      <div className="px-4 pb-3">
        <p className="text-[11px] text-slate-400 text-right">
          {group.members.length}명
          {group.members.length < 4 && (
            <span className="text-amber-500 ml-1">
              (4인 미만)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Main GroupAssignment Component ──────────────────────────────────────────

interface GroupAssignmentProps {
  attendingMembers: GroupMember[];
  initialGroups?: RoundingGroup[];
}

export function GroupAssignment({ attendingMembers, initialGroups }: GroupAssignmentProps) {
  const [groups, setGroups] = useState<RoundingGroup[]>(
    initialGroups ?? assignGroupsByHandicap(attendingMembers)
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  const activeMember = groups
    .flatMap((g) => g.members)
    .find((m) => m.id === activeId);

  const balance = evaluateGroupBalance(groups);

  // 터치 지원을 위한 센서 설정 (모바일 필드 입력 고려)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? String(over.id) : null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverId(null);

      if (!over || active.id === over.id) return;

      const activeGroupId = String(active.data.current?.groupId);
      // over가 멤버 ID일 수도 있고, 그룹 자체일 수도 있음
      const overData = over.data.current;
      const toGroupId = overData?.groupId ?? String(over.id);

      if (activeGroupId === toGroupId) return;

      setGroups((prev) =>
        moveMemberBetweenGroups(prev, String(active.id), activeGroupId, toGroupId)
      );
    },
    []
  );

  const handleReassign = useCallback(() => {
    setGroups(assignGroupsByHandicap(attendingMembers));
  }, [attendingMembers]);

  return (
    <div className="space-y-4">
      {/* 상단 액션 바 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Shuffle size={16} className="text-green-700" />
            자동 조편성 결과
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            핸디캡 기반 균등 배분 · 드래그로 수동 조정 가능
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStats((s) => !s)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
              showStats
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-white border-slate-200 text-slate-600 hover:border-green-200"
            )}
          >
            <BarChart3 size={13} />
            균형도 보기
          </button>
          <button
            onClick={handleReassign}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white transition-all hover:opacity-90"
            style={{ background: "#0B4619" }}
          >
            <RefreshCw size={13} />
            재배분
          </button>
        </div>
      </div>

      {/* 균형도 통계 패널 */}
      {showStats && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm font-semibold text-slate-700">조 편성 균형도</p>
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              balance.standardDeviation < 1
                ? "bg-green-100 text-green-700"
                : balance.standardDeviation < 2
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
            )}>
              표준편차 σ={balance.standardDeviation}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {balance.groupAverages.map(({ label, average }) => (
              <div key={label} className="text-center bg-slate-50 rounded-xl py-3">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-lg font-bold text-green-700 tabular-nums mt-0.5">
                  {average}
                </p>
                <p className="text-[10px] text-slate-400">평균 H/C</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DnD 조편성 그리드 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {groups.map((group) => (
            <GroupColumn
              key={group.id}
              group={group}
              isOver={
                overId !== null &&
                group.members.some((m) => m.id === overId || group.id === overId)
              }
            />
          ))}
        </div>

        {/* 드래그 중인 카드 오버레이 */}
        <DragOverlay>
          {activeMember && (
            <div className="rotate-2 scale-105">
              <MemberCard member={activeMember} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* 하단 안내 */}
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3">
        <span className="text-base">💡</span>
        <span>
          알고리즘: 핸디캡 오름차순 정렬 후 <strong className="text-slate-600">스네이크 드래프트</strong>로 조에 배분합니다.
          카드를 드래그하여 원하는 조로 이동할 수 있습니다.
        </span>
      </div>
    </div>
  );
}
