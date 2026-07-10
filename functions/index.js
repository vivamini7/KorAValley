const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/1yAeYVbqyFwePzjjdU0ile_OAmZ-cR8iwu_95KPVsx7o/export?format=csv&gid=0";

function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === "," && !inQ) {
      result.push(cur.trim()); cur = "";
    } else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

// "YYYY.MM.DD" 또는 "YYYY.MM.DD HH:MM" 형식의 앞부분(날짜)만 추출
function dateOnly(str) {
  if (!str) return "";
  return str.trim().split(" ")[0];
}

// 현재 시각(KST) 기준 "Y.M.D" 형식 — CSV의 날짜 구분자(.)와 맞추기 위해 직접 조립
function kstDateParts(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return {
    y: kst.getUTCFullYear(),
    m: kst.getUTCMonth() + 1,
    d: kst.getUTCDate(),
    hour: kst.getUTCHours(),
  };
}

function fmtDate({ y, m, d }) {
  return `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}`;
}

// 00시 알림은 "방금 끝난 하루(어제)"를 집계 대상으로 삼는다
function targetDateStr(now) {
  const parts = kstDateParts(now);
  if (parts.hour !== 0) return fmtDate(parts);
  const yesterday = new Date(now.getTime() - 60 * 60 * 1000);
  return fmtDate(kstDateParts(yesterday));
}

async function buildSummary() {
  const res = await fetch(CSV_URL);
  const text = await res.text();
  if (text.trim().startsWith("<")) throw new Error("CSV fetch failed (got HTML)");

  const rows = parseCSV(text);
  const now = new Date();
  const today = targetDateStr(now);
  const isMidnightRun = kstDateParts(now).hour === 0;

  const registered = {};
  const completed = {};

  rows.forEach((r) => {
    const name = r["이름"];
    if (!name) return;
    if (dateOnly(r["생성일"]) === today) {
      (registered[name] ??= new Set()).add(r["계획번호"]);
    }
    if (r["상태"] === "완료" && dateOnly(r["완료일"]) === today) {
      (completed[name] ??= new Set()).add(r["계획번호"]);
    }
  });

  const names = [...new Set([...Object.keys(registered), ...Object.keys(completed)])];
  if (names.length === 0) return null;

  // 완료 개수 → 등록 개수 순으로 순위를 매겨 메달과 멘트를 붙인다
  const ranked = names
    .map((name) => ({
      name,
      reg: registered[name]?.size ?? 0,
      done: completed[name]?.size ?? 0,
    }))
    .sort((a, b) => b.done - a.done || b.reg - a.reg || a.name.localeCompare(b.name));

  // 1~3등까지만 멘트를 붙이고, 한 알림 안에서는 멘트가 중복되지 않게 한다
  const medals = ["🥇", "🥈", "🥉"];
  const usedTemplates = new Set();
  const lines = ranked.map((p, i) => {
    const medal = medals[i] ?? "▫️";
    const comment = i < 3 ? ` ${pickComment(usedTemplates, givenName(p.name))}` : "";
    return `${medal} ${p.name} ${p.reg}/${p.done}${comment}`;
  });
  const title = isMidnightRun ? `🏁 ${today} 총결산!` : `📋 ${today} 등록/완료`;
  return { title, body: lines.join("\n") };
}

// 성을 떼고 이름만 남긴다 (3글자 이상이면 첫 글자를 성으로 보고 제거)
function givenName(fullName) {
  return fullName.length >= 3 ? fullName.slice(1) : fullName;
}

// 응원 멘트 풀. "{name}"은 이름으로 치환된다
const PRIORITY_TEMPLATES = [
  "계획들 영크크!", "{name} 야르~", "{name} 야르킁킁~", "{name} 야르롱~",
  "계획들 난리자베스", "중꺾마!", "GOAT {name}",
  "계획수 실화냐", "갓생 {name}!!", "계획수 green green!",
  "샤갈! 갓생이에요!", "{name} isn't bomti",
  "갓생 야호~", "계획들 오이레~오이레~", "계획들과 파라파라 추기!",
  "알잘딱깔쎈", "홀리몰리 대박", "계획수 실화냐"
];
function pickComment(usedTemplates, name) {
  // 이름이 달라도 같은 템플릿이면 중복으로 보고 다시 뽑지 않는다
  for (let attempt = 0; attempt < 50; attempt++) {
    const tpl = PRIORITY_TEMPLATES[Math.floor(Math.random() * PRIORITY_TEMPLATES.length)];
    if (!usedTemplates.has(tpl)) {
      usedTemplates.add(tpl);
      return tpl.replace("{name}", name);
    }
  }
  // 풀을 다 썼으면 그냥 마지막으로 뽑은 걸 반환 (중복 허용)
  const tpl = PRIORITY_TEMPLATES[Math.floor(Math.random() * PRIORITY_TEMPLATES.length)];
  return tpl.replace("{name}", name);
}

async function sendToAllTokens(title, body) {
  const db = getFirestore();
  const snap = await db.collection("fcmTokens").get();
  if (snap.empty) return;

  const tokens = snap.docs.map((d) => d.data().token);
  // "notification" 페이로드는 브라우저가 자동으로도 알림을 띄우면서
  // 동시에 SW의 onBackgroundMessage도 띄워 중복 알림이 생기므로 data 메시지로 보낸다.
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    data: { title, body },
  });

  const invalid = [];
  res.responses.forEach((r, i) => {
    if (!r.success && ["messaging/registration-token-not-registered", "messaging/invalid-argument"].includes(r.error?.code)) {
      invalid.push(snap.docs[i].id);
    }
  });
  await Promise.all(invalid.map((id) => db.collection("fcmTokens").doc(id).delete()));
}

exports.planSummaryNotification = onSchedule(
  { schedule: "0 0,9,12,15,18,21 * * *", timeZone: "Asia/Seoul" },
  async () => {
    const summary = await buildSummary();
    if (!summary) return;
    await sendToAllTokens(summary.title, summary.body);
  }
);
