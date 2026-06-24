import type { GroupMember, RoundingGroup } from "@/types";

/**
 * 스네이크 드래프트 방식으로 핸디캡 균등 조편성을 수행한다.
 *
 * 원리: 핸디캡 오름차순 정렬 후 뱀처럼 지그재그로 조에 배분한다.
 * 예) 12명, 3조 → [1,2,3,4] → [4,3,2,1] → [1,2,3,4] 순으로 배분
 * 이렇게 하면 각 조의 평균 핸디캡이 최대한 균일해진다.
 */
export function assignGroupsByHandicap(
  members: GroupMember[],
  groupSize = 4
): RoundingGroup[] {
  if (members.length === 0) return [];

  const sorted = [...members].sort((a, b) => a.handicap - b.handicap);
  const numGroups = Math.ceil(sorted.length / groupSize);

  const groups: RoundingGroup[] = Array.from({ length: numGroups }, (_, i) => ({
    id: `group-${i + 1}`,
    label: `${i + 1}조`,
    members: [],
  }));

  sorted.forEach((member, index) => {
    const round = Math.floor(index / numGroups);
    const position = index % numGroups;
    // 짝수 라운드: 좌→우, 홀수 라운드: 우→좌 (스네이크)
    const groupIndex = round % 2 === 0 ? position : numGroups - 1 - position;
    groups[groupIndex].members.push(member);
  });

  return groups;
}

/**
 * 조편성 결과의 균형도를 평가한다.
 * 반환값: 각 조의 평균 핸디캡과 전체 표준편차 (낮을수록 균등)
 */
export function evaluateGroupBalance(groups: RoundingGroup[]): {
  groupAverages: { label: string; average: number }[];
  standardDeviation: number;
} {
  const groupAverages = groups.map((group) => {
    const avg =
      group.members.length > 0
        ? group.members.reduce((sum, m) => sum + m.handicap, 0) / group.members.length
        : 0;
    return { label: group.label, average: Math.round(avg * 10) / 10 };
  });

  const mean =
    groupAverages.reduce((sum, g) => sum + g.average, 0) / groupAverages.length;
  const variance =
    groupAverages.reduce((sum, g) => sum + Math.pow(g.average - mean, 2), 0) /
    groupAverages.length;
  const standardDeviation = Math.round(Math.sqrt(variance) * 100) / 100;

  return { groupAverages, standardDeviation };
}

/**
 * 드래그 앤 드롭 이후 두 조 사이에서 특정 멤버를 이동시킨다.
 */
export function moveMemberBetweenGroups(
  groups: RoundingGroup[],
  memberId: string,
  fromGroupId: string,
  toGroupId: string,
  toIndex?: number
): RoundingGroup[] {
  const next = groups.map((g) => ({ ...g, members: [...g.members] }));

  const fromGroup = next.find((g) => g.id === fromGroupId);
  const toGroup = next.find((g) => g.id === toGroupId);

  if (!fromGroup || !toGroup) return groups;

  const memberIndex = fromGroup.members.findIndex((m) => m.id === memberId);
  if (memberIndex === -1) return groups;

  const [member] = fromGroup.members.splice(memberIndex, 1);
  const insertAt = toIndex !== undefined ? toIndex : toGroup.members.length;
  toGroup.members.splice(insertAt, 0, member);

  return next;
}

/**
 * 같은 조 내에서 멤버 순서를 바꾼다.
 */
export function reorderMemberInGroup(
  groups: RoundingGroup[],
  groupId: string,
  fromIndex: number,
  toIndex: number
): RoundingGroup[] {
  const next = groups.map((g) => ({ ...g, members: [...g.members] }));
  const group = next.find((g) => g.id === groupId);
  if (!group) return groups;

  const [member] = group.members.splice(fromIndex, 1);
  group.members.splice(toIndex, 0, member);
  return next;
}
