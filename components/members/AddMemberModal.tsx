"use client";

import { useState, useEffect } from "react";
import { Modal, FormField, Select } from "@/components/ui/Modal";
import type { Member } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (member: Member) => void;
  onEdit?: (member: Member) => void;
  editMember?: Member | null;
}

const ROLES = ["회장", "총무", "일반"];

const INIT_FORM = {
  name: "", department: "", position: ROLES[2],
  status: "active" as Member["status"],
};

function parseHandicap(str: string): number | null {
  if (str === "" || str === "-" || str === "-." || str === ".") return null;
  const n = parseFloat(str);
  if (isNaN(n)) return null;
  return Math.round(n * 10) / 10;
}

const HANDICAP_RE = /^-?\d{0,2}(\.\d?)?$/;

const inputCls =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-shadow";

export function AddMemberModal({ open, onClose, onAdd, onEdit, editMember }: Props) {
  const isEdit = !!editMember;

  const [form, setForm] = useState(INIT_FORM);
  const [handicapStr, setHandicapStr] = useState("18");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editMember) {
      setForm({
        name:       editMember.name,
        department: editMember.department,
        position:   editMember.position,
        status:     editMember.status,
      });
      setHandicapStr(String(editMember.handicap));
    } else {
      setForm(INIT_FORM);
      setHandicapStr("18");
    }
    setErrors({});
  }, [editMember, open]);

  const setField = <K extends keyof typeof INIT_FORM>(k: K, v: typeof INIT_FORM[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleHandicapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw === "-" || HANDICAP_RE.test(raw)) {
      setHandicapStr(raw);
      setErrors((prev) => ({ ...prev, handicap: "" }));
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "이름을 입력해주세요";
    const hc = parseHandicap(handicapStr);
    if (hc === null) e.handicap = "올바른 숫자를 입력해주세요";
    else if (hc < -10 || hc > 54) e.handicap = "-10 ~ 54 사이 값을 입력해주세요";
    setErrors(e);
    return Object.keys(e).filter((k) => e[k]).length === 0;
  };

  const handleClose = () => {
    setForm(INIT_FORM);
    setHandicapStr("18");
    setErrors({});
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    const handicap = parseHandicap(handicapStr) ?? 18;

    if (isEdit && editMember && onEdit) {
      onEdit({
        ...editMember,
        ...form,
        handicap,
        phone: editMember.phone ?? "",
        email: editMember.email ?? "",
        avatarInitials: form.name.slice(0, 2),
      });
    } else {
      onAdd({
        id: `m${Date.now()}`,
        ...form,
        handicap,
        phone: "",
        email: "",
        joinedAt: new Date().toISOString().split("T")[0],
        avatarInitials: form.name.slice(0, 2),
      });
    }

    setLoading(false);
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? "회원 정보 수정" : "신규 회원 등록"}
      description={isEdit ? "수정할 정보를 변경 후 저장해주세요" : "동호회 회원 정보를 입력해주세요"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 이름 / 부서 */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="이름" required error={errors.name}>
            <input
              className={cn(inputCls, errors.name && "border-red-400 focus:ring-red-400")}
              placeholder="홍길동"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </FormField>
          <FormField label="부서">
            <input
              className={inputCls}
              placeholder="예: 영업팀"
              value={form.department}
              onChange={(e) => setField("department", e.target.value)}
            />
          </FormField>
        </div>

        {/* 직책 / 핸디캡 */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="직책">
            <Select value={form.position} onChange={(e) => setField("position", e.target.value)}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </Select>
          </FormField>
          <FormField label="핸디캡" required error={errors.handicap}>
            <input
              className={cn(inputCls, errors.handicap && "border-red-400 focus:ring-red-400")}
              type="text"
              inputMode="decimal"
              placeholder="-10 ~ 54"
              value={handicapStr}
              onChange={handleHandicapChange}
            />
          </FormField>
        </div>

        {/* 가입 상태 */}
        <FormField label="가입 상태">
          <Select value={form.status} onChange={(e) => setField("status", e.target.value as Member["status"])}>
            <option value="active">활동</option>
            <option value="pending">대기</option>
            <option value="inactive">탈퇴</option>
          </Select>
        </FormField>

        {/* 액션 버튼 */}
        <div className="flex gap-2 pt-1">
          <button
            type="button" onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: "#0B4619" }}
          >
            {loading ? (isEdit ? "저장 중..." : "등록 중...") : (isEdit ? "저장" : "회원 등록")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
