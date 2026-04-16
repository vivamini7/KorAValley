import React, { useState } from "react";
import "./EventPage.css";
import Navbar from "../components/Navbar";

/* ── Pre-computed petals ── */
const PETALS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: `${((i * 19 + 7) % 88) + 4}%`,
  delay: `${(i * 0.55) % 10}s`,
  duration: `${7 + (i * 0.7) % 5}s`,
  variant: (i % 3) + 1,
}));

/* ── Pre-computed stars ── */
const STARS = Array.from({ length: 44 }, (_, i) => ({
  id: i,
  left: `${(i * 41 + 11) % 94}%`,
  top: `${(i * 29 + 7) % 54}%`,
  size: [1.5, 2, 1, 2.5, 1.2][i % 5],
  delay: `${(i * 0.35) % 4}s`,
}));

/* ── Blossom cluster data ── */
const BLOSSOMS = [
  { cx: 34,  cy: 148, r: 31, v: 1 },
  { cx: 11,  cy: 122, r: 25, v: 2 },
  { cx: 57,  cy: 130, r: 27, v: 3 },
  { cx: 84,  cy: 82,  r: 29, v: 1 },
  { cx: 65,  cy: 64,  r: 24, v: 2 },
  { cx: 100, cy: 57,  r: 27, v: 3 },
  { cx: 130, cy: 93,  r: 28, v: 1 },
  { cx: 152, cy: 75,  r: 23, v: 2 },
  { cx: 180, cy: 106, r: 25, v: 3 },
  { cx: 118, cy: 56,  r: 21, v: 1 },
];

function CherryTree({ side }) {
  return (
    <svg
      className={`cherryTree cherryTree--${side}`}
      viewBox="0 0 200 300"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Trunk */}
      <path d="M100 300 Q97 255 96 215 Q95 175 98 145"
        className="tBranch" strokeWidth="13" strokeLinecap="round" fill="none" />
      {/* Branches */}
      <path d="M98 178 Q70 162 38 157"
        className="tBranch" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M98 163 Q124 143 158 132"
        className="tBranch" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M98 150 Q88 118 84 88"
        className="tBranch" strokeWidth="5.5" strokeLinecap="round" fill="none" />
      <path d="M98 155 Q112 124 132 100"
        className="tBranch" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M38 157 Q22 140 10 128"
        className="tBranch" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M158 132 Q177 120 192 110"
        className="tBranch" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Blossom clusters */}
      {BLOSSOMS.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.r}
          className={`tBloom tBloom--${b.v}`} />
      ))}
    </svg>
  );
}

export default function EventPage() {
  const [isNight, setIsNight] = useState(false);

  return (
    <div className={`eventPage ${isNight ? "night" : "day"}`}>

      {/* ── Sky ── */}
      <div className="eSkyDay"  aria-hidden="true" />
      <div className="eSkyNight" aria-hidden="true" />
      <div className="eAtmo"    aria-hidden="true" />

      {/* ── Stars ── */}
      <div className="eStars" aria-hidden="true">
        {STARS.map(s => (
          <span key={s.id} className="starDot" style={{
            left: s.left, top: s.top,
            width: `${s.size}px`, height: `${s.size}px`,
            animationDelay: s.delay,
          }} />
        ))}
      </div>

      {/* ── Sun ── */}
      <div className="eSun" aria-hidden="true" />

      {/* ── Moon ── */}
      <div className="eMoon" aria-hidden="true">
        <div className="eMoonShadow" />
      </div>

      {/* ── Falling petals ── */}
      <div className="ePetals" aria-hidden="true">
        {PETALS.map(p => (
          <div key={p.id}
            className={`petal petal--${p.variant}`}
            style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration }}
          />
        ))}
      </div>

      <Navbar />

      <main className="eMain">

        {/* ── Day / Night toggle ── */}
        <div className="eToggleRow">
          <span className={`eToggleLabel ${!isNight ? "on" : ""}`}>낮</span>
          <button
            className={`dnToggle${isNight ? " isNight" : ""}`}
            onClick={() => setIsNight(v => !v)}
            aria-label={isNight ? "낮으로 전환" : "밤으로 전환"}
          >
            <span className="dnThumb">
              <span className="dnEmoji dnEmoji--sun">☀️</span>
              <span className="dnEmoji dnEmoji--moon">🌙</span>
            </span>
          </button>
          <span className={`eToggleLabel ${isNight ? "on" : ""}`}>밤</span>
        </div>

        {/* ── Hero ── */}
        <div className="eHero">
          <p className="eSakuraRow" aria-hidden="true">🌸&nbsp;&nbsp;🌸&nbsp;&nbsp;🌸</p>
          <h1 className="eTitle">
            Cherry Blossom
            <span className="eTitleAccent">Edition</span>
          </h1>
          <p className="eSub">KorA Valley × Spring 2026</p>
        </div>

        {/* ── Event card ── */}
        <div className="eCard">
          <span className="eCardEmoji">🌸</span>
          <div className="eCardBody">
            <div className="eCardName">2026 봄 스페셜 에디션</div>
            <div className="eCardDate">April · Seoul</div>
            <div className="eCardDesc">
              봄바람에 흩날리는 벚꽃처럼<br />
              코라밸리 멤버들의 이야기를 나누어요
            </div>
          </div>
        </div>

      </main>

      {/* ── Cherry trees ── */}
      <div className="eTrees" aria-hidden="true">
        <CherryTree side="left" />
        <CherryTree side="right" />
      </div>

    </div>
  );
}
