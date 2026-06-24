"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, Upload, X, Check, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { HoleScore } from "@/types";
import { cn } from "@/lib/utils";

interface ParseScorecardResponse {
  scores: { hole: number; par: number; score: number }[];
  playerName?: string;
  totalScore?: number;
  confidence?: "high" | "medium" | "low";
}

interface Props {
  onScoresApplied: (scores: HoleScore[]) => void;
}

type Step = "idle" | "preview" | "parsing" | "review" | "error";

const CONFIDENCE_LABEL = {
  high:   { text: "신뢰도 높음", cls: "bg-green-100 text-green-700" },
  medium: { text: "신뢰도 보통", cls: "bg-amber-100 text-amber-700" },
  low:    { text: "신뢰도 낮음 — 직접 확인 권장", cls: "bg-red-100 text-red-600" },
};

export function ScorecardUpload({ onScoresApplied }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string>("");
  const [mediaType, setMediaType] = useState<string>("image/jpeg");
  const [result, setResult] = useState<ParseScorecardResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAllHoles, setShowAllHoles] = useState(false);

  const reset = () => {
    setStep("idle");
    setImagePreview("");
    setImageBase64("");
    setResult(null);
    setErrorMsg("");
    setShowAllHoles(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("이미지 파일만 업로드 가능합니다.");
      setStep("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("파일 크기가 너무 큽니다. 10MB 이하 이미지를 사용해주세요.");
      setStep("error");
      return;
    }

    setMediaType(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      // base64 only (strip data:image/...;base64,)
      setImageBase64(dataUrl.split(",")[1] ?? "");
      setStep("preview");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleParse = async () => {
    setStep("parsing");
    setErrorMsg("");

    try {
      const res = await fetch("/api/parse-scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64, mediaType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "서버 오류가 발생했습니다.");
        setStep("error");
        return;
      }

      setResult(data as ParseScorecardResponse);
      setStep("review");
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.");
      setStep("error");
    }
  };

  const handleApply = () => {
    if (!result) return;
    const holeScores: HoleScore[] = result.scores.map((s) => ({
      hole: s.hole,
      par: s.par,
      score: s.score,
    }));
    onScoresApplied(holeScores);
    reset();
  };

  // ── idle ──────────────────────────────────────────────────────────────────
  if (step === "idle") {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all group"
      >
        <input
          ref={inputRef} type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />
        <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-green-100 flex items-center justify-center mx-auto mb-3 transition-colors">
          <Camera size={22} className="text-slate-400 group-hover:text-green-600 transition-colors" />
        </div>
        <p className="text-sm font-semibold text-slate-700">골프존 스코어 캡처 업로드</p>
        <p className="text-xs text-slate-400 mt-1">클릭하거나 이미지를 드래그하세요 (JPG/PNG/GIF/WEBP)</p>
        <p className="text-xs text-slate-300 mt-2">Claude AI가 홀별 타수를 자동 추출합니다</p>
      </div>
    );
  }

  // ── preview ───────────────────────────────────────────────────────────────
  if (step === "preview") {
    return (
      <div className="space-y-3 animate-slide-up">
        <div className="relative rounded-2xl overflow-hidden bg-slate-100 max-h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="스코어카드 미리보기" className="w-full h-48 object-contain" />
          <button
            onClick={reset}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={reset}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
            다시 선택
          </button>
          <button
            onClick={handleParse}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ background: "#0B4619" }}
          >
            <Upload size={14} />
            스코어 자동 추출
          </button>
        </div>
      </div>
    );
  }

  // ── parsing ───────────────────────────────────────────────────────────────
  if (step === "parsing") {
    return (
      <div className="py-8 text-center space-y-3 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "#0B4619" }}>
          <Loader2 size={22} className="text-white animate-spin" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">AI가 스코어카드를 분석 중...</p>
          <p className="text-xs text-slate-400 mt-1">Claude AI가 홀별 타수를 추출합니다</p>
        </div>
        <div className="flex justify-center gap-1.5 pt-1">
          {[0.3, 0.6, 0.9].map((d) => (
            <span key={d} className="w-1.5 h-1.5 rounded-full bg-green-400 animate-bounce"
              style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── error ─────────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center space-y-3 animate-slide-up">
        <AlertCircle size={28} className="text-red-400 mx-auto" />
        <div>
          <p className="text-sm font-semibold text-red-700">분석 실패</p>
          <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
        </div>
        <button onClick={reset}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-red-300 text-red-600 hover:bg-red-100 transition-colors">
          다시 시도
        </button>
      </div>
    );
  }

  // ── review ────────────────────────────────────────────────────────────────
  if (step === "review" && result) {
    const totalGross = result.scores.reduce((s, h) => s + h.score, 0);
    const totalPar   = result.scores.reduce((s, h) => s + h.par, 0);
    const diff = totalGross - totalPar;
    const confidence = result.confidence ?? "medium";
    const badge = CONFIDENCE_LABEL[confidence];
    const visibleHoles = showAllHoles ? result.scores : result.scores.slice(0, 9);

    return (
      <div className="space-y-3 animate-slide-up">
        {/* 상단 요약 */}
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-green-800">추출 완료</p>
            {result.playerName && (
              <p className="text-xs text-green-700 mt-0.5">👤 {result.playerName}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-green-800 tabular-nums">{totalGross}</p>
            <p className={cn("text-xs font-semibold", diff > 0 ? "text-red-500" : "text-blue-500")}>
              {diff >= 0 ? `+${diff}` : diff} (파 {totalPar})
            </p>
          </div>
        </div>

        {/* 신뢰도 배지 */}
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", badge.cls)}>
            {badge.text}
          </span>
          <span className="text-xs text-slate-400">홀별 타수를 확인하고 수정하세요</span>
        </div>

        {/* 홀별 스코어 그리드 */}
        <div className="grid grid-cols-3 gap-1.5">
          {visibleHoles.map((h) => {
            const d = h.score - h.par;
            return (
              <div key={h.hole}
                className="bg-white rounded-xl border border-slate-100 p-2 text-center shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400">{h.hole}H</span>
                  <span className="text-[10px] text-slate-400">P{h.par}</span>
                </div>
                <span className={cn("text-lg font-black tabular-nums",
                  d < 0 ? "text-blue-600" :
                  d === 0 ? "text-slate-700" :
                  d === 1 ? "text-green-700" : "text-red-500"
                )}>
                  {h.score}
                </span>
                <p className={cn("text-[10px] font-semibold",
                  d === 0 ? "text-slate-400" : d < 0 ? "text-blue-500" : "text-red-400"
                )}>
                  {d === 0 ? "PAR" : d > 0 ? `+${d}` : d}
                </p>
              </div>
            );
          })}
        </div>

        {/* 전체 펼치기 */}
        <button
          onClick={() => setShowAllHoles(!showAllHoles)}
          className="w-full py-1.5 flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          {showAllHoles ? (
            <><ChevronUp size={13} /> 후반 숨기기</>
          ) : (
            <><ChevronDown size={13} /> 후반 (10~18H) 보기</>
          )}
        </button>

        {/* 이미지 미리보기 (접힘) */}
        <details className="group">
          <summary className="text-xs text-slate-400 cursor-pointer list-none flex items-center gap-1 hover:text-slate-600">
            <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
            원본 이미지 보기
          </summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="원본" className="mt-2 rounded-xl w-full max-h-40 object-contain bg-slate-100" />
        </details>

        {/* 버튼 */}
        <div className="flex gap-2 pt-1">
          <button onClick={reset}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
            다시 선택
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ background: "#0B4619" }}
          >
            <Check size={14} />
            스코어 적용
          </button>
        </div>
      </div>
    );
  }

  return null;
}
