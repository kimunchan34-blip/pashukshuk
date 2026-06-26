"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
import type { Transaction } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import * as db from "@/lib/db";
import { useRole } from "@/contexts/RoleContext";

const TRANSACTION_COLORS: Record<string, string> = {
  income:  "text-green-600",
  expense: "text-red-500",
};

const HISTORY_PER_PAGE = 10;

const numId = (id: string) => { const n = parseInt(id.replace(/\D/g, ""), 10); return isNaN(n) ? 0 : n; };

const chronoAsc = (a: Transaction, b: Transaction) =>
  a.date.localeCompare(b.date) || numId(a.id) - numId(b.id);

/** 실제 거래 내역 기반으로 월별 통계 계산 */
function buildMonthlyStats(txs: Transaction[], base: number) {
  if (txs.length === 0) return [];
  const map = new Map<string, { income: number; expense: number }>();
  for (const tx of txs) {
    const key = tx.date.slice(0, 7); // "YYYY-MM"
    const cur = map.get(key) ?? { income: 0, expense: 0 };
    if (tx.type === "income") cur.income += tx.amount;
    else cur.expense += tx.amount;
    map.set(key, cur);
  }
  let running = base;
  return [...map.keys()].sort().map((key) => {
    const { income, expense } = map.get(key)!;
    running += income - expense;
    return { month: `${parseInt(key.slice(5))}월`, income, expense, balance: running };
  });
}

function recalcBalances(txs: Transaction[], base: number): Transaction[] {
  if (txs.length === 0) return [];
  const sorted = [...txs].sort(chronoAsc);
  let running = base;
  return sorted.map((tx) => {
    running += tx.type === "income" ? tx.amount : -tx.amount;
    return { ...tx, balance: running };
  });
}

