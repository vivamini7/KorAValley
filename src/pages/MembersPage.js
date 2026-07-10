import { useEffect, useMemo, useRef, useState } from "react";
import "./MembersPage.css";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { avatarMap, defaultAvatar } from "../utils/avatarMap";
import { useMembersMap, useAvatarByName } from "../context/MembersContext";
import EditProfileModal from "../components/EditProfileModal";

/* ── 메타데이터 (역할·아바타·focusing) ── */
import planData from "../data/planData.json";
import membersData from "../data/members.json";

import {
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend,
} from "recharts";

/* ======================
   탭 목록
   ====================== */
const PLAN_TABS = [
  { key: "all",      label: "All" },
  { key: "Founding", label: "Founder" },
  { key: "0기",      label: "0기" },
  { key: "1기",      label: "1기" },
  { key: "2기",      label: "2기" },
  { key: "3기",      label: "3기" },
];

/* ======================
   상수
   ====================== */

// Google Sheets CSV: 시트 수정 시 자동 반영
const CSV_URLS = [
  "https://docs.google.com/spreadsheets/d/1yAeYVbqyFwePzjjdU0ile_OAmZ-cR8iwu_95KPVsx7o/export?format=csv&gid=0",
];

// 월 레이블 → 배열 인덱스 (1월=0 … 5월=4)
// 현재 월까지만 표시 (월이 지나면 자동 추가)
const CURRENT_MONTH = new Date().getMonth() + 1; // 1~12
const MONTH_IDX = Object.fromEntries(
  Array.from({ length: CURRENT_MONTH }, (_, i) => [String(i + 1), i])
);
const LINE_LABELS = Array.from({ length: CURRENT_MONTH }, (_, i) => `${i + 1}월`);

// ── Focusing Area 자동 분류 키워드 (우선순위 순)
const FOCUS_CATEGORIES = [
  {
    label: "BIO-Medical",
    kws: ["의학", "의대", "임상", "nih", "환자", "수술", "의료", "clinical",
          "medical", "병원", "약학", "신약", "drug", "biotech", "nmr",
          "prostate", "바이오", "생명"],
  },
  {
    label: "AI / ML",
    kws: ["딥러닝", "deep learning", "llm", "gpt", "신경망", "transformer",
          "embedding", "인공지능", "machine learning", "computer vision", "nlp",
          "chatgpt", "강화학습", "자연어처리", "pytorch", "tensorflow",
          "huggingface", "physical ai", "rfm", "unetr", "rewardbench",
          "prompt", "token", "cls 토큰", "inv_loss", "loss", "diffusion"],
  },
  {
    label: "Investment / Finance",
    kws: ["투자", "주식", "금융", "finance", "investment", "cfa", "uscpa",
          "포트폴리오 운영", "퀀트", "etf", "채권", "자산", "세금", "회계",
          "accounting", "경제", "cpi", "회귀분석", "인덱스", "포트폴리오 구성"],
  },
  {
    label: "Development",
    kws: ["개발", "코드", "코딩", "구현", "앱", "app", "웹", "web", "ios",
          "android", "react", "node", "python", "github", "api", "sql",
          "database", "db", "버그", "bug", "리팩토링", "leetcode", "알고리즘",
          "서버", "백엔드", "프론트", "supabase", "mcp", "배포", "deploy"],
  },
  {
    label: "Research",
    kws: ["연구", "논문", "paper", "research", "실험", "랩", "lab",
          "저널", "학회", "arxiv", "리딩", "survey", "분석 리포트",
          "노션 정리", "literature review", "proposal"],
  },
  {
    label: "Career",
    kws: ["지원서", "인턴", "취업", "면접", "이력서", "포트폴리오", "링크드인",
          "linkedin", "resume", "job", "채용", "추천서", "cv", "레퍼런스",
          "지원 (", "지원하기", "테크캠프"],
  },
  {
    label: "Reading / Writing",
    kws: ["독서", "독후감", "완독", "reading", "book", "글쓰기", "블로그",
          "writing", "게시물", "아티클", "포스팅", "에세이", "미디엄"],
  },
  {
    label: "Health / Fitness",
    kws: ["운동", "헬스", "달리기", "피트니스", "workout", "gym", "exercise",
          "축구", "수영", "등산", "클라이밍", "climbing", "러닝", "요가",
          "루틴", "fitness"],
  },
  {
    label: "Side project",
    kws: ["사이드", "side", "창업", "스타트업", "startup", "서비스 오픈",
          "런칭", "출시", "프로덕트"],
  },
  {
    label: "Study / Learning",
    kws: ["공부", "스터디", "수업", "강의", "과제", "시험", "복습",
          "coursera", "자격증", "토익", "영어", "language", "학습",
          "예습", "강좌", "정리"],
  },
];


/* ======================
   CSV 파서 유틸
   ====================== */

/** 따옴표 안의 콤마를 올바르게 처리하는 CSV 한 줄 파서 */
function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // "" → 이스케이프된 따옴표
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === "," && !inQ) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

/** CSV 텍스트 → 객체 배열 (헤더 행 기준) */
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

/**
 * (이름, 계획번호) 중복 제거 — ID가 가장 높은(= 가장 최신) 행만 유지.
 * 같은 사람이 같은 계획번호를 여러 번 업데이트한 경우 최신 내용만 반영됨.
 */
function deduplicateRows(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = `${row["이름"]}||${row["계획번호"]}`;
    const prevId = Number(map.get(key)?.["ID"] ?? -1);
    const curId  = Number(row["ID"]  ?? 0);
    if (curId > prevId) {
      map.set(key, row);
    }
  });
  return Array.from(map.values());
}

