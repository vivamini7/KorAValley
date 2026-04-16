import { useEffect, useMemo, useRef, useState } from "react";
import "./PlansPage.css";
import Navbar from "../components/Navbar";

/* ── 아바타 이미지 ── */
import image15     from "../images/image15.png";
import yoon        from "../images/yoon.png";
import zo          from "../images/zo.png";
import cheo        from "../images/cheo.png";
import hong        from "../images/image_hong.png";
import bae         from "../images/image_bae.png";
import hwang       from "../images/image_hwang.png";
import park        from "../images/image_park.png";
import kim_jh      from "../images/image_kim_jh.png";
import yu          from "../images/image_yu.png";
import jeon        from "../images/image_jeon.png";
import shin_jw     from "../images/image_shin_jw.png";
import kim_sh      from "../images/image_kim_sh.png";
import image_choi_sy from "../images/image_choi_sy.png";
import image_jung  from "../images/image_jung.png";
import image_lee_yh from "../images/image_lee_yh.png";
import image_seo   from "../images/image_seo.png";
import image_kim_yj from "../images/image_kim_yj.png";
import seo_j from "../images/seo_j.png";
import kim_ye from "../images/kim_ye.png";
import lee_sy from "../images/lee_sy.png";
import jung_jw from "../images/jung_jw.png";
import kim_yn from "../images/kim_yn.png";

/* ── 메타데이터 (역할·아바타·focusing) ── */
import planData from "../data/planData.json";

import {
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
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

// 미완료 계획 잠금 비밀번호 → kora/.env.local 의 REACT_APP_UNLOCK_PASSWORD 값
const UNLOCK_PASSWORD = process.env.REACT_APP_UNLOCK_PASSWORD ?? "";

// 로컬 CSV: public/data/plans.csv 교체 시 자동 반영
const LOCAL_CSV = process.env.PUBLIC_URL + "/data/plans.csv";

// 월 레이블 → 배열 인덱스 (1월=0 … 4월=3)
const MONTH_IDX = { "1": 0, "2": 1, "3": 2, "4": 3 };
const LINE_LABELS = ["1월", "2월", "3월", "4월"];

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

const avatarMap = {
  "image15.png": image15,
  "yoon.png": yoon,
  "zo.png": zo,
  "cheo.png": cheo,
  "image_hong.png": hong,
  "image_bae.png": bae,
  "image_hwang.png": hwang,
  "image_park.png": park,
  "image_kim_jh.png": kim_jh,
  "image_yu.png": yu,
  "image_jeon.png": jeon,
  "image_shin_jw.png": shin_jw,
  "image_kim_sh.png": kim_sh,
  "image_choi_sy.png": image_choi_sy,
  "image_jung.png": image_jung,
  "image_lee_yh.png": image_lee_yh,
  "image_seo.png": image_seo,
  "image_kim_yj.png": image_kim_yj,
  "kim_ye.png": kim_ye,
  "seo_j.png": seo_j,
  "lee_sy.png": lee_sy,
  "jung_jw.png": jung_jw,
  "kim_yn.png": kim_yn,
};

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

  const plansSeries    = [0, 0, 0, 0];
  const finishedSeries = [0, 0, 0, 0];

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

  return { progressPercent, plansSeries, finishedSeries, todos };
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
function CircularProgress({ percent }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, percent ?? 0)) / 100);
  return (
    <svg className="plansCircleRing" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none"
        stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
      <circle cx="50" cy="50" r={r} fill="none"
        stroke="rgba(160,140,255,0.92)" strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50px 50px" }}
        className="plansCircleArc"
      />
    </svg>
  );
}

/* ======================
   PlansPage (메인)
   ====================== */
