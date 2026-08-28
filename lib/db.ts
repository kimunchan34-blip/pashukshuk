import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { firestore } from "./firebase";
import type { Member, Rounding, Transaction } from "@/types";

export type RoundScore = { gross: number; net: number; handicap: number };
export type AllRoundScores = Record<string, Record<string, RoundScore>>;

const COLLECTIONS = {
  members: "members",
  roundings: "roundings",
  transactions: "transactions",
  roundScores: "round_scores",
  settings: "settings",
} as const;

const roundScoreDocId = (roundingId: string, memberId: string) =>
  `${roundingId}__${memberId}`;

function requireFirestore() {
  if (!firestore) {
    console.warn("[db] Firebase is not configured.");
    return null;
  }
  return firestore;
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}

export async function getMembers(): Promise<Member[]> {
  const db = requireFirestore();
  if (!db) return [];

  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.members), orderBy("joinedAt"))
  );
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Member));
}

export async function upsertMember(member: Member): Promise<void> {
  const db = requireFirestore();
  if (!db) return;

  await setDoc(doc(db, COLLECTIONS.members, member.id), member);
}

export async function deleteMember(id: string): Promise<void> {
  const db = requireFirestore();
  if (!db) return;

  await deleteDoc(doc(db, COLLECTIONS.members, id));
}

export async function getRoundings(): Promise<Rounding[]> {
  const db = requireFirestore();
  if (!db) return [];

  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.roundings), orderBy("date", "desc"))
  );
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Rounding));
}

export async function upsertRounding(rounding: Rounding): Promise<void> {
  const db = requireFirestore();
  if (!db) return;

  await setDoc(
    doc(db, COLLECTIONS.roundings, rounding.id),
    withoutUndefined(rounding as unknown as Record<string, unknown>)
  );
}

export async function deleteRounding(id: string): Promise<void> {
  const db = requireFirestore();
  if (!db) return;

  await deleteDoc(doc(db, COLLECTIONS.roundings, id));
}

export async function getTransactions(): Promise<Transaction[]> {
  const db = requireFirestore();
  if (!db) return [];

  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.transactions), orderBy("date"))
  );
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() } as Transaction))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export async function upsertTransactions(transactions: Transaction[]): Promise<void> {
  const db = requireFirestore();
  if (!db || transactions.length === 0) return;

  await Promise.all(
    transactions.map((transaction) =>
      setDoc(
        doc(db, COLLECTIONS.transactions, transaction.id),
        withoutUndefined(transaction as unknown as Record<string, unknown>)
      )
    )
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = requireFirestore();
  if (!db) return;

  await deleteDoc(doc(db, COLLECTIONS.transactions, id));
}

export async function getRoundScores(): Promise<AllRoundScores> {
  const db = requireFirestore();
  if (!db) return {};

  const snapshot = await getDocs(collection(db, COLLECTIONS.roundScores));
  const result: AllRoundScores = {};

  for (const item of snapshot.docs) {
    const row = item.data() as {
      roundingId: string;
      memberId: string;
      gross: number;
      net: number;
      handicap?: number;
    };

    (result[row.roundingId] ??= {})[row.memberId] = {
      gross: row.gross,
      net: row.net,
      handicap:
        row.handicap ?? Math.round((row.gross - row.net) * 10) / 10,
    };
  }

  return result;
}

export async function upsertRoundScore(
  roundingId: string,
  memberId: string,
  score: RoundScore
): Promise<void> {
  const db = requireFirestore();
  if (!db) return;

  await setDoc(doc(db, COLLECTIONS.roundScores, roundScoreDocId(roundingId, memberId)), {
    roundingId,
    memberId,
    gross: score.gross,
    net: score.net,
    handicap: score.handicap,
  });
}

export async function deleteRoundScore(
  roundingId: string,
  memberId: string
): Promise<void> {
  const db = requireFirestore();
  if (!db) return;

  await deleteDoc(doc(db, COLLECTIONS.roundScores, roundScoreDocId(roundingId, memberId)));
}

export async function getBaseBalance(): Promise<number | null> {
  const db = requireFirestore();
  if (!db) return null;

  const snapshot = await getDocs(collection(db, COLLECTIONS.settings));
  const baseBalance = snapshot.docs.find((item) => item.id === "base_balance");
  return baseBalance ? (baseBalance.data().value as number) : null;
}

export async function saveBaseBalance(value: number): Promise<void> {
  const db = requireFirestore();
  if (!db) return;

  await setDoc(doc(db, COLLECTIONS.settings, "base_balance"), { value });
}
