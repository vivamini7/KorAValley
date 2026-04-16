import React, { useMemo, useState } from "react";
import "./InsightsPage.css";
import Navbar from "../components/Navbar";
import postitImg from "../images/postit.png";

import insightsData from "../data/insights.json";
import infoData from "../data/info.json";
import eventsData from "../data/events.json";

const UNLOCK_PASSWORD = process.env.REACT_APP_UNLOCK_PASSWORD ?? "";

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

function PasswordModal({ onSuccess }) {
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
    <div className="pwModalOverlay">
      <div className="pwModal" onClick={(e) => e.stopPropagation()}>
        <div className="pwModalTitle">Members Only</div>
        <div className="pwModalDesc">이 페이지는 회원에게만 공개됩니다.</div>
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

export default function InsightsPage() {
  const [unlocked, setUnlocked] = useState(false);
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

  if (!unlocked) {
    return (
      <div className="insightsPage">
        <div className="bg" />
        <div className="glow" />
        <Navbar />
        <PasswordModal onSuccess={() => setUnlocked(true)} />
      </div>
    );
  }

  return (
    <div className="insightsPage">
      <div className="bg" />
      <div className="glow" />

      <Navbar />

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
                    {renderWithLinks(
                      n.content.length > 160
                        ? n.content.slice(0, 160) + "..."
                        : n.content
                    )}
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
