"use client";

import { useState, useEffect } from "react";
import { Modal, FormField, Input } from "@/components/ui/Modal";
import type { Rounding } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (rounding: Rounding) => void;
  onEdit?: (rounding: Rounding) => void;
  editRounding?: Rounding | null;
}

const INIT = {
  title: "",
  courseName: "",
  date: "",
  teeTime: "07:30",
};

/** 날짜·티오프 시간을 현재 시각과 비교해 상태 자동 결정 */
function calcStatus(date: string, teeTime: string): Rounding["status"] {
  if (!date) return "scheduled";
  const now = new Date();
  const teeDateTime = new Date(`${date}T${teeTime || "00:00"}`);
  const roundingDay = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (roundingDay > today) return "scheduled";          // 미래
  if (roundingDay.getTime() === today.getTime()) {
    return teeDateTime > now ? "scheduled" : "in_progress"; // 오늘: 티오프 전이면 예정, 후면 진행중
  }
  return "completed";                                   // 과거
}

const STATUS_LABEL: Record<Rounding["status"], string> = {
  scheduled:   "예정",
  in_progress: "진행중",
  completed:   "완료",
  cancelled:   "취소",
};

const STATUS_COLOR: Record<Rounding["status"], string> = {
  scheduled:   "bg-blue-100 text-blue-700",
  in_progress: "bg-green-100 text-green-700",
  completed:   "bg-slate-100 text-slate-600",
  cancelled:   "bg-red-100 text-red-600",
};

export function AddRoundingModal({ open, onClose, onAdd, onEdit, editRounding }: Props) {
  const isEdit = !!editRounding;
  const [form, setForm]     = useState(INIT);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof INIT, string>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editRounding) {
      setForm({
        title:      editRounding.title,
        courseName: editRounding.courseName,
        date:       editRounding.date,
        teeTime:    editRounding.teeTime,
      });
    } else {
      setForm(INIT);
    }
    setErrors({});
  }, [editRounding, open]);

  const set = <K extends keyof typeof INIT>(k: K, v: typeof INIT[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.title.trim())      e.title      = "라운딩 명칭을 입력해주세요";
    if (!form.courseName.trim()) e.courseName = "골프장을 입력해주세요";
    if (!form.date)              e.date       = "날짜를 선택해주세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const autoStatus = calcStatus(form.date, form.teeTime);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));

    if (isEdit && editRounding && onEdit) {
      onEdit({ ...editRounding, ...form, status: autoStatus });
    } else {
      onAdd({
        id:              `r${Date.now()}`,
        courseId:        `c${Date.now()}`,
        maxParticipants: 99,
        fee:             0,
        status:          autoStatus,
        attendances:     [],
        ...form,
      });
    }

    setForm(INIT);
    setErrors({});
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "라운딩 수정" : "라운딩 일정 등록"}
      description={isEdit ? "라운딩 정보를 수정합니다" : "새로운 라운딩 일정을 추가합니다"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="라운딩 명칭" required error={errors.title}>
          <Input
            placeholder="예: 7월 정기 라운딩"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </FormField>

        <FormField label="골프장(코스명)" required error={errors.courseName}>
          <Input
            placeholder="예: 남서울 컨트리클럽"
            value={form.courseName}
            onChange={(e) => set("courseName", e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="날짜" required error={errors.date}>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </FormField>
          <FormField label="티오프 시간">
            <Input
              type="time"
              value={form.teeTime}
              onChange={(e) => set("teeTime", e.target.value)}
            />
          </FormField>
        </div>

        {/* 자동 계산된 진행 상태 미리보기 */}
        {form.date && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-slate-500 space-y-0.5">
              <p className="font-semibold text-slate-700">
                {isEdit ? "수정 예정 라운딩" : "등록 예정 라운딩"}
              </p>
              <p>📅 {form.date.replace(/-/g, ".")} {form.teeTime} 티오프</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_COLOR[autoStatus]}`}>
              {STATUS_LABEL[autoStatus]} (자동)
            </span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
            취소
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: "#0B4619" }}>
            {loading ? (isEdit ? "저장 중..." : "등록 중...") : (isEdit ? "저장" : "라운딩 등록")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