export default function PlansPage() {
  const [mode, setMode]     = useState("list");   // "list" | "detail"
  const [view, setView]     = useState("stats");  // "stats" | "todos"
  const [unlocked, setUnlocked] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);

  // 벚꽃 에디션 감지 (body.cherry-mode 클래스 변화 감시)
  const [cherryMode, setCherryMode] = useState(
    () => document.body.classList.contains("cherry-mode")
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCherryMode(document.body.classList.contains("cherry-mode"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const cohorts = useMemo(() => Object.keys(planData ?? {}), []);
  const [selectedCohort, setSelectedCohort] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const members = useMemo(() => {
    if (selectedCohort === "all") return cohorts.flatMap((c) => planData[c]?.members ?? []);
    return planData?.[selectedCohort]?.members ?? [];
  }, [selectedCohort, cohorts]);

  const [selectedName, setSelectedName] = useState("");
  const current = useMemo(
    () => members.find((m) => m.name === selectedName) ?? null,
    [members, selectedName]
  );

  /* ── CSV fetch ── */
  const [csvRows, setCsvRows]   = useState([]);
  const [csvLoading, setCsvLoading] = useState(true);
  const [csvError, setCsvError] = useState(false);

  useEffect(() => {
    setCsvLoading(true);
    setCsvError(false);
    fetch(LOCAL_CSV)
      .then((r) => { if (!r.ok) throw new Error("local"); return r.text(); })
      .then((text) => { setCsvRows(deduplicateRows(parseCSV(text))); })
      .catch(() => { setCsvError(true); })
      .finally(() => { setCsvLoading(false); });
  }, []);

  /* ── 선택된 멤버의 통계 (CSV 기반) ── */
  const computed = useMemo(() => {
    if (!current || csvRows.length === 0) return null;
    return computeMember(csvRows, current.name);
  }, [csvRows, current]);

  // StatsView에 넘길 stats (CSV 계산값 + 자동 분류 focusing)
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
  };

  const enterDetail = (m) => {
    setSelectedName(m.name);
    setMode("detail");
    setView("stats");
  };

  const resetToList = () => {
    setMode("list");
    setSelectedName("");
    setView("stats");
  };

  const handleUncompletedClick = () => {
    if (unlocked) {
      setView("todos");
    } else {
      setShowPwModal(true);
    }
  };

  const selectedTabIndex = PLAN_TABS.findIndex((t) => t.key === selectedCohort);
  const currentTabLabel = PLAN_TABS.find((t) => t.key === selectedCohort)?.label ?? selectedCohort;

  /* ── 렌더 ── */
  return (
    <div className="plansPage">
      <div className="bg" />
      <div className="glow" />
      <Navbar onPlansClick={resetToList} />

      {showPwModal && (
        <PasswordModal
          onSuccess={() => { setUnlocked(true); setShowPwModal(false); setView("todos"); }}
          onClose={() => setShowPwModal(false)}
        />
      )}

      <main className="wrap">
        {/* 상단 헤더 */}
        {mode === "detail" && current ? (
          <div className="plansTopLine">
            <div className="plansPersonRow">
              <div className="plansName">{current.name}</div>
              <div className="plansRolePill">{current.role}</div>
            </div>
            <div className="plansRightBtns">
              <div className="plansToggleRow">
                <PillButton active={view === "stats"} onClick={() => setView("stats")}>
                  Statistics
                </PillButton>
                <PillButton active={view === "todos"} onClick={handleUncompletedClick}>
                  Uncompleted
                </PillButton>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 데스크탑: 슬라이딩 세그먼트 탭 */}
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
          </>
        )}

        {/* 멤버 목록 */}
        {mode === "list" && (
          <section className="plansMembersSection">
            <div className="plansMembersGrid">
              {members.map((m) => {
                const st = memberStats[m.name];
                return (
                  <button
                    key={m.name}
                    className="plansMemberCard"
                    type="button"
                    onClick={() => enterDetail(m)}
                  >
                    <div className="plansMemberInner">
                      <div className="plansAvatarWrap">
                        {!csvLoading && st && <CircularProgress percent={st.percent} />}
                        <div className="plansAvatarCircle">
                          <img
                            src={avatarMap[m.avatarKey] || image15}
                            alt={m.name}
                            className="plansAvatarImg"
                          />
                        </div>
                      </div>
                      <div className="plansMemberName">{m.name}</div>
                      <div className="plansMemberRole">{m.role}</div>
                      {!csvLoading && st && (
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
              })}
            </div>
          </section>
        )}

        {/* 상세 화면 */}
        {mode === "detail" && current && (
          <>
            {csvLoading ? (
              <div className="csvStatusMsg">데이터 불러오는 중…</div>
            ) : csvError ? (
              <div className="csvStatusMsg csvStatusError">
                데이터를 불러오지 못했어요.{" "}
                <code>public/data/plans.csv</code> 파일을 확인해주세요.
              </div>
            ) : view === "stats" ? (
              <StatsView stats={stats} cherry={cherryMode} />
            ) : (
              <TodosView todos={computed?.todos ?? []} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ======================
   Stats View
   ====================== */
function StatsView({ stats, cherry }) {
  if (!stats) return null;

  const complete  = Math.max(0, Math.min(100, Number(stats.progressPercent ?? 0)));
  const incomplete = 100 - complete;

  // 벚꽃 에디션이면 핑크 계열, 아니면 기본 보라 계열
  const DONUT_COLORS = cherry
    ? ["rgba(255, 110, 155, 0.95)", "rgba(255, 220, 230, 0.18)"]
    : ["rgba(150, 140, 255, 0.95)", "rgba(230, 230, 255, 0.20)"];

  const LINE_PLANS_COLOR    = cherry ? "rgba(255, 110, 155, 0.95)" : "rgba(150,140,255,0.95)";
  const LINE_FINISHED_COLOR = cherry ? "rgba(255, 200, 215, 0.85)" : "rgba(235,235,255,0.85)";

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
          <div className="statsCardTitle">Overview1</div>
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
                <Tooltip
                  contentStyle={{
                    background: "rgba(10,12,28,0.90)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    color: "rgba(255,255,255,0.95)",
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [`${value}%`, name]}
                />
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
          <div className="statsCardTitle">Overview2</div>
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
   Password Modal
   ====================== */
function PasswordModal({ onSuccess, onClose }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pw === UNLOCK_PASSWORD) {
      onSuccess();
    } else {
      setError(true);
      setPw("");
    }
  };

  return (
    <div className="pwModalOverlay" onClick={onClose}>
      <div className="pwModal" onClick={(e) => e.stopPropagation()}>
        <div className="pwModalTitle">Members Only</div>
        <div className="pwModalDesc">미완료 계획은 회원에게만 공개됩니다.</div>
        <form onSubmit={handleSubmit} className="pwModalForm">
          <input
            type="password"
            className={`pwModalInput${error ? " error" : ""}`}
            placeholder="비밀번호 입력"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(false); }}
            autoFocus
          />
          {error && <div className="pwModalError">비밀번호가 틀렸습니다.</div>}
          <button type="submit" className="pwModalBtn">확인</button>
        </form>
      </div>
    </div>
  );
}

/* ======================
   Todos View
   ====================== */
function TodosView({ todos }) {
  const [sort, setSort] = useState("latest");

  const toNum = (d) => {
    const parts = String(d).split(".");
    if (parts.length !== 3) return 0;
    // "25.3.15" → 20250315
    const yy = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    const dd = parts[2].padStart(2, "0");
    return Number(`20${yy}${mm}${dd}`);
  };

  const sorted = useMemo(() => {
    const arr = [...todos];
    arr.sort((a, b) =>
      sort === "latest"
        ? toNum(b.due) - toNum(a.due)
        : toNum(a.due) - toNum(b.due)
    );
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, sort]);

  return (
    <div className="todosCard">
      <div className="todosHeader">
        <div className="todosTitle">Uncompleted plans</div>
        <div className="todosSortBtns">
          <button
            type="button"
            className={`todosSortBtn ${sort === "latest" ? "active" : ""}`}
            onClick={() => setSort("latest")}
          >최신순</button>
          <button
            type="button"
            className={`todosSortBtn ${sort === "oldest" ? "active" : ""}`}
            onClick={() => setSort("oldest")}
          >오래된순</button>
        </div>
      </div>

      <div className="todosList">
        {sorted.length === 0 ? (
          <div className="csvStatusMsg">미완료 계획이 없어요 🎉</div>
        ) : (
          sorted.map((t) => (
            <div className="todoRow" key={t.id}>
              <div className="todoLeft">
                <span className="todoId">{t.id}.</span>
                <span className="todoTitle">{t.title}</span>
              </div>
              <div className="todoDivider" />
              <div className="todoDue">{t.due}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
