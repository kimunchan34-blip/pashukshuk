import type { HoleScore, ShinPerioResult } from "@/types";

// 표준 72파 18홀 기준 파 배열 (파3×4, 파4×10, 파5×4)
export const DEFAULT_PAR_LAYOUT: number[] = [
  4, 3, 5, 4, 4, 3, 5, 4, 4, // Front 9
  4, 3, 5, 4, 4, 3, 5, 4, 4, // Back 9
];

/**
 * 신페리오 계산법
 *
 * 1. 대회 전 비밀리에 18홀 중 12홀을 선정 (파3×4, 파4×4, 파5×4)
 * 2. 선정된 12홀의 총타수 × 1.5 = 18홀 환산 그로스
 * 3. 핸디캡 = (환산 그로스 - 파72) × 0.8
 *    단, 각 홀별 최대 더블파(double par) 제한 적용
 * 4. 넷스코어 = 실제 그로스 - 핸디캡 (반올림)
 */
export function calculateShinPerio(
  holeScores: HoleScore[],
  selectedHoleNumbers: number[] // 1-indexed, 12개
): ShinPerioResult {
  const grossScore = holeScores.reduce((sum, h) => sum + h.score, 0);

  // 더블파 캡 적용 후 선정 홀 타수 합산
  const cappedScores = holeScores.map((h) => ({
    ...h,
    score: Math.min(h.score, h.par * 2),
  }));

  const selectedScoreSum = selectedHoleNumbers.reduce((sum, holeNum) => {
    const hole = cappedScores.find((h) => h.hole === holeNum);
    return sum + (hole ? hole.score : 0);
  }, 0);

  // 18홀 환산 그로스 (12홀 × 1.5)
  const equivalentGross = selectedScoreSum * 1.5;

  // 핸디캡 = (환산 - 72) × 0.8, 최소 0
  const rawHandicap = Math.max(0, (equivalentGross - 72) * 0.8);
  const handicap = Math.round(rawHandicap * 10) / 10;

  const netScore = Math.round(grossScore - handicap);

  return {
    handicap,
    netScore,
    grossScore,
    selectedHoles: selectedHoleNumbers,
  };
}

/**
 * 대회 시작 전 12홀을 무작위 선정한다.
 * 균형 있는 선정: 파3에서 4개, 파4에서 4개, 파5에서 4개
 */
export function selectShinPerioHoles(
  parLayout: number[] = DEFAULT_PAR_LAYOUT
): number[] {
  const par3Holes = parLayout
    .map((par, i) => ({ hole: i + 1, par }))
    .filter((h) => h.par === 3);
  const par4Holes = parLayout
    .map((par, i) => ({ hole: i + 1, par }))
    .filter((h) => h.par === 4);
  const par5Holes = parLayout
    .map((par, i) => ({ hole: i + 1, par }))
    .filter((h) => h.par === 5);

  const shuffle = <T>(arr: T[]) =>
    [...arr].sort(() => Math.random() - 0.5);

  const selected = [
    ...shuffle(par3Holes).slice(0, 4),
    ...shuffle(par4Holes).slice(0, 4),
    ...shuffle(par5Holes).slice(0, 4),
  ];

  return selected.map((h) => h.hole).sort((a, b) => a - b);
}

/**
 * 주어진 홀 스코어 배열로 현재 핸디캡을 업데이트한다.
 * 누적 라운드 평균으로 핸디캡을 조정하는 간단한 이동평균 방식.
 */
export function updateHandicap(
  currentHandicap: number,
  roundNetScore: number,
  par = 72,
  weight = 0.3
): number {
  const scoreDiff = roundNetScore - par;
  const adjustment = scoreDiff * weight;
  const newHandicap = Math.max(0, Math.round((currentHandicap + adjustment) * 10) / 10);
  return newHandicap;
}

/**
 * 넷스코어 기준으로 순위를 부여한다.
 */
export function rankByNetScore<T extends { netScore: number }>(
  players: T[]
): Array<T & { rank: number }> {
  return [...players]
    .sort((a, b) => a.netScore - b.netScore)
    .map((player, index) => ({ ...player, rank: index + 1 }));
}
