"use client";

import { useState, useEffect, useRef } from "react";
import { Modal, FormField, Select } from "@/components/ui/Modal";
import type { Transaction, FeeType, TransactionType } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  onAdd: (tx: Transaction) => void;
  onEdit?: (tx: Transaction) => void;
  editTransaction?: Transaction | null;
}

const FEE_TYPE_LABELS: Record<FeeType, string> = {
  monthly_fee:      "정기회비",
  monthly_interest: "정기이자",
  safebox:          "세이프박스",
  sponsorship:      "모임찬조",
  club_expense:     "모임지출",
  other:            "기타",
};

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [y, setY]   = useState(() => value.split("-")[0] ?? "");
  const [mo, setMo] = useState(() => value.split("-")[1] ?? "");
  const [d, setD]   = useState(() => value.split("-")[2] ?? "");
  const yRef  = useRef<HTMLInputElement>(null);
  const moRef = useRef<HTMLInputElement>(null);
  const dRef  = useRef<HTMLInputElement>(null);

  // 마운트 시 연도 필드 포커스 (Modal 애니메이션 250ms 이후)
  useEffect(() => {
    const t = setTimeout(() => yRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // 외부에서 value 변경 시 동기화
  useEffect(() => {
    if (!value) return;
    const [pY = "", pM = "", pD = ""] = value.split("-");
    setY(pY); setMo(pM); setD(pD);
  }, [value]);

  const emit = (ny: string, nm: string, nd: string) => {
    if (ny.length === 4 && nm.length === 2 && nd.length === 2) {
      onChange(`${ny}-${nm}-${nd}`);
    }
  };

  const handleYear = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
    setY(v);
    if (v.length === 4) moRef.current?.focus();
    emit(v, mo, d);
  };

  const handleMonth = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMo(v);
    if (v.length === 2) dRef.current?.focus();
    emit(y, v, d);
  };

  const handleDay = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
    setD(v);
    emit(y, mo, v);
  };

  return (
    <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-green-400 bg-white">
      <input
        ref={yRef}
        type="text" inputMode="numeric" placeholder="YYYY" maxLength={4} value={y}
        onChange={handleYear}
        className="w-14 text-center outline-none text-sm bg-transparent"
      />
      <span className="text-slate-400 text-sm select-none">년</span>
      <input
        ref={moRef}
        type="text" inputMode="numeric" placeholder="MM" maxLength={2} value={mo}
        onChange={handleMonth}
        className="w-8 text-center outline-none text-sm bg-transparent"
      />
      <span className="text-slate-400 text-sm select-none">월</span>
      <input
        ref={dRef}
        type="text" inputMode="numeric" placeholder="DD" maxLength={2} value={d}
        onChange={handleDay}
        className="w-8 text-center outline-none text-sm bg-transparent"
      />
      <span className="text-slate-400 text-sm select-none">일</span>
    </div>
  );
}

const makeInit = () => ({
  date:        new Date().toISOString().split("T")[0],
  description: "",
  type:        "income" as TransactionType,
  feeType:     "monthly_fee" as FeeType,
  amount:      0,
});

export function AddTransactionModal({
  open, onClose, currentBalance, onAdd, onEdit, editTransaction,
}: Props) {
  const isEdit = !!editTransaction;
  const [form, setForm]     = useState(makeInit());
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editTransaction) {
      setForm({
        date:        editTransaction.date,
        description: editTransaction.description,
        type:        editTransaction.type,
        feeType:     editTransaction.feeType,
        amount:      editTransaction.amount,
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
          <DateInput value={form.date} onChange={(v) => set("date", v)} />
        </FormField>

        {/* 내역 */}
        <FormField label="내역" required error={errors.description}>
          <input
            placeholder="예: 6월 정기 회비 - 홍길동"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
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
            <input
              type="text" inputMode="numeric"
              value={form.amount === 0 ? "" : form.amount.toLocaleString()}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "").replace(/\D/g, "");
                set("amount", raw === "" ? 0 : Number(raw));
              }}
              placeholder="0"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </FormField>
        </div>

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
