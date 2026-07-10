import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CSV_CACHE_KEY = "plansCSV_v2";
const CSV_URL = "https://docs.google.com/spreadsheets/d/1yAeYVbqyFwePzjjdU0ile_OAmZ-cR8iwu_95KPVsx7o/export?format=csv&gid=0";
const CSV_TTL = 6 * 60 * 60 * 1000;

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

function parseDateToSeconds(str) {
  if (!str) return 0;
  const parts = str.trim().split(" ");
  const dateParts = parts[0].split(".");
  if (dateParts.length < 3) return 0;
  const timePart = parts[1] || "00:00";
  const [hh, mm] = timePart.split(":");
  // CSV의 날짜/시간은 항상 한국 시간(KST, UTC+9) 기준이므로
  // 실행 환경의 로컬 타임존과 무관하게 고정 오프셋으로 UTC epoch을 계산한다.
  const utcMs = Date.UTC(
    Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]),
    Number(hh || 0), Number(mm || 0)
  ) - 9 * 60 * 60 * 1000;
  return Math.floor(utcMs / 1000);
}

function loadCsvPlans() {
  try {
    const cached = JSON.parse(localStorage.getItem(CSV_CACHE_KEY) ?? "null");
    if (!cached?.rawText) return [];
    return parseCSV(cached.rawText)
      .map((r) => ({
        id: `csv-${r["이름"]}-${r["계획번호"]}`,
        planNumber: Number(r["계획번호"]) || 0,
        content: r["계획내용"],
        authorName: r["이름"],
        authorUid: null, // CSV에는 uid 없음
        status: r["상태"] === "완료" ? "done" : "active",
        createdAt: { seconds: parseDateToSeconds(r["생성일"]), nanoseconds: 0 },
        completedAt: r["상태"] === "완료"
          ? { seconds: parseDateToSeconds(r["완료일"] || r["생성일"]), nanoseconds: 0 }
          : null,
      }));
  } catch { return []; }
}

const LivePlansContext = createContext([]);
const LivePlansApiContext = createContext({});

export function LivePlansProvider({ children }) {
  const [localPlans, setLocalPlans] = useState([]);
  const [csvPlans, setCsvPlans] = useState(() => loadCsvPlans());

  const refreshCsv = useCallback(() => {
    fetch(CSV_URL)
      .then((r) => r.text())
      .then((text) => {
        if (text.trim().startsWith("<")) return;
        localStorage.setItem(CSV_CACHE_KEY, JSON.stringify({ ts: Date.now(), rawText: text }));
        setCsvPlans(loadCsvPlans());
      })
      .catch(() => {});
  }, []);

  // 캐시 없거나 만료됐으면 직접 fetch
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CSV_CACHE_KEY) ?? "null");
      if (cached && Date.now() - cached.ts < CSV_TTL) return;
    } catch {}
    refreshCsv();
  }, [refreshCsv]);

  // 6시간마다 CSV 자동 갱신
  useEffect(() => {
    const id = setInterval(() => {
      localStorage.removeItem(CSV_CACHE_KEY);
      refreshCsv();
    }, 6 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [refreshCsv]);

  const plans = useMemo(() => {
    const map = new Map();
    csvPlans.forEach((p) => map.set(`${p.authorName}||${p.planNumber}`, p));
    localPlans.forEach((p) => map.set(`${p.authorName}||${p.planNumber}`, p));
    return Array.from(map.values()).sort(
      (a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)
    );
  }, [csvPlans, localPlans]);

  const appendPlan = useCallback((plan) => {
    setLocalPlans((prev) => {
      const key = `${plan.authorName}||${plan.planNumber}`;
      if (prev.some((p) => `${p.authorName}||${p.planNumber}` === key)) return prev;
      return [...prev, plan];
    });
  }, []);

  const updatePlan = useCallback((id, changes) => {
    setLocalPlans((prev) => prev.map((p) => p.id === id ? { ...p, ...changes } : p));
  }, []);

  const removePlan = useCallback((id) => {
    setLocalPlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // CSV에서 온 항목까지 포함해 authorName+planNumber 기준으로 덮어쓰기 (삭제/수정 즉시 반영용)
  const upsertPlan = useCallback((plan) => {
    setLocalPlans((prev) => {
      const key = `${plan.authorName}||${plan.planNumber}`;
      const idx = prev.findIndex((p) => `${p.authorName}||${p.planNumber}` === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...plan };
        return next;
      }
      return [...prev, plan];
    });
  }, []);

  return (
    <LivePlansApiContext.Provider value={{ appendPlan, updatePlan, removePlan, upsertPlan, refreshCsv }}>
      <LivePlansContext.Provider value={plans}>
        {children}
      </LivePlansContext.Provider>
    </LivePlansApiContext.Provider>
  );
}

export function useLivePlans() { return useContext(LivePlansContext); }

export function usePlanMutations() {
  const ctx = useContext(LivePlansApiContext);
  return {
    appendPlan: ctx.appendPlan ?? (() => {}),
    updatePlan: ctx.updatePlan ?? (() => {}),
    removePlan: ctx.removePlan ?? (() => {}),
    upsertPlan: ctx.upsertPlan ?? (() => {}),
    refreshCsv: ctx.refreshCsv ?? (() => {}),
  };
}
