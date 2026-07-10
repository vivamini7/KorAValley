/**
 * Google Sheets CSV → Firestore networking 컬렉션 마이그레이션
 * 사용법: node scripts/seedNetworking.js
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyDx3T5ZQvwX4r-FR7U_GYP1yN6P5RN6j14",
  authDomain: "kora-valley.firebaseapp.com",
  projectId: "kora-valley",
  storageBucket: "kora-valley.firebasestorage.app",
  messagingSenderId: "421492258308",
  appId: "1:421492258308:web:2605dec18ffbf8cac36751",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRIuZ2j6E6cDBpDGszOJSGT2HaRuY23xnuh8JWNNBC73jVdly_juU9SN_Xxa1SoY6TaW3cmPNZytM1S/pub?gid=0&single=true&output=csv";

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const normalize = (row) => ({
    date:         (row["date"] || row["날짜"] || "").trim(),
    type:         (row["type"] || row["카테고리"] || row["유형"] || "").trim(),
    content:      (row["content"] || row["내용"] || "").trim(),
    participants: (row["participants"] || row["사람"] || "").trim(),
  });
  const normalizeDate = (d) => {
    const m = d.match(/^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})$/);
    if (!m) return d;
    return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  };
  return lines.slice(1).map((line) => {
    const fields = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === "," && !inQ) { fields.push(cur.trim()); cur = ""; }
      else { cur += line[i]; }
    }
    fields.push(cur.trim());
    const raw = {};
    headers.forEach((h, i) => { raw[h] = fields[i] ?? ""; });
    const ev = normalize(raw);
    ev.date = normalizeDate(ev.date);
    return ev;
  }).filter((ev) => ev.date && ev.content);
}

async function seed() {
  console.log("Google Sheets에서 데이터 가져오는 중...");
  const res = await fetch(SHEET_CSV);
  const text = await res.text();
  const events = parseCSV(text);
  console.log(`${events.length}개 이벤트 발견`);

  for (const ev of events) {
    // 날짜+내용 기반 고정 ID → 중복 실행해도 덮어쓰기만 함
    const id = `${ev.date}_${ev.content.slice(0, 20).replace(/\s+/g, "_")}`;
    await setDoc(doc(db, "networking", id), ev);
    console.log(`  ✓ ${ev.date} - ${ev.content}`);
  }
  console.log("완료!");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