/** "2025.3.15" → "25.3.15" (TodosView 날짜 정렬 포맷) */
function fmtDate(d) {
  if (!d) return "";
  const parts = d.split(".");
  if (parts.length !== 3) return d;
  return `${String(parts[0]).slice(-2)}.${parseInt(parts[1])}.${parseInt(parts[2])}`;
}

/** "2026.04.19" 또는 "2026.04.19 14:30" → Date */
function parsePlanDate(str) {
  if (!str) return null;
  const [datePart, timePart] = str.trim().split(" ");
  const parts = datePart.split(".");
  if (parts.length < 3) return null;
  const [h, m] = timePart ? timePart.split(":").map(Number) : [0, 0];
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), h, m);
}

const WEEK_ORDINALS = ["첫째", "둘째", "셋째", "넷째", "다섯째"];

/** Date → 해당 주 월요일 기준 "M월 N째주" 레이블 */
function getWeekLabel(date) {
  const d = new Date(date);
  const dow = d.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const mon = new Date(d);
  mon.setDate(d.getDate() - daysFromMon);
  const month = mon.getMonth() + 1;
  const weekIdx = Math.min(Math.floor((mon.getDate() - 1) / 7), 4);
  return `${month}월 ${WEEK_ORDINALS[weekIdx]}주`;
}

/** CSV rows → 주간 {week, plans, done, memberCount} 배열 (시간순) */
function computeWeeklyStats(rows) {
  const map = {};
  rows.forEach((row) => {
    const created = parsePlanDate(row["생성일"]);
    if (created) {
      const key = getWeekLabel(created);
      if (!map[key]) map[key] = { plans: 0, done: 0, _ts: created.getTime(), members: new Set() };
      map[key].plans++;
      if (row["이름"]) map[key].members.add(row["이름"]);
    }
    if (row["상태"] === "완료") {
      const completed = parsePlanDate(row["완료일"]) || parsePlanDate(row["생성일"]);
      if (completed) {
        const key = getWeekLabel(completed);
        if (!map[key]) map[key] = { plans: 0, done: 0, _ts: completed.getTime(), members: new Set() };
        map[key].done++;
      }
    }
  });
  return Object.entries(map)
    .sort((a, b) => a[1]._ts - b[1]._ts)
    .map(([week, { plans, done, members }]) => ({
      week, plans, done,
      memberCount: members.size,
    }));
}

/** 이번주 월요일 기준으로 전주 월~일 범위 반환 */
function getPrevWeekRange() {
  const today = new Date();
  const dow = today.getDay(); // 0=일
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const thisMon = new Date(today);
  thisMon.setDate(today.getDate() - daysFromMon);
  thisMon.setHours(0, 0, 0, 0);
  const prevMon = new Date(thisMon);
  prevMon.setDate(thisMon.getDate() - 7);
  const prevSun = new Date(thisMon);
  prevSun.setDate(thisMon.getDate() - 1);
  prevSun.setHours(23, 59, 59, 999);
  return { start: prevMon, end: prevSun };
}

/* ======================
   Focusing Area 자동 분류 (키워드 기반)
   각 계획을 첫 번째 매칭 카테고리에 할당 → 상위 4개 + 나머지는 기타
   ====================== */
function computeFocusing(rows, name) {
  const memberRows = rows.filter((r) => r["이름"] === name);
  if (memberRows.length === 0) return [];

  const counts = {};

  memberRows.forEach((row) => {
    const text = (row["계획내용"] || "").toLowerCase();
    for (const cat of FOCUS_CATEGORIES) {
      if (cat.kws.some((kw) => text.includes(kw.toLowerCase()))) {
        counts[cat.label] = (counts[cat.label] || 0) + 1;
        break;
      }
    }
  });

  const total = memberRows.length;

  // 카운트 내림차순 정렬, 상위 4개만
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top4 = sorted.slice(0, 4);

  const result = top4.map(([label, count]) => ({
    label,
    value: Math.round((count / total) * 100),
  }));

  return result;
}

/* ======================
   통계 계산 (CSV rows → stats + todos)
   ====================== */
function computeMember(rows, name) {
  const r = rows.filter((row) => row["이름"] === name);
  const total = r.length;
  const done = r.filter((row) => row["상태"] === "완료").length;
  const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;

  const plansSeries    = Array(CURRENT_MONTH).fill(0);
  const finishedSeries = Array(CURRENT_MONTH).fill(0);

  r.forEach((row) => {
    if (row["생성일"]) {
      const parts = row["생성일"].split(".");
      if (parts.length >= 2) {
        const idx = MONTH_IDX[String(parseInt(parts[1]))];
        if (idx !== undefined) plansSeries[idx]++;
      }
    }
    if (row["상태"] === "완료" && row["완료일"]) {
      const parts = row["완료일"].split(".");
      if (parts.length >= 2) {
        const idx = MONTH_IDX[String(parseInt(parts[1]))];
        if (idx !== undefined) finishedSeries[idx]++;
      }
    }
  });

  const todos = r
    .filter((row) => row["상태"] === "미완료")
    .sort((a, b) => Number(b["계획번호"]) - Number(a["계획번호"]))
    .map((row) => ({
      id:    Number(row["계획번호"]),
      title: row["계획내용"],
      due:   fmtDate(row["생성일"]),
    }));

  const dones = r
    .filter((row) => row["상태"] === "완료")
    .sort((a, b) => Number(b["계획번호"]) - Number(a["계획번호"]))
    .map((row) => ({
      id:    Number(row["계획번호"]),
      title: row["계획내용"],
      due:   fmtDate(row["완료일"] || row["생성일"]),
    }));

  return { progressPercent, plansSeries, finishedSeries, todos, dones };
}

