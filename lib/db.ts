/**
 * Supabase DB 접근 레이어.
 * supabase 클라이언트가 null(환경변수 미설정)이면 빈 값 반환.
 */
import { supabase } from './supabase';
import type { Member, Rounding, Transaction } from '@/types';

export type RoundScore    = { gross: number; net: number; handicap: number };
export type AllRoundScores = Record<string, Record<string, RoundScore>>;

// ─── 변환 헬퍼 ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toMember = (r: any): Member => ({
  id: r.id, name: r.name, department: r.department, position: r.position,
  phone: r.phone, email: r.email, handicap: r.handicap,
  joinedAt: r.joined_at, status: r.status, avatarInitials: r.avatar_initials,
});
const fromMember = (m: Member) => ({
  id: m.id, name: m.name, department: m.department, position: m.position,
  phone: m.phone, email: m.email, handicap: m.handicap,
  joined_at: m.joinedAt, status: m.status, avatar_initials: m.avatarInitials,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toRounding = (r: any): Rounding => ({
  id: r.id, title: r.title, courseId: r.course_id, courseName: r.course_name,
  date: r.date, teeTime: r.tee_time, maxParticipants: r.max_participants,
  fee: r.fee, status: r.status, attendances: r.attendances ?? [], groups: r.groups,
});
const fromRounding = (r: Rounding) => ({
  id: r.id, title: r.title, course_id: r.courseId, course_name: r.courseName,
  date: r.date, tee_time: r.teeTime, max_participants: r.maxParticipants,
  fee: r.fee, status: r.status, attendances: r.attendances, groups: r.groups ?? null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toTransaction = (r: any): Transaction => ({
  id: r.id, date: r.date, description: r.description, type: r.type,
  feeType: r.fee_type, amount: r.amount,
  memberId: r.member_id ?? undefined, roundingId: r.rounding_id ?? undefined,
  balance: r.balance,
});
const fromTransaction = (t: Transaction) => ({
  id: t.id, date: t.date, description: t.description, type: t.type,
  fee_type: t.feeType, amount: t.amount,
  member_id: t.memberId ?? null, rounding_id: t.roundingId ?? null,
  balance: t.balance,
});

// ─── Members ─────────────────────────────────────────────────────────────────

export async function getMembers(): Promise<Member[]> {
  if (!supabase) { console.warn('[db] Supabase 미설정'); return []; }
  const { data, error } = await supabase.from('members').select('*').order('joined_at');
  if (error) { console.error('[db] getMembers 오류:', JSON.stringify(error)); throw error; }
  return (data ?? []).map(toMember);
}

export async function upsertMember(m: Member): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('members').upsert(fromMember(m));
  if (error) { console.error('[db] upsertMember 오류:', JSON.stringify(error)); throw error; }
}

export async function deleteMember(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw error;
}

// ─── Roundings ───────────────────────────────────────────────────────────────

export async function getRoundings(): Promise<Rounding[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('roundings').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toRounding);
}

export async function upsertRounding(r: Rounding): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('roundings').upsert(fromRounding(r));
  if (error) throw error;
}

export async function deleteRounding(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('roundings').delete().eq('id', id);
  if (error) throw error;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(): Promise<Transaction[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('transactions').select('*').order('date').order('id');
  if (error) throw error;
  return (data ?? []).map(toTransaction);
}

export async function upsertTransactions(txs: Transaction[]): Promise<void> {
  if (!supabase || txs.length === 0) return;
  const { error } = await supabase.from('transactions').upsert(txs.map(fromTransaction));
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

// ─── Round Scores ─────────────────────────────────────────────────────────────

export async function getRoundScores(): Promise<AllRoundScores> {
  if (!supabase) return {};
  const { data, error } = await supabase.from('round_scores').select('*');
  if (error) throw error;
  const result: AllRoundScores = {};
  for (const row of (data ?? [])) {
    (result[row.rounding_id] ??= {})[row.member_id] = {
      gross: row.gross,
      net: row.net,
      handicap: row.handicap ?? Math.round((row.gross - row.net) * 10) / 10,
    };
  }
  return result;
}

export async function upsertRoundScore(roundingId: string, memberId: string, score: RoundScore): Promise<void> {
  if (!supabase) return;
  const payload = {
    rounding_id: roundingId,
    member_id: memberId,
    gross: score.gross,
    net: score.net,
    handicap: score.handicap,
  };
  const { error } = await supabase.from('round_scores').upsert(payload);
  if (!error) return;

  const message = "message" in error ? String(error.message) : "";
  const details = "details" in error ? String(error.details) : "";
  const isMissingHandicapColumn =
    error.code === "PGRST204" ||
    (message + details).toLowerCase().includes("handicap");

  if (!isMissingHandicapColumn) throw error;

  // Older Supabase schemas do not have round_scores.handicap yet. Net already
  // preserves the entered handicap because handicap = gross - net on readback.
  const { error: legacyError } = await supabase.from('round_scores').upsert({
    rounding_id: roundingId,
    member_id: memberId,
    gross: score.gross,
    net: score.net,
  });
  if (legacyError) throw legacyError;
}

export async function deleteRoundScore(roundingId: string, memberId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('round_scores').delete()
    .eq('rounding_id', roundingId).eq('member_id', memberId);
  if (error) throw error;
}

// ─── Settings (base balance) ──────────────────────────────────────────────────

export async function getBaseBalance(): Promise<number | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('settings').select('value').eq('key', 'base_balance').maybeSingle();
  return data ? (data.value as number) : null;
}

export async function saveBaseBalance(value: number): Promise<void> {
  if (!supabase) return;
  await supabase.from('settings').upsert({ key: 'base_balance', value });
}
