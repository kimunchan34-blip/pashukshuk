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
  maxParticipants: 12,
  fee: 150000,
};

export function AddRoundingModal({ open, onClose, onAdd, onEdit, editRounding }: Props) {
  const isEdit = !!editRounding;
  const [form, setForm] = useState(INIT);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof INIT, string>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editRounding) {
      setForm({
        title: editRounding.title,
        courseName: editRounding.courseName,
        date: editRounding.date,
        teeTime: editRounding.teeTime,
        maxParticipants: editRounding.maxParticipants,
        fee: editRounding.fee,
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
    if (!form.title.trim()) e.title = "라운딩 명칭을 입력해주세요";
    if (!form.courseName.trim()) e.courseName = "골프장을 입력해주세요";
    if (!form.date) e.date = "날짜를 선택해주세요";
    if (form.maxParticipants < 4) e.maxParticipants = "최소 4명 이상이어야 합니다";
    if (form.fee < 0) e.fee = "참가비는 0원 이상이어야 합니다";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));

    if (isEdit && editRounding && onEdit) {
      onEdit({ ...editRounding, ...form });
    } else {
      onAdd({
        id: `r${Date.now()}`,
        courseId: `c${Date.now()}`,
        status: "scheduled",
        attendances: [],
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

        <div className="grid grid-cols-2 gap-3">
          <FormField label="최대 참가 인원" error={errors.maxParticipants}>
            <Input
              type="number" min={4} max={64} step={4}
              value={form.maxParticipants}
              onChange={(e) => set("maxParticipants", Number(e.target.value))}
            />
          </FormField>
          <FormField label="참가비 (원)" error={errors.fee}>
            <Input
              type="number" min={0} step={10000}
              value={form.fee}
              onChange={(e) => set("fee", Number(e.target.value))}
            />
          </FormField>
        </div>

        {isEdit && (
          <FormField label="진행 상태">
            <select
              value={editRounding?.status ?? "scheduled"}
              onChange={(e) => {
                if (onEdit && editRounding)
                  onEdit({ ...editRounding, ...form, status: e.target.value as Rounding["status"] });
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="scheduled">예정</option>
              <option value="in_progress">진행중</option>
              <option value="completed">완료</option>
              <option value="cancelled">취소</option>
            </select>
          </FormField>
        )}

        {form.date && (
          <div className="bg-green-50 rounded-xl px-4 py-3 text-xs text-slate-600 space-y-0.5">
            <p className="font-semibold text-green-800">{isEdit ? "수정 예정 라운딩" : "등록 예정 라운딩"}</p>
            <p>📅 {form.date.replace(/-/g, ".")} {form.teeTime} 티오프</p>
            <p>👥 최대 {form.maxParticipants}명 · 참가비 {Number(form.fee).toLocaleString()}원</p>
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