/* ======================
   컴포넌트 공통 버튼
   ====================== */
function PillButton({ active, children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`plansTopBtn ${active ? "active" : ""}`}
    >
      {children}
    </button>
  );
}


/* ======================
   원형 진행 아크 SVG
   ====================== */
const PRIZE_ARC_COLORS = ["rgba(255,200,0,0.95)", "rgba(192,192,192,0.95)", "rgba(195,120,50,0.95)"];

function CircularProgress({ percent, prizeIdx }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, percent ?? 0)) / 100);
  const arcColor = prizeIdx != null && prizeIdx >= 0 ? PRIZE_ARC_COLORS[prizeIdx] : "rgba(55,185,235,0.92)";
  return (
    <svg className="plansCircleRing" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none"
        stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
      <circle cx="50" cy="50" r={r} fill="none"
        stroke={arcColor} strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50px 50px" }}
        className="plansCircleArc"
      />
    </svg>
  );
}

const PRIZE_ICONS = ["👑", "🥈", "🥉"];

/* ======================
   아이콘 (메일 / 기타 링크)
   ====================== */
function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

function BlogIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5V6a2 2 0 0 1 2-2h11l3 3v12.5a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19.5Z" />
      <path d="M9 8h7" />
      <path d="M9 12h7" />
      <path d="M9 16h4" />
    </svg>
  );
}

/* ======================
   왼쪽 프로필 패널
   ====================== */
