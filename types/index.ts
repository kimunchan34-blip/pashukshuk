// ─── Member ─────────────────────────────────────────────────────────────────

export type MemberStatus = "active" | "inactive" | "pending";

export interface Member {
  id: string;
  name: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  handicap: number;
  joinedAt: string; // ISO date string
  status: MemberStatus;
  avatarInitials: string;
}

// ─── Rounding ────────────────────────────────────────────────────────────────

export type AttendanceStatus = "attending" | "absent" | "waitlist";

export interface AttendanceRecord {
  memberId: string;
  status: AttendanceStatus;
  registeredAt: string;
}

export interface Rounding {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  date: string; // ISO date string
  teeTime: string; // "HH:MM"
  maxParticipants: number;
  fee: number; // 참가비 (원)
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  attendances: AttendanceRecord[];
  groups?: RoundingGroup[];
}

// ─── Group Assignment ─────────────────────────────────────────────────────────

export interface GroupMember extends Pick<Member, "id" | "name" | "department" | "handicap"> {
  avatarInitials: string;
}

export interface RoundingGroup {
  id: string;
  label: string; // "1조", "2조", …
  members: GroupMember[];
}

// ─── Score / Leaderboard ─────────────────────────────────────────────────────

export interface HoleScore {
  hole: number; // 1~18
  par: number;
  score: number; // 타수
  isSelectedForShinPerio?: boolean;
}

export interface PlayerRoundScore {
  memberId: string;
  memberName: string;
  grossScore: number;
  holeScores: HoleScore[];
  shinPerioHandicap: number;
  netScore: number;
  rank: number;
}

export interface ShinPerioResult {
  handicap: number;
  netScore: number;
  grossScore: number;
  selectedHoles: number[];
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export type FeeType = "monthly_fee" | "monthly_interest" | "safebox" | "sponsorship" | "club_expense" | "other";
export type FeeStatus = "paid" | "unpaid" | "partial";
export type TransactionType = "income" | "expense";

export interface MemberFeeRecord {
  memberId: string;
  memberName: string;
  year: number;
  month: number;
  monthlyFee: FeeStatus;
  roundingFees: {
    roundingId: string;
    roundingTitle: string;
    amount: number;
    status: FeeStatus;
  }[];
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  feeType: FeeType;
  amount: number;
  memberId?: string;
  roundingId?: string;
  balance: number;
}

export interface FinanceSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  unpaidCount: number;
  unpaidAmount: number;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  thisMonthRoundings: number;
  nextRounding: Rounding | null;
  balance: number;
  topRankers: Array<{ rank: number; member: Member }>;
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
