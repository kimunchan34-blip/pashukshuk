"use client";

import { useState, useEffect } from "react";
import { Modal, FormField, Input, Select } from "@/components/ui/Modal";
import type { Transaction, FeeType, TransactionType } from "@/types";
import type { Member } from "@/types";
import * as db from "@/lib/db";

interface Props {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  onAdd: (tx: Transaction) => void;
  onEdit?: (tx: Transaction) => void;
  editTransaction?: Transaction | null;
}

const FEE_TYPE_LABELS: Record<FeeType, string> = {
  monthly:  "정기 회비",
  rounding: "라운딩 참가비",
  event:    "이벤트/대회",
  other:    "기타",
};

const makeInit = () => ({
  date:        new Date().toISOString().split("T")[0],
  description: "",
  type:        "income" as TransactionType,
  feeType:     "monthly" as FeeType,
  amount:      30000,
  memberId:    "",
});

export function AddTransactionModal({
  open, onClose, currentBalance, onAdd, onEdit, editTransaction,
}: Props) {
  const isEdit = !!editTransaction;
  const [form, setForm]     = useState(makeInit());
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => { db.getMembers().then(setMembers).catch(console.error); }, [open]);

  useEffect(() => {
    if (editTransaction) {
      setForm({
        date:        editTransaction.date,
        description: editTransaction.description,
        type:        editTransaction.type,
        feeType:     editTransaction.feeType,
        amount:      editTransaction.amount,
        memberId:    editTransaction.memberId ?? "",
      });
    } else {
      setForm(makeInit());
    }
    setErrors({});
  }, [editTransaction, open]);

  const set = <K extends keyof ReturnType<typeof makeInit>>(k: K, v: ReturnType<typeof makeInit>[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = "내역을 입력해주세요";
    if (form.amount <= 0)         e.amount      = "금액은 0원보다 커야 합니다";
    if (!form.date)               e.date        = "날짜를 선택해주세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // 잔액 미리보기: 수정 시 원래 거래를 제외한 기준 잔액에서 계산
  const baseBalance = isEdit && editTransaction
    ? currentBalance - (editTransaction.type === "income" ? editTransaction.amount : -editTransaction.amount)
    : currentBalance;
  const previewBalance = baseBalance + (form.type === "income" ? form.amount : -form.amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));

    if (isEdit && editTransaction && onEdit) {
      onEdit({
        ...editTransaction,
        date:        form.date,
        description: form.description,
        type:        form.type,
        feeType:     form.feeType,
        amount:      form.amount,
        memberId:    form.memberId || undefined,
        // balance는 page에서 전체 재계산
        balance:     editTransaction.balance,
      });
    } else {
      onAdd({
        id:          `t${Date.now()}`,
        date:        form.date,
        description: form.description,
        type:        form.type,
        feeType:     form.feeType,
        amount:      form.amount,
        memberId:    form.memberId || undefined,
        balance:     previewBalance,
      });
    }

    setForm(makeInit());
    setErrors({});
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "거래 내역 수정" : "거래 내역 추가"}
      description={isEdit ? "거래 정보를 수정합니다" : "수입 또는 지출을 기록합니다"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 수입/지출 토글 */}
        <div className="flex gap-2">
          {(["income", "expense"] as TransactionType[]).map((t) => (
            <button
              key={t} type="button"
              onClick={() => set("type", t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                form.type === t
                  ? t === "income"
                    ? "bg-green-50 border-green-400 text-green-700"
                    : "bg-red-50 border-red-400 text-red-600"
                  : "border-slate-200 text-slate-400 hover:border-slate-300"
              }`}
            >
              {t === "income" ? "수입 +" : "지출 -"}
            </button>
          ))}
        </div>

        {/* 날짜 */}
        <FormField label="날짜" required error={errors.date}>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </FormField>

        {/* 내역 */}
        <FormField label="내역" required error={errors.description}>
          <Input
            placeholder="예: 6월 정기 회비 - 홍길동"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </FormField>

        {/* 구분 / 금액 */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="구분">
            <Select value={form.feeType} onChange={(e) => set("feeType", e.target.value as FeeType)}>
              {Object.entries(FEE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="금액 (원)" error={errors.amount}>
            <Input
              type="number" min={0} step={1}
              value={form.amount}
              onChange={(e) => set("amount", Number(e.target.value))}
            />
          </FormField>
        </div>

        {/* 회원 연결 (선택) */}
        <FormField label="회원 연결 (선택)">
          <Select value={form.memberId} onChange={(e) => set("memberId", e.target.value)}>
            <option value="">— 선택 안 함 —</option>
            {members.filter((m) => m.status === "active").map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.department})</option>
            ))}
          </Select>
        </FormField>

        {/* 잔액 미리보기 */}
        <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {isEdit ? "수정 후 잔액 예상" : "등록 후 잔액 예상"}
          </span>
          <span className={`text-sm font-bold tabular-nums ${previewBalance >= 0 ? "text-green-700" : "text-red-500"}`}>
            {previewBalance.toLocaleString()}원
          </span>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
            취소
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: "#0B4619" }}>
            {loading ? (isEdit ? "저장 중..." : "등록 중...") : (isEdit ? "저장" : "거래 등록")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
