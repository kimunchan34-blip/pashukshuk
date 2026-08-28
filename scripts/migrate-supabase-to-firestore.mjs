import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const outputPath = resolve("migration-data/pashukshuk-firestore-data.json");
const tables = ["members", "roundings", "transactions", "round_scores", "settings"];
const args = new Set(process.argv.slice(2));

async function loadLocalEnv() {
  const content = await readFile(".env.local", "utf8").catch(() => "");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    if (!process.env[key]) process.env[key] = match[2].trim();
  }
}

function toMember(row) {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    position: row.position,
    phone: row.phone,
    email: row.email,
    handicap: row.handicap,
    joinedAt: row.joined_at,
    status: row.status,
    avatarInitials: row.avatar_initials,
  };
}

function toRounding(row) {
  return {
    id: row.id,
    title: row.title,
    courseId: row.course_id,
    courseName: row.course_name,
    date: row.date,
    teeTime: row.tee_time,
    maxParticipants: row.max_participants,
    fee: row.fee,
    status: row.status,
    attendances: row.attendances ?? [],
    ...(row.groups ? { groups: row.groups } : {}),
  };
}

function toTransaction(row) {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    type: row.type,
    feeType: row.fee_type,
    amount: row.amount,
    ...(row.member_id ? { memberId: row.member_id } : {}),
    ...(row.rounding_id ? { roundingId: row.rounding_id } : {}),
    balance: row.balance,
  };
}

function toRoundScore(row) {
  return {
    id: `${row.rounding_id}__${row.member_id}`,
    roundingId: row.rounding_id,
    memberId: row.member_id,
    gross: row.gross,
    net: row.net,
    handicap: row.handicap ?? Math.round((row.gross - row.net) * 10) / 10,
  };
}

function toSetting(row) {
  return {
    id: row.key,
    value: row.value,
  };
}

async function exportFromSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
  }

  const supabase = createClient(url, key);
  const exported = {};

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    exported[table] = data ?? [];
  }

  const firestoreData = {
    members: exported.members.map(toMember),
    roundings: exported.roundings.map(toRounding),
    transactions: exported.transactions.map(toTransaction),
    round_scores: exported.round_scores.map(toRoundScore),
    settings: exported.settings.map(toSetting),
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(firestoreData, null, 2), "utf8");

  return firestoreData;
}

async function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!serviceAccountPath) return null;
  return JSON.parse(await readFile(serviceAccountPath, "utf8"));
}

async function importToFirestore(data) {
  const serviceAccount = await loadServiceAccount();
  if (!serviceAccount) return importToFirestoreWithClient(data);

  return importToFirestoreWithAdmin(data, serviceAccount);
}

async function importToFirestoreWithAdmin(data, serviceAccount) {
  initializeApp({ credential: cert(serviceAccount) });
  const firestore = getFirestore();
  const batchSize = 400;
  let pending = [];
  let written = 0;

  async function flush() {
    if (pending.length === 0) return;
    const batch = firestore.batch();
    for (const { collectionName, item } of pending) {
      const { id, ...payload } = item;
      batch.set(firestore.collection(collectionName).doc(id), payload);
    }
    await batch.commit();
    written += pending.length;
    pending = [];
  }

  for (const [collectionName, items] of Object.entries(data)) {
    for (const item of items) {
      pending.push({ collectionName, item });
      if (pending.length >= batchSize) await flush();
    }
  }

  await flush();
  return written;
}

async function importToFirestoreWithClient(data) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are required.");
  }

  let written = 0;

  for (const [collectionName, items] of Object.entries(data)) {
    for (const item of items) {
      const { id, ...payload } = item;
      const url =
        `https://firestore.googleapis.com/v1/projects/${projectId}` +
        `/databases/(default)/documents/${collectionName}/${encodeURIComponent(id)}?key=${apiKey}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: toFirestoreFields(payload) }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(`Firestore REST import failed for ${collectionName}/${id}: ${message}`);
      }

      written += 1;
    }
  }

  return written;
}

function toFirestoreFields(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, toFirestoreValue(entry)])
  );
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }

  if (typeof value === "object") {
    return { mapValue: { fields: toFirestoreFields(value) } };
  }

  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }

  return { stringValue: String(value) };
}

await loadLocalEnv();

const data = await exportFromSupabase();
console.log(
  Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.length]))
);
console.log(`Exported Firestore seed data to ${outputPath}`);

if (!args.has("--export-only")) {
  const written = await importToFirestore(data);
  console.log(`Imported ${written} documents to Firestore.`);
}