export default function FinancePage() {
  const [activeTab, setActiveTab]             = useState<"overview" | "history">("overview");
  const [transactions, setTransactions]       = useState<Transaction[]>([]);
  const [baseBalance, setBaseBalance]         = useState<number>(0);
  const { isAdmin } = useRole();
  const [loading, setLoading]                 = useState(true);
  const [addModalOpen, setAddModalOpen]       = useState(false);
  const [editingTx, setEditingTx]             = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear]       = useState<string>("전체");
  const [currentPage, setCurrentPage]         = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const txs = await db.getTransactions();
        let base  = await db.getBaseBalance();
        if (base === null) {
          if (txs.length > 0) {
            const first = [...txs].sort(chronoAsc)[0];
            base = first.balance - (first.type === "income" ? first.amount : -first.amount);
          } else {
            base = 0;
          }
          db.saveBaseBalance(base).catch(console.error);
        }
        setTransactions(txs);
        setBaseBalance(base);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 연도 목록 (내림차순)
  const financeYears = useMemo(() =>
    [...new Set(transactions.map((t) => t.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a)),
    [transactions]
  );

  // 선택된 연도로 필터된 거래 내역
  const filteredTx = useMemo(() =>
    selectedYear === "전체"
      ? transactions
      : transactions.filter((t) => t.date.startsWith(selectedYear)),
    [transactions, selectedYear]
  );

  const currentBalance = transactions.length > 0
    ? [...transactions].sort(chronoAsc).at(-1)!.balance
    : 0;

  const monthlyStats = buildMonthlyStats(filteredTx, baseBalance);

  const applyRecalc = (recalced: Transaction[]) => {
    setTransactions(recalced);
    db.upsertTransactions(recalced).catch(console.error);
  };

  const handleAddTransaction = (tx: Transaction) => {
    const recalced = recalcBalances([...transactions, tx], baseBalance);
    applyRecalc(recalced);
  };

  const handleEditTransaction = (tx: Transaction) => {
    const recalced = recalcBalances(transactions.map((t) => t.id === tx.id ? tx : t), baseBalance);
    applyRecalc(recalced);
    setEditingTx(null);
  };

  const handleDeleteTransaction = (id: string) => {
    db.deleteTransaction(id).catch(console.error);
    const remaining = transactions.filter((t) => t.id !== id);
    const recalced  = recalcBalances(remaining, baseBalance);
    applyRecalc(recalced);
    setDeleteConfirmId(null);
  };

  // 요약 카드: 전체 선택 시 이번 달, 연도 선택 시 해당 연도 합계
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const summaryIncome = selectedYear === "전체"
    ? transactions.filter((t) => t.type === "income"  && t.date.startsWith(currentMonthStr)).reduce((s, t) => s + t.amount, 0)
    : filteredTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const summaryExpense = selectedYear === "전체"
    ? transactions.filter((t) => t.type === "expense" && t.date.startsWith(currentMonthStr)).reduce((s, t) => s + t.amount, 0)
    : filteredTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const summaryLabel = selectedYear === "전체" ? "이번 달" : `${selectedYear}년`;

  // 거래 내역 (최신순 정렬, 연도 필터 적용)
  const displayedTx = [...filteredTx].sort((a, b) => -chronoAsc(a, b));
  const totalPages  = Math.ceil(displayedTx.length / HISTORY_PER_PAGE);
  const pagedTx     = displayedTx.slice((currentPage - 1) * HISTORY_PER_PAGE, currentPage * HISTORY_PER_PAGE);

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">회비 관리</h1>
          <p className="text-sm text-slate-400 mt-0.5">지출 내역 · 통계</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingTx(null); setAddModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ background: "#0B4619" }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">거래 추가</span>
          </button>
        )}
      </div>

      {/* 연도 필터 */}
      {financeYears.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {["전체", ...financeYears].map((year) => (
            <button
              key={year}
              onClick={() => handleYearSelect(year)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                selectedYear === year
                  ? "text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
              style={selectedYear === year ? { background: "#0B4619" } : {}}
            >
              {year === "전체" ? "전체" : `${year}년`}
              {year !== "전체" && (
                <span className={cn("ml-1.5 text-[10px]", selectedYear === year ? "text-white/70" : "text-slate-400")}>
                  {transactions.filter((t) => t.date.startsWith(year)).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "총 잔액",                  value: formatCurrency(currentBalance), icon: Wallet,      color: "text-green-700", bg: "bg-green-50" },
          { label: `${summaryLabel} 수입`,     value: formatCurrency(summaryIncome),  icon: TrendingUp,  color: "text-blue-700",  bg: "bg-blue-50"  },
          { label: `${summaryLabel} 지출`,     value: formatCurrency(summaryExpense), icon: TrendingDown, color: "text-red-500", bg: "bg-red-50"   },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", bg)}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-xs text-slate-400 truncate">{label}</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([["overview", "통계"], ["history", "거래 내역"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === key ? "bg-white text-green-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 통계 탭 ── */}
      {activeTab === "overview" && (
        monthlyStats.length === 0 ? (
          <div className="card py-16 text-center text-slate-400 text-sm">
            {selectedYear === "전체" ? "거래 내역이 없어 통계를 표시할 수 없습니다." : `${selectedYear}년 거래 내역이 없습니다.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">월별 잔액 추이</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyStats} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0B4619" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0B4619" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), "잔액"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Area type="monotone" dataKey="balance" stroke="#0B4619" strokeWidth={2} fill="url(#balanceGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">수입 / 지출 비교</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyStats} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                  <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === "income" ? "수입" : "지출"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend formatter={(v) => (v === "income" ? "수입" : "지출")} />
                  <Bar dataKey="income"  fill="#0B4619" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      )}

      {/* ── 거래 내역 탭 ── */}
      {activeTab === "history" && (
        <div className="card overflow-hidden">
          {displayedTx.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              {selectedYear === "전체" ? "거래 내역이 없습니다." : `${selectedYear}년 거래 내역이 없습니다.`}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {["날짜", "내용", "구분", "금액", "잔액", "관리"].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pagedTx.map((tx) => (
                      <tr key={tx.id} className="table-row-hover">
                        <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">{tx.date}</td>
                        <td className="px-5 py-3.5 text-slate-700">{tx.description}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                            tx.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                            {tx.type === "income" ? "수입" : "지출"}
                          </span>
                        </td>
                        <td className={cn("px-5 py-3.5 font-semibold tabular-nums", TRANSACTION_COLORS[tx.type])}>
                          {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 tabular-nums text-sm">
                          {formatCurrency(tx.balance)}
                        </td>
                        <td className="px-5 py-3.5">
                          {deleteConfirmId === tx.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">삭제할까요?</span>
                              <button onClick={() => handleDeleteTransaction(tx.id)} className="text-xs text-red-600 font-semibold hover:text-red-700">확인</button>
                              <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-slate-400">취소</button>
                            </div>
                          ) : isAdmin ? (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => { setEditingTx(tx); setAddModalOpen(true); }}
                                className="flex items-center gap-1 text-xs text-green-700 font-medium hover:text-green-800"
                              >
                                <Pencil size={12} /> 수정
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(tx.id)}
                                className="flex items-center gap-1 text-xs text-red-400 font-medium hover:text-red-600"
                              >
                                <Trash2 size={12} /> 삭제
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-50">
                  <span className="text-xs text-slate-400">
                    {(currentPage - 1) * HISTORY_PER_PAGE + 1}–{Math.min(currentPage * HISTORY_PER_PAGE, displayedTx.length)} / 총 {displayedTx.length}건
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={cn(
                          "w-7 h-7 rounded-lg text-xs font-medium transition-colors",
                          currentPage === p ? "text-white" : "hover:bg-slate-100 text-slate-500"
                        )}
                        style={currentPage === p ? { background: "#0B4619" } : {}}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <AddTransactionModal
        open={addModalOpen}
        onClose={() => { setAddModalOpen(false); setEditingTx(null); }}
        currentBalance={currentBalance}
        onAdd={handleAddTransaction}
        onEdit={handleEditTransaction}
        editTransaction={editingTx}
      />
    </div>
  );
}
