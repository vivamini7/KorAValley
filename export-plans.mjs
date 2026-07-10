import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { writeFileSync } from "fs";

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

function toKST(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function escapeCSV(v) {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

console.log("Fetching all completed plans from Firestore...");

const q = query(collection(db, "livePlans"), where("status", "==", "done"));
const snap = await getDocs(q);

console.log(`Found ${snap.docs.length} completed plans.`);

const rows = snap.docs.map((d) => {
  const p = d.data();
  return {
    id: d.id,
    planNumber: p.planNumber ?? "",
    authorName: p.authorName ?? "",
    content: p.content ?? "",
    status: p.status ?? "",
    createdAt: toKST(p.createdAt),
    completedAt: toKST(p.completedAt),
    editedAt: toKST(p.editedAt),
  };
});

rows.sort((a, b) => a.authorName.localeCompare(b.authorName) || (a.planNumber - b.planNumber));

const headers = ["id", "planNumber", "authorName", "content", "status", "createdAt", "completedAt", "editedAt"];
const csvLines = [
  headers.join(","),
  ...rows.map((r) => headers.map((h) => escapeCSV(r[h])).join(",")),
];

const filename = `completed-plans-${new Date().toISOString().slice(0, 10)}.csv`;
writeFileSync(filename, "﻿" + csvLines.join("\n"), "utf8"); // BOM for Excel

console.log(`Saved: ${filename} (${rows.length} rows)`);
process.exit(0);
