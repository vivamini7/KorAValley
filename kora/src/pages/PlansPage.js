import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./PlansPage.css";
import logo from "../images/logo.png";

import image15 from "../images/image15.png";
import image16 from "../images/image16.png";
import image17 from "../images/image17.png";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

/* =======================
   ✅ 임시 데이터 (나중에 Excel/JSON으로 교체)
   ======================= */

const avatarMap = {
  "image15.png": image15,
  "image16.png": image16,
  "image17.png": image17,
};

const planData = {
  "0기": {
    members: [
      {
        name: "조예찬",
        role: "Medical AI",
        avatarKey: "image15.png",
        socials: { linkedin: "#", medium: "#", instagram: "#" },
        stats: {
          progressPercent: 67,
          lineLabels: ["12월", "1월", "2월", "3월", "5월", "6월"],
          plansSeries: [30, 40, 52, 34, 33, 48],
          finishedSeries: [28, 33, 40, 31, 35, 45],
          focusing: [
            { label: "AI", value: 35 },
            { label: "Economics", value: 27 },
            { label: "Reading & Writing", value: 12 },
            { label: "somethings", value: 17 },
          ],
        },
        todos: [
          { id: 1000, title: "조예찬 밥 주기", due: "26.12.25" },
          { id: 1001, title: "논문 리딩 1편", due: "26.12.30" },
          { id: 1002, title: "토플 단어 200개", due: "27.01.02" },
        ],
      },
      {
        name: "천승범",
        role: "Developer",
        avatarKey: "image16.png",
        socials: { linkedin: "#", medium: "#", instagram: "#" },
        stats: {
          progressPercent: 52,
          lineLabels: ["12월", "1월", "2월", "3월", "5월", "6월"],
          plansSeries: [22, 30, 38, 29, 40, 44],
          finishedSeries: [18, 26, 33, 25, 35, 41],
          focusing: [
            { label: "Frontend", value: 40 },
            { label: "Backend", value: 20 },
            { label: "Study", value: 25 },
            { label: "etc", value: 15 },
          ],
        },
        todos: [{ id: 2000, title: "배포 점검", due: "26.12.28" }],
      },
    ],
  },
  "1기": {
    members: [
      {
        name: "홍길동",
        role: "Member",
        avatarKey: "image17.png",
        socials: { linkedin: "", medium: "", instagram: "" },
        stats: {
          progressPercent: 10,
          lineLabels: ["12월", "1월", "2월", "3월", "5월", "6월"],
          plansSeries: [5, 10, 8, 12, 9, 15],
          finishedSeries: [0, 1, 2, 2, 3, 5],
          focusing: [{ label: "Study", value: 100 }],
        },
        todos: [{ id: 3000, title: "계획 세우기", due: "26.12.25" }],
      },
    ],
  },
};

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

