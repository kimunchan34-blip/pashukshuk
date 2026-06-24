"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, description, children, size = "md" }: ModalProps) {
  // SSR 방지: 클라이언트에서만 portal을 마운트
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // body 스크롤 잠금 + ESC 닫기
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const maxW = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" }[size];

  return createPortal(
    // z-[9999]로 레이아웃 스태킹 컨텍스트 완전히 우회
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      {/* 어두운 배경 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 패널 (모바일: 하단 시트 / 데스크탑: 중앙 다이얼로그) */}
      <div
        className={cn(
          "relative w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl",
          "max-h-[90vh] flex flex-col",
          maxW
        )}
        style={{ animation: "modalSlideUp 0.25s ease-out" }}
      >
        {/* 모바일 드래그 핸들 */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-slate-200 mx-auto mt-3 shrink-0" />

        {/* 헤더 */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0 ml-4"
          >
            <X size={16} />
          </button>
        </div>

        {/* 스크롤 가능한 본문 */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>

      {/* 인라인 애니메이션 (Tailwind JIT 미생성 대비) */}
      <style>{`
        @keyframes modalSlideUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ── 재사용 폼 필드 래퍼 ─────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  error?: string;
}

export function FormField({ label, required, children, error }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600 block">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Input / Select / Textarea 공통 스타일 래퍼 ──────────────────────────────

const inputCls =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-shadow";

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputCls, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputCls, className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} className={cn(inputCls, "resize-none", className)} {...rest} />;
}