function ProfilePanel({ member, canEdit, onEdit }) {
  const [copied, setCopied] = useState(false);
  if (!member) return null;

  const links = member.links || {};
  const bullets = Array.isArray(member.bullets) ? member.bullets : [];
  const goals = Array.isArray(member.goals) ? member.goals : [];
  const email = (member.email || links.email || "").trim();
  const customLinks = Array.isArray(links.custom) ? links.custom.filter((c) => c.url?.trim()) : [];

  const copyEmail = async (e) => {
    e.stopPropagation();
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = email;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 900);
  };

  return (
    <div className="profilePanel">
      {canEdit && (
        <button className="memberEditBtn" onClick={onEdit} aria-label="프로필 수정" title="프로필 수정">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      )}
      {!!member.quote && <p className="profileQuote">{member.quote}</p>}
      {bullets.length > 0 && (
        <ul className="profileBullets">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}
      {goals.length > 0 && (
        <div className="profileGoals">
          <h4 className="profileGoalsTitle">Goals</h4>
          <ul>
            {goals.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}
      {(!!links.linkedin?.trim() || !!links.medium?.trim() || !!email) && (
        <div className="profileLinksList profileLinksRow">
          {!!links.linkedin?.trim() && (
            <a className="profileLinkRow" href={links.linkedin} target="_blank" rel="noreferrer">
              <LinkedinIcon />
              <span>LinkedIn</span>
            </a>
          )}
          {!!links.medium?.trim() && (
            <a className="profileLinkRow" href={links.medium} target="_blank" rel="noreferrer">
              <BlogIcon />
              <span>Medium</span>
            </a>
          )}
          {!!email && (
            <button type="button" className="profileLinkRow" onClick={copyEmail}>
              <MailIcon />
              <span>{copied ? "Copied!" : email}</span>
            </button>
          )}
        </div>
      )}
      {customLinks.length > 0 && (
        <div className="profileLinksList">
          {customLinks.map((c, i) => (
            <a key={i} className="profileLinkRow" href={c.url} target="_blank" rel="noreferrer">
              <BlogIcon />
              <span>{c.label?.trim() || c.url}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ======================
   PlansPage (메인)
   ====================== */
export default function MembersPage() {
  const { currentUser, memberId } = useAuth();
  const membersMap = useMembersMap();
  const [mode, setMode] = useState("list");   // "list" | "detail" | "overall"
  const [view, setView] = useState("stats");  // "stats" | "todos"
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // MembersContext에서 role 오버라이드 맵 (추가 읽기 없음)
  const fsRoles = useMemo(() => {
    const map = {};
    Object.values(membersMap).forEach((m) => {
      if (m.name && m.role) map[m.name] = m.role;
    });
    return map;
  }, [membersMap]);

  // 오션 에디션 감지 (body 클래스 변화 감시)
  const [goldenMode, setGoldenMode] = useState(
    () => document.body.classList.contains("ocean-mode")
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setGoldenMode(document.body.classList.contains("ocean-mode"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const cohorts = useMemo(() => Object.keys(planData ?? {}), []);
  const [selectedCohort, setSelectedCohort] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const applyOverride = useMemo(() => (m) => {
    const fs = membersMap[m.name];
    return {
      ...m,
      ...(fsRoles[m.name] ? { role: fsRoles[m.name] } : {}),
      ...(fs?.avatarUrl ? { avatarUrl: fs.avatarUrl } : {}),
    };
  }, [fsRoles, membersMap]);

  const members = useMemo(() => {
    const raw = selectedCohort === "all"
      ? cohorts.flatMap((c) => planData[c]?.members ?? [])
      : planData?.[selectedCohort]?.members ?? [];
    return raw.map(applyOverride);
  }, [selectedCohort, cohorts, applyOverride]);

  const membersByCohort = useMemo(
    () => cohorts.map((c) => ({
      key: c,
      label: PLAN_TABS.find((t) => t.key === c)?.label ?? c,
      members: (planData[c]?.members ?? []).map(applyOverride),
    })),
    [cohorts, applyOverride]
  );

  const [selectedName, setSelectedName] = useState("");
  const current = useMemo(
    () => members.find((m) => m.name === selectedName) ?? null,
    [members, selectedName]
  );
  const currentAvatarSrc = useAvatarByName(current?.name);

  /* ── 프로필 패널 (좌측) + 수정 ── */
  const [editTarget, setEditTarget] = useState(null);
  const fullMember = useMemo(() => {
    if (!current) return null;
    return membersMap[current.name] ?? membersData.find((m) => m.name === current.name) ?? null;
  }, [current, membersMap]);
  const canEdit = !!(currentUser && memberId != null && fullMember && String(memberId) === String(fullMember.id));

  /* ── CSV fetch ── */
  const [csvRows, setCsvRows]   = useState([]);
  const [csvLoading, setCsvLoading] = useState(true);
  const [csvError, setCsvError] = useState(false);
  const setLastUpdated = () => {};

  const CSV_CACHE_KEY = "plansCSV_v2";
  const CSV_CACHE_TTL = 60 * 60 * 1000; // 1시간

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CSV_CACHE_KEY) ?? "null");
      if (cached && Date.now() - cached.ts < CSV_CACHE_TTL && cached.rawText) {
        const rows = deduplicateRows(parseCSV(cached.rawText));
        const latest = rows.reduce((best, row) =>
          Number(row["ID"] ?? 0) > Number(best["ID"] ?? 0) ? row : best, rows[0]);
        setCsvRows(rows);
        if (latest?.["생성일"]) setLastUpdated(latest["생성일"]);
        setCsvLoading(false);
        return;
      }
    } catch {}

    setCsvLoading(true);
    setCsvError(false);
    Promise.all(CSV_URLS.map((url) =>
      fetch(url).then((r) => { if (!r.ok) throw new Error("fetch"); return r.text(); })
    ))
      .then((texts) => {
        const allRows = texts.flatMap((text) => parseCSV(text));
        const latest = allRows.reduce((best, row) =>
          Number(row["ID"] ?? 0) > Number(best["ID"] ?? 0) ? row : best, allRows[0]);
        if (latest?.["생성일"]) setLastUpdated(latest["생성일"]);
        const rows = deduplicateRows(allRows);
        setCsvRows(rows);
        try {
          localStorage.setItem(CSV_CACHE_KEY, JSON.stringify({ ts: Date.now(), rawText: texts[0] }));
        } catch {}
      })
      .catch(() => { setCsvError(true); })
      .finally(() => { setCsvLoading(false); });
  }, []);

  /* ── 선택된 멤버의 통계 (CSV 기준) ── */
  const computed = useMemo(() => {
    if (!current || csvRows.length === 0) return null;
    return computeMember(csvRows, current.name);
  }, [csvRows, current]);

  // StatsView에 넘길 stats
  const stats = useMemo(() => {
    if (!computed || !current) return null;
    return {
      progressPercent: computed.progressPercent,
      lineLabels:      LINE_LABELS,
      plansSeries:     computed.plansSeries,
      finishedSeries:  computed.finishedSeries,
      focusing:        computeFocusing(csvRows, current.name),
    };
  }, [computed, current, csvRows]);

  /* ── 멤버별 요약 통계 (카드에 표시) ── */
  const memberStats = useMemo(() => {
    if (csvRows.length === 0) return {};
    const allMembers = cohorts.flatMap((c) => planData[c]?.members ?? []);
    const result = {};
    allMembers.forEach((m) => {
      const r = csvRows.filter((row) => row["이름"] === m.name);
      const total = r.length;
      const done = r.filter((row) => row["상태"] === "완료").length;
      result[m.name] = { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
    return result;
  }, [csvRows, cohorts]);

  /* ── 전주 Top 3 ── */
  const weeklyTop3 = useMemo(() => {
    if (csvRows.length === 0) return [];
    const { start, end } = getPrevWeekRange();
    const counts = {};
    csvRows.forEach((row) => {
      if (row["상태"] !== "완료") return;
      const d = parsePlanDate(row["완료일"]) || parsePlanDate(row["생성일"]);
      if (!d || d < start || d > end) return;
      counts[row["이름"]] = (counts[row["이름"]] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [csvRows]);

  /* ── 바깥 클릭 시 모바일 메뉴 닫기 ── */
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [menuOpen]);

  /* ── 핸들러 ── */
  const handleChangeCohort = (key) => {
    setSelectedCohort(key);
    setSelectedName("");
    setMode("list");
    setView("stats");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const enterDetail = (m) => {
    setSelectedName(m.name);
    setMode("detail");
    setView("stats");
  };

  const renderMemberCard = (m) => {
    const st = memberStats[m.name];
    const prizeIdx = weeklyTop3.findIndex((r) => r.name === m.name);
    return (
      <button
        key={m.name}
        className="plansMemberCard"
        type="button"
        onClick={() => enterDetail(m)}
      >
        <div className="plansMemberInner">
          <div className="plansAvatarWrap">
            {st && <CircularProgress percent={st.percent} prizeIdx={prizeIdx !== -1 ? prizeIdx : null} />}
            <div className="plansAvatarCircle">
              <img
                src={m.avatarUrl || avatarMap[m.avatarKey] || defaultAvatar}
                alt={m.name}
                className="plansAvatarImg"
              />
            </div>
            {prizeIdx !== -1 && (
              <span className={`weeklyPrizeBadge weeklyPrizeBadge--${prizeIdx + 1}`}>
                {PRIZE_ICONS[prizeIdx]}
              </span>
            )}
          </div>
          <div className="plansMemberName">{m.name}</div>
          <div className="plansMemberRole">{m.role}</div>
          {st && (
            <div className="plansMemberCountRow">
              <span className="plansMemberDone">{st.done}</span>
              <span className="plansMemberCountSep">/</span>
              <span className="plansMemberCountTotal">{st.total}</span>
              <span className="plansMemberPctBadge">{st.percent}%</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  const renderMemberRow = (m) => {
    const st = memberStats[m.name];
    const prizeIdx = weeklyTop3.findIndex((r) => r.name === m.name);
    const quote = membersMap[m.name]?.quote ?? membersData.find((md) => md.name === m.name)?.quote ?? "";
    return (
      <button
        key={m.name}
        className={`membersListRow${prizeIdx !== -1 ? ` membersListRow--prize${prizeIdx + 1}` : ""}`}
        type="button"
        onClick={() => enterDetail(m)}
      >
        <div className="membersListAvatarWrap">
          <img
            src={m.avatarUrl || avatarMap[m.avatarKey] || defaultAvatar}
            alt={m.name}
            className="membersListAvatar"
          />
          {prizeIdx !== -1 && (
            <span className={`weeklyPrizeBadge weeklyPrizeBadge--${prizeIdx + 1} membersListPrizeBadge`}>
              {PRIZE_ICONS[prizeIdx]}
            </span>
          )}
        </div>
        <div className="membersListInfo">
          <div className="membersListNameRow">
            <span className="membersListName">{m.name}</span>
            <span className="membersListRole">{m.role}</span>
          </div>
          {quote && <div className="membersListQuote">{quote}</div>}
        </div>
        {st && (
          <div className="membersListStats">
            <span className="membersListDone">{st.done}</span>
            <span className="plansMemberCountSep">/</span>
            <span className="membersListTotal">{st.total}</span>
            <span className="plansMemberPctBadge">{st.percent}%</span>
          </div>
        )}
      </button>
    );
  };

  const resetToList = () => {
    setMode("list");
    setSelectedName("");
    setView("stats");
  };

  const handleUncompletedClick = () => {
    if (currentUser) {
      setView("todos");
    } else {
      setShowLoginPrompt(true);
    }
  };

  const selectedTabIndex = PLAN_TABS.findIndex((t) => t.key === selectedCohort);
  const currentTabLabel = PLAN_TABS.find((t) => t.key === selectedCohort)?.label ?? selectedCohort;

  /* ── 렌더 ── */
  return (
    <div className="plansPage">
      <div className="bg" />
      <div className="glow" />
      <Navbar onMembersClick={resetToList} />

      {showLoginPrompt && (
        <LoginPromptModal onClose={() => setShowLoginPrompt(false)} />
      )}

      <main className="wrap">
        {/* 상단 헤더 */}
        {mode === "detail" && current ? (
          <div className="plansDetailHeaderCol">
            <div className="plansTopLine">
              <div className="plansPersonRow">
                <img className="plansPersonAvatar" src={currentAvatarSrc} alt={current.name} />
                <div className="plansName">{current.name}</div>
                <div className="plansRolePill">{current.role}</div>
              </div>
              <div className="plansRightBtns">
                <div className="plansToggleRow">
                  <PillButton active={view === "stats"} onClick={() => setView("stats")}>
                    Statistics
                  </PillButton>
                  <PillButton active={view === "todos"} onClick={handleUncompletedClick}>
                    Plans
                  </PillButton>
                </div>
              </div>
            </div>
          </div>
        ) : mode === "overall" ? (
          <div className="plansTopLine" style={{ marginBottom: 24 }}>
            <div className="plansPersonRow">
              <div className="plansName" style={{ fontSize: 30 }}>전체 통계</div>
              <div className="plansRolePill">26년도 통계자료</div>
            </div>
            <button className="plansBackText" onClick={() => setMode("list")}>← 목록으로</button>
          </div>
        ) : (
          <>
            {/* 데스크탑: 슬라이딩 세그먼트 탭 + 전체 통계 버튼 */}
            <div className="plansListTopRow">
              <div className="plansSegmentTabs">
                <div
                  className="plansSegmentSlider"
                  style={{ transform: `translateX(${selectedTabIndex * 100}%)` }}
                />
                {PLAN_TABS.map((t) => (
                  <button
                    key={t.key}
                    className={`plansSegmentBtn${selectedCohort === t.key ? " active" : ""}`}
                    onClick={() => handleChangeCohort(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button className="plansOverallBtn" onClick={() => setMode("overall")}>전체 통계</button>
            </div>

            {/* 모바일: 드롭다운 */}
            <div className="plansGenDropdownWrap" ref={menuRef}>
              <button
                className="plansGenDropdownBtn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
              >
                <span>{currentTabLabel}</span>
                <span className={`plansGenDropdownArrow${menuOpen ? " open" : ""}`}>▾</span>
              </button>
              {menuOpen && (
                <div className="plansGenDropdownMenu">
                  {PLAN_TABS.map((t) => (
                    <button
                      key={t.key}
                      className={`plansGenDropdownItem${selectedCohort === t.key ? " active" : ""}`}
                      onClick={() => handleChangeCohort(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="plansOverallBtnMobile" onClick={() => setMode("overall")}>전체 통계 보기 →</button>
          </>
        )}

        {/* 멤버 목록 */}
        {mode === "list" && (
          <section className="plansMembersSection">
            {csvLoading ? (
              <div className="plansMembersGrid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="plansMemberSkeletonCard" aria-hidden="true" />
                ))}
              </div>
            ) : selectedCohort === "all" ? (
              <div className="membersCohortColumns">
                {membersByCohort.map((group) => (
                  group.members.length > 0 && (
                    <div className="membersCohortSection" id={`cohort-${group.key}`} key={group.key}>
                      <h3 className="membersCohortTitle">{group.label}</h3>
                      <div className="membersListGroup">
                        {group.members.map((m) => renderMemberRow(m))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className="membersListGroup">
                {members.map((m) => renderMemberRow(m))}
              </div>
            )}
          </section>
        )}

        {/* 전체 통계 */}
        {mode === "overall" && (
          csvLoading ? (
            <div className="csvStatusMsg">데이터 불러오는 중…</div>
          ) : (
            <OverallStatsView csvRows={csvRows} golden={goldenMode} totalMembers={members.length} />
          )
        )}

        {/* 상세 화면 */}
        {mode === "detail" && current && (
          <>
            {/* 내 프로필 설정 버튼: 로그인했지만 memberId 미설정이고 아직 다른 사람으로 매핑 안 된 경우 */}
            {currentUser && memberId == null && (
              <ClaimProfileBanner
                currentUser={currentUser}
                memberName={current.name}
              />
            )}
            <div className="membersDetailGrid">
              <ProfilePanel
                member={fullMember}
                canEdit={canEdit}
                onEdit={() => setEditTarget(fullMember)}
              />
              <div className="membersDetailMain">
                {csvLoading ? (
                  <div className="csvStatusMsg">데이터 불러오는 중…</div>
                ) : csvError ? (
                  <div className="csvStatusMsg csvStatusError">
                    데이터를 불러오지 못했어요.{" "}
                    <code>public/data/plans.csv</code> 파일을 확인해주세요.
                  </div>
                ) : view === "stats" ? (
                  <StatsView stats={stats} golden={goldenMode} />
                ) : (
                  <CsvPlanList
                    todos={computed?.todos ?? []}
                    dones={computed?.dones ?? []}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {editTarget && (
        <EditProfileModal
          member={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}

/* ======================
   Overall Stats View
   ====================== */
function OverallStatsView({ csvRows, golden, totalMembers }) {
  const [chartType, setChartType] = useState("bar"); // "bar" | "line"

  const rows = useMemo(
    () => csvRows.filter((r) => (r["생성일"] || "").startsWith("2026")),
    [csvRows]
  );

  const totalPlans = rows.length;
  const totalDone  = rows.filter((r) => r["상태"] === "완료").length;
  const totalRate  = totalPlans > 0 ? Math.round((totalDone / totalPlans) * 100) : 0;

  const EXCLUDED_WEEKS = new Set([
    "4월 첫째주",
    "6월 넷째주",
    "7월 둘째주",
    "8월 첫째주",
    "9월 둘째주", "9월 다섯째주",
    "10월 셋째주",
    "11월 둘째주",
    "12월 첫째주", "12월 넷째주",
  ]);

  const weeklyData = useMemo(
    () => computeWeeklyStats(rows).filter((d) => !EXCLUDED_WEEKS.has(d.week)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows]
  );

  const topPerformers = useMemo(() => {
    const counts = {};
    const totals = {};
    rows.forEach((row) => {
      const name = row["이름"];
      if (!name) return;
      totals[name] = (totals[name] || 0) + 1;
      if (row["상태"] === "완료") counts[name] = (counts[name] || 0) + 1;
    });
    return Object.keys(totals)
      .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
      .slice(0, 10)
      .map((name) => ({ name, done: counts[name] || 0, total: totals[name] }));
  }, [rows]);

  const scatterData = useMemo(() => {
    const areaMap = {};
    rows.forEach((row) => {
      const text = (row["계획내용"] || "").toLowerCase();
      for (const cat of FOCUS_CATEGORIES) {
        if (cat.kws.some((kw) => text.includes(kw.toLowerCase()))) {
          if (!areaMap[cat.label]) areaMap[cat.label] = { total: 0, done: 0 };
          areaMap[cat.label].total++;
          if (row["상태"] === "완료") areaMap[cat.label].done++;
          break;
        }
      }
    });
    return Object.entries(areaMap)
      .map(([label, { total, done }]) => ({
        label,
        total,
        done,
        rate: total > 0 ? Math.round((done / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);


  const avgWeeklyData = useMemo(
    () => weeklyData.map((d) => ({
      week: d.week,
      avgPlans: d.memberCount > 0 ? +(d.plans / d.memberCount).toFixed(1) : 0,
      avgDone:  d.memberCount > 0 ? +(d.done  / d.memberCount).toFixed(1) : 0,
    })),
    [weeklyData]
  );


  const C_PLANS = golden ? "rgba(255,105,85,0.90)"  : "rgba(50,175,235,0.90)";
  const C_DONE  = golden ? "rgba(255,190,170,0.80)" : "rgba(130,220,250,0.75)";

  const ttStyle = {
    background: "rgba(10,12,28,0.92)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "rgba(255,255,255,0.95)",
    fontSize: 12,
  };

  const axTick = { fill: "rgba(255,255,255,0.65)", fontSize: 11 };

  return (
    <div className="statsWrap">
      {/* 요약 숫자 카드 */}
      <div className="overallSummaryRow">
        <div className="overallStatCard overallStatCard--blue">
          <div className="overallStatAccent" />
          <div className="overallStatNum">{totalPlans.toLocaleString()}</div>
          <div className="overallStatLabel">총 계획</div>
        </div>
        <div className="overallStatCard overallStatCard--green">
          <div className="overallStatAccent" />
          <div className="overallStatNum">{totalDone.toLocaleString()}</div>
          <div className="overallStatLabel">총 완료</div>
        </div>
        <div className="overallStatCard overallStatCard--teal">
          <div className="overallStatAccent" />
          <div className="overallStatNum">{totalRate}%</div>
          <div className="overallStatLabel">완료율</div>
          <div className="overallRateBar">
            <div className="overallRateBarFill" style={{ width: `${totalRate}%` }} />
          </div>
        </div>
        <div className="overallStatCard overallStatCard--purple">
          <div className="overallStatAccent" />
          <div className="overallStatNum">{totalMembers}</div>
          <div className="overallStatLabel">전체 멤버</div>
        </div>
      </div>

      {/* 주간 추이 차트 (Bar / Line 토글) */}
      <div className="statsCard">
        <div className="overallChartHeader">
          <div className="statsCardTitle">주간 계획 추이</div>
          <div className="chartTypeBtns">
            <button
              className={`chartTypeBtn${chartType === "bar" ? " active" : ""}`}
              onClick={() => setChartType("bar")}
            >Bar</button>
            <button
              className={`chartTypeBtn${chartType === "line" ? " active" : ""}`}
              onClick={() => setChartType("line")}
            >Line</button>
          </div>
        </div>
        <div style={{ width: "100%", height: 230, marginTop: 8 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={weeklyData} margin={{ top: 6, right: 18, left: 0, bottom: 0 }}>
                <XAxis dataKey="week" tick={axTick} interval="preserveStartEnd" />
                <YAxis tick={axTick} />
                <Tooltip contentStyle={ttStyle} labelStyle={{ color: "rgba(255,255,255,0.9)" }} />
                <Legend wrapperStyle={{ color: "rgba(255,255,255,0.80)", fontSize: 12 }} />
                <Bar dataKey="plans" name="계획 생성" fill={C_PLANS} radius={[3,3,0,0]} />
                <Bar dataKey="done"  name="완료"     fill={C_DONE}  radius={[3,3,0,0]} />
              </BarChart>
            ) : (
              <LineChart data={weeklyData} margin={{ top: 6, right: 18, left: 0, bottom: 0 }}>
                <XAxis dataKey="week" tick={axTick} interval="preserveStartEnd" />
                <YAxis tick={axTick} />
                <Tooltip contentStyle={ttStyle} labelStyle={{ color: "rgba(255,255,255,0.9)" }} />
                <Legend wrapperStyle={{ color: "rgba(255,255,255,0.80)", fontSize: 12 }} />
                <Line type="monotone" dataKey="plans" name="계획 생성" stroke={C_PLANS} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="done"  name="완료"     stroke={C_DONE}  strokeWidth={2.5} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 인당 평균 */}
      <div className="statsCard">
        <div className="statsCardTitle">주간 인당 평균</div>
        <div style={{ width: "100%", height: 200, marginTop: 8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={avgWeeklyData} margin={{ top: 6, right: 18, left: 0, bottom: 0 }}>
              <XAxis dataKey="week" tick={axTick} interval="preserveStartEnd" />
              <YAxis tick={axTick} />
              <Tooltip contentStyle={ttStyle} labelStyle={{ color: "rgba(255,255,255,0.9)" }} />
              <Legend wrapperStyle={{ color: "rgba(255,255,255,0.80)", fontSize: 12 }} />
              <Line type="monotone" dataKey="avgPlans" name="인당 계획" stroke={C_PLANS} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="avgDone"  name="인당 완료" stroke={C_DONE}  strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 하단 2열 */}
      <div className="statsTopRow">
        {/* Top 완료자 (메달 포함) */}
        <div className="statsCard">
          <div className="statsCardTitle">Top 완료</div>
          <div className="topPerformersList">
            {topPerformers.map((p, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <div key={p.name} className={`topPerformerRow${i < 3 ? " topPerformerRow--medal" : ""}`}>
                  {medal
                    ? <span className="topPerformerMedal">{medal}</span>
                    : <span className="topPerformerRank">#{i + 1}</span>
                  }
                  <span className="topPerformerName">{p.name}</span>
                  <span className="topPerformerStats">
                    {p.done}<span className="topPerformerSep">/</span>{p.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 가로 Bar chart — 분야별 계획 수 · 완료 */}
        <div className="statsCard wide">
          <div className="statsCardTitle">분야별 계획 현황</div>
          <div style={{ width: "100%", height: 320, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={scatterData}
                layout="vertical"
                margin={{ top: 4, right: 36, left: 8, bottom: 4 }}
                barCategoryGap="28%"
              >
                <XAxis type="number" tick={axTick} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: "rgba(255,255,255,0.82)", fontSize: 11, fontWeight: 700 }}
                  width={130}
                />
                <Tooltip contentStyle={ttStyle} />
                <Legend wrapperStyle={{ color: "rgba(255,255,255,0.80)", fontSize: 12 }} />
                <Bar dataKey="total" name="계획 수" fill={C_PLANS} radius={[0,4,4,0]} />
                <Bar dataKey="done"  name="완료"   fill={C_DONE}  radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================
   Stats View
   ====================== */
function StatsView({ stats, golden }) {
  if (!stats) return null;

  const complete  = Math.max(0, Math.min(100, Number(stats.progressPercent ?? 0)));
  const incomplete = 100 - complete;

  const DONUT_COLORS = golden
    ? ["rgba(255, 105, 85, 0.95)", "rgba(255, 205, 190, 0.18)"]
    : ["rgba(50, 175, 235, 0.95)", "rgba(60, 200, 240, 0.18)"];

  const LINE_PLANS_COLOR    = golden ? "rgba(255, 105, 85, 0.95)" : "rgba(50,175,235,0.95)";
  const LINE_FINISHED_COLOR = golden ? "rgba(255, 190, 170, 0.85)" : "rgba(130,220,250,0.75)";

  const donutData = [
    { name: "완료", value: complete },
    { name: "미완료", value: incomplete },
  ];

  const chartData = LINE_LABELS.map((label, idx) => ({
    month:    label,
    Plans:    stats.plansSeries?.[idx]    ?? 0,
    Finished: stats.finishedSeries?.[idx] ?? 0,
  }));

  const maxFocus = Math.max(1, ...(stats.focusing ?? []).map((x) => Number(x.value ?? 0)));

  return (
    <div className="statsWrap">
      <div className="statsTopRow">
        <div className="statsCard">
          <div className="statsCardTitle">총 계획 현황</div>
          <div className="donutWrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                  stroke="rgba(255,255,255,0.08)"
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donutCenter">
              <div className="donutPercent">{complete}%</div>
              <div className="donutLabel">완료</div>
            </div>
          </div>
          <div className="donutLegend">
            {donutData.map((d, i) => (
              <div key={d.name} className="donutLegendItem">
                <span className="donutLegendDot" style={{ background: DONUT_COLORS[i] }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>

        <div className="statsCard wide">
          <div className="statsCardTitle">월별 계획 추이</div>
          <div className="lineWrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.85)", fontSize: 12 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10,12,28,0.90)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    color: "rgba(255,255,255,0.95)",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.9)" }}
                />
                <Legend wrapperStyle={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }} />
                <Line type="monotone" dataKey="Plans"    stroke={LINE_PLANS_COLOR}    strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="Finished" stroke={LINE_FINISHED_COLOR} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="statsCard tall">
        <div className="statsCardTitle">Focusing Area</div>
        <div className="focusList">
          {(stats.focusing ?? []).map((x) => {
            const raw = Number(x.value ?? 0);
            const pct = Math.round((raw / maxFocus) * 100);
            return (
              <div className="focusItem" key={x.label}>
                <div className="focusLabelRow">
                  <div className="focusLabel">{x.label}</div>
                </div>
                <div className="focusBarFill" style={{ width: `${pct}%` }}>
                  <span className="focusBarPct">{raw}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ======================
   Login Prompt Modal
   ====================== */
function ClaimProfileBanner({ currentUser, memberName }) {
  const [done, setDone] = useState(false);
  const member = membersData.find((m) => m.name === memberName);

  const handleClaim = () => {
    if (!member) return;
    try {
      const cacheKey = `kv_profile_${currentUser.uid}`;
      localStorage.setItem(cacheKey, JSON.stringify({ memberId: member.id }));
    } catch {}
    setDone(true);
    window.location.reload();
  };

  if (done || !member) return null;
  return (
    <div style={{
      background: "rgba(50,100,200,0.15)", border: "1px solid rgba(80,140,255,0.25)",
      borderRadius: 10, padding: "10px 16px", marginBottom: 12,
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <span style={{ fontSize: 12, color: "rgba(180,210,255,0.85)" }}>
        이 프로필이 내 프로필인가요?
      </span>
      <button
        onClick={handleClaim}
        style={{
          background: "rgba(60,120,255,0.7)", border: "none", borderRadius: 8,
          color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 14px", cursor: "pointer",
        }}
      >
        내 프로필로 설정
      </button>
    </div>
  );
}

function LoginPromptModal({ onClose }) {
  return (
    <div className="pwModalOverlay" onClick={onClose}>
      <div className="pwModal" onClick={(e) => e.stopPropagation()}>
        <div className="pwModalTitle">Members Only</div>
        <div className="pwModalDesc">미완료 계획은 로그인한 회원에게만 공개됩니다.</div>
        <button type="button" className="pwModalBtn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

/* ======================
   CSV 읽기 전용 계획 목록
   ====================== */
function CsvPlanList({ todos, dones }) {
  const [tab, setTab] = useState('active');
  const [sort, setSort] = useState('latest');
  const items = tab === 'active' ? todos : dones;
  const sorted = sort === 'oldest' ? [...items].reverse() : items;
  return (
    <div className="todosCard">
      <div className="todosHeader">
        <div className="todosTabBtns">
          <button type="button" className={`todosSortBtn ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
            미완료 <span className="todosTabCount">{todos.length}</span>
          </button>
          <button type="button" className={`todosSortBtn ${tab === 'done' ? 'active' : ''}`} onClick={() => setTab('done')}>
            완료 <span className="todosTabCount">{dones.length}</span>
          </button>
        </div>
        <div className="todosSortBtns">
          <button type="button" className={`todosSortBtn ${sort === 'latest' ? 'active' : ''}`} onClick={() => setSort('latest')}>Newest</button>
          <button type="button" className={`todosSortBtn ${sort === 'oldest' ? 'active' : ''}`} onClick={() => setSort('oldest')}>Oldest</button>
        </div>
      </div>
      <ul className="todosList">
        {sorted.length === 0 ? (
          <li style={{ padding: "32px 0", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
            {tab === 'active' ? '미완료 계획이 없어요 🎉' : '완료된 계획이 없어요.'}
          </li>
        ) : sorted.map((t) => (
          <li key={t.id} className="todoRow">
            <div className="todoLeft">
              <span className="todoId">{t.id}번</span>
              <span className="todoTitle">{t.title}</span>
            </div>
            <span className="todoDue">{t.due}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