export default function PlansPage() {
  const { pathname } = useLocation();
  const navClass = (path) => `navItem ${pathname === path ? "active" : ""}`;

  // ✅ 화면 단계: list(멤버목록) -> detail(상세)
  const [mode, setMode] = useState("list"); // "list" | "detail"
  const [view, setView] = useState("stats"); // "stats" | "todos"

  const cohorts = useMemo(() => Object.keys(planData), []);
  const [cohort, setCohort] = useState(cohorts[0] ?? "");

  const members = useMemo(() => planData[cohort]?.members ?? [], [cohort]);
  const [selectedName, setSelectedName] = useState("");

  const current = useMemo(() => {
    if (!selectedName) return null;
    return members.find((m) => m.name === selectedName) ?? null;
  }, [members, selectedName]);

  const handleChangeCohort = (e) => {
    const next = e.target.value;
    setCohort(next);
    setSelectedName("");
    setMode("list");
    setView("stats");
  };

  const enterDetail = (m) => {
    setSelectedName(m.name);
    setMode("detail");
    setView("stats");
  };

  // ✅ "Plans"를 다시 누르면 목록(list)로 돌아가기
  const resetToList = () => {
    setMode("list");
    setSelectedName("");
    setView("stats");
  };

  return (
    <div className="plansPage">
      <div className="bg" />
      <div className="glow" />

      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="YOUR APP logo" className="logoImg" />
        </div>

        <nav className="nav">
          <Link className={navClass("/")} to="/">
            Main
          </Link>
          <Link className={navClass("/members")} to="/members">
            Members
          </Link>

          {/* ✅ 여기! Plans 클릭 시 list로 리셋 */}
          <Link className={navClass("/plans")} to="/plans" onClick={resetToList}>
            Plans
          </Link>

          <Link className={navClass("/insights")} to="/insights">
            Insights
          </Link>
        </nav>
      </header>

      <main className="wrap">
        {/* ✅ 상단: detail이면 "이름(왼쪽) + 버튼(오른쪽)" 한 줄 */}
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
                <PillButton active={view === "todos"} onClick={() => setView("todos")}>
                  Uncompleted
                </PillButton>
              </div>
            </div>
          </div>
        ) : (
          // ✅ list 화면이면 기수 선택만 위쪽에 두자
          <div className="plansHeaderRow">
          </div>
        )}

        {/* ✅ list 화면: 멤버 카드 */}
        {mode === "list" && (
          <section className="plansMembersSection">
            <div className="plansMembersGrid">
              {members.map((m) => (
                <button
                  key={m.name}
                  className="plansMemberCard"
                  type="button"
                  onClick={() => enterDetail(m)}
                >
                  <div className="plansAvatarCircle">
                    <img
                      src={avatarMap[m.avatarKey]}
                      alt={`${m.name} avatar`}
                      className="plansAvatarImg"
                    />
                  </div>
                  <div className="plansMemberName">{m.name}</div>
                  <div className="plansMemberRole">{m.role}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ✅ detail 화면 */}
        {mode === "detail" && current && (
          <>
            {view === "stats" ? (
              <StatsView stats={current.stats} />
            ) : (
              <TodosView todos={current.todos ?? []} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* =======================
   Stats View
   ======================= */
function StatsView({ stats }) {
  if (!stats) return null;

  const complete = Math.max(0, Math.min(100, Number(stats.progressPercent ?? 0)));
  const incomplete = 100 - complete;

  const donutData = [
    { name: "Complete", value: complete },
    { name: "Incomplete", value: incomplete },
  ];

  const chartData = (stats.lineLabels ?? []).map((label, idx) => ({
    month: label,
    Plans: stats.plansSeries?.[idx] ?? 0,
    Finished: stats.finishedSeries?.[idx] ?? 0,
  }));

  // ✅ focusing: 최대값 기준 정규화
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
                  innerRadius="68%"
                  outerRadius="92%"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                  stroke="rgba(255,255,255,0.10)"
                >
                  <Cell fill="rgba(150, 140, 255, 0.95)" />
                  <Cell fill="rgba(230, 230, 255, 0.20)" />
                </Pie>

                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.85)",
                    paddingTop: 6,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="donutCenter">
              <div className="donutPercent">{complete}%</div>
            </div>
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

                <Line type="monotone" dataKey="Plans" stroke="rgba(150, 140, 255, 0.95)" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="Finished" stroke="rgba(235, 235, 255, 0.85)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ✅ focusing: label 위 + bar 아래 */}
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
                  <span className="focusBarPct">{raw}%</span>   {/* ✅ 여기 */}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =======================
   Todos View
   ======================= */
function TodosView({ todos }) {
  const [sort, setSort] = useState("latest");

  const sorted = useMemo(() => {
    const arr = [...todos];
    const toNum = (d) => {
      const parts = String(d).split(".");
      if (parts.length !== 3) return 0;
      const yy = parts[0].padStart(2, "0");
      const mm = parts[1].padStart(2, "0");
      const dd = parts[2].padStart(2, "0");
      return Number(`20${yy}${mm}${dd}`);
    };
    arr.sort((a, b) => (sort === "latest" ? toNum(b.due) - toNum(a.due) : toNum(a.due) - toNum(b.due)));
    return arr;
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
          >
            최신순
          </button>
          <button
            type="button"
            className={`todosSortBtn ${sort === "oldest" ? "active" : ""}`}
            onClick={() => setSort("oldest")}
          >
            오래된순
          </button>
        </div>
      </div>

      <div className="todosList">
        {sorted.map((t) => (
          <div className="todoRow" key={t.id}>
            <div className="todoLeft">
              <span className="todoId">{t.id}.</span> {t.title}
            </div>
            <div className="todoDivider" />
            <div className="todoDue">{t.due}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
