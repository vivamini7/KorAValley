import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./InsightsPage.css";
import postitImg from "../images/postit.png";

import insightsData from "../data/insights.json";
import infoData from "../data/info.json";
import eventsData from "../data/events.json";
import logo from "../images/logo.png";

const DATA_MAP = {
  Insights: insightsData,
  Info: infoData,
  Events: eventsData,
};

/* =========================
   URL 자동 링크 렌더러
   ========================= */
function renderWithLinks(text) {
  const str = String(text ?? "");
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = str.split(urlRegex);

  return parts.map((part, idx) => {
    const isUrl = /^https?:\/\/[^\s]+$/.test(part);
    if (isUrl) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export default function InsightsPage() {
  const { pathname } = useLocation();
  const navClass = (path) => `navItem ${pathname === path ? "active" : ""}`;

  const [activeTab, setActiveTab] = useState("Insights");
  const [query, setQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState(null);

  /* =========================
     탭 슬라이더 위치 계산
     ========================= */
  const sliderStyle = useMemo(() => {
    if (activeTab === "Insights") return { transform: "translateX(0%)" };
    if (activeTab === "Info") return { transform: "translateX(100%)" };
    return { transform: "translateX(200%)" }; // Events
  }, [activeTab]);

  /* =========================
     검색 + 탭 필터
     ========================= */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = DATA_MAP[activeTab] || [];

    return list.filter((n) => {
      if (!q) return true;
      const content = (n.content || "").toLowerCase();
      const author = (n.author || "").toLowerCase();
      const tags = Array.isArray(n.tags) ? n.tags.join(" ").toLowerCase() : "";
      return content.includes(q) || author.includes(q) || tags.includes(q);
    });
  }, [activeTab, query]);

  const openNote = (note) => {
    if (!note?.content) return;
    setSelectedNote(note);
  };
  const closeNote = () => setSelectedNote(null);

  return (
    <div className="insightsPage">
      <div className="bg" />
      <div className="glow" />

      {/* =========================
         Topbar
         ========================= */}
      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="YOUR APP logo" className="logoImg" />
        </div>

        <nav className="nav">
          <Link className={navClass("/")} to="/">Main</Link>
          <Link className={navClass("/members")} to="/members">Members</Link>
          <Link className={navClass("/plans")} to="/plans">Plans</Link>
          <Link className={navClass("/insights")} to="/insights">Insights</Link>
        </nav>
      </header>

      <main className="wrap">
        {/* =========================
           🔍 좌: 검색 / 🔘 우: 슬라이딩 탭
           ========================= */}
        <div className="pageTopRow">
          {/* 왼쪽: 검색 */}
          <div className="searchArea left">
            <div className="searchLabel">키워드 검색</div>
            <input
              className="searchInput"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색어를 입력하세요"
            />
          </div>

          {/* 오른쪽: 슬라이딩 세그먼트 탭 */}
          <div className="segmentTabs">
            <div className="segmentSlider" style={sliderStyle} />
            {["Insights", "Info", "Events"].map((t) => (
              <button
                key={t}
                className={`segmentBtn ${activeTab === t ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* =========================
           포스트잇 그리드
           ========================= */}
        <div className="notesGrid">
          {filtered.map((n) => (
            <button
              key={n.id}
              className="note"
              type="button"
              onClick={() => openNote(n)}
            >
              <div className="noteImgWrapper">
                {/* ✅ 포스트잇 이미지 */}
                <img
                  src={postitImg}
                  alt="post-it"
                  className="noteImg"
                  draggable={false}
                />

                {/* ✅ 이미지 위 텍스트 */}
                <div className="noteContent">
                  <div className="noteText">
                    {n.content.length > 90
                      ? renderWithLinks(n.content.slice(0, 90) + "...")
                      : renderWithLinks(n.content)}
                  </div>

                  {n.author && (
                    <div className="noteAuthor">-{n.author}-</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* =========================
         모달
         ========================= */}
      {selectedNote && (
        <div className="modalOverlay" onClick={closeNote}>
          <div
            className="modalBox"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              className="modalCloseBtn"
              onClick={closeNote}
              aria-label="Close"
            >
              ×
            </button>

            <div className="modalContent">
              <div className="modalText">
                {renderWithLinks(selectedNote.content)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
