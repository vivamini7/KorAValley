import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "./MembersPage.css";
import Navbar from "../components/Navbar";

/* =======================
   이미지 import
   ======================= */
import image15 from "../images/image15.png";
import yoon from "../images/yoon.png";
import zo from "../images/zo.png";
import cheo from "../images/cheo.png";
import hong from "../images/image_hong.png";
import bae from "../images/image_bae.png";
import hwang from "../images/image_hwang.png";
import park from "../images/image_park.png";
import kim_jh from "../images/image_kim_jh.png";
import yu from "../images/image_yu.png";
import jeon from "../images/image_jeon.png";
import shin_jw from "../images/image_shin_jw.png";
import kim_sh from "../images/image_kim_sh.png";
import image_choi_sy from "../images/image_choi_sy.png";
import image_jung from "../images/image_jung.png";
import image_lee_yh from "../images/image_lee_yh.png";
import image_seo from "../images/image_seo.png";
import image_kim_yj from "../images/image_kim_yj.png";
import seo_j from "../images/seo_j.png";
import kim_ye from "../images/kim_ye.png";
import members from "../data/members.json";
import lee_sy from "../images/lee_sy.png";
import kim_yn from "../images/kim_yn.png";
import jung_jw from "../images/jung_jw.png";

/* =======================
   avatar 매핑
   ======================= */
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
  "seo_j.png": seo_j,
  "kim_ye.png": kim_ye,
  "lee_sy.png": lee_sy,
  "jung_jw.png": jung_jw,
  "kim_yn.png": kim_yn,
};

/* =======================
   메일 아이콘 (SVG)
   ======================= */
function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  );
}

/* =======================
   멤버 카드
   ======================= */
function MemberFlipCard({ m }) {
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggle = () => setFlipped((v) => !v);

  const avatarSrc = avatarMap[m.avatar] || image15;
  const links = m.links || {};
  const goals = Array.isArray(m.goals) ? m.goals : [];

  // email은 m.email 또는 links.email 둘 다 허용
  const email = (m.email || links.email || "").trim();

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
    <div
      className="memberFlipWrap"
      onClick={toggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") toggle();
      }}
    >
      <div className={`memberFlipInner ${flipped ? "isFlipped" : ""}`}>
        {/* ================= FRONT ================= */}
        <div className="memberFlipFace memberFront">
          <div className="frontTop">
            <div className="badgeCircle">
              <img className="badgeImg" src={avatarSrc} alt={m.name} />
            </div>

            <div className="frontNameArea">
              <div className="frontNameRow">
                <span className="frontName">{m.name}</span>
                <span className="frontPill">{m.role}</span>
              </div>
            </div>
          </div>

          <p className="frontQuote">{m.quote}</p>

          <ul className="frontBullets">
            {Array.isArray(m.bullets) &&
              m.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>

          {/* ===== 소셜 / 이메일 ===== */}
          <div className="frontSocialRow">
            {!!links.linkedin?.trim() && (
              <a
                className="frontSocialBtn"
                href={links.linkedin}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label="LinkedIn"
              >
                in
              </a>
            )}

            {!!links.medium?.trim() && (
              <a
                className="frontSocialBtn"
                href={links.medium}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label="Medium"
              >
                M
              </a>
            )}

            {!!email && (
              <button
                type="button"
                className="frontSocialBtn emailBtn"
                onClick={copyEmail}
                aria-label="Email copy"
              >
                <MailIcon />
                <span className="emailTooltip" role="tooltip">
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ================= BACK ================= */}
        <div className="memberFlipFace memberBack">
          <div className="planBox">
            <div className="planScroll">
              <h4 className="planHeading">Goals</h4>

              {goals.length === 0 ? (
                <p style={{ fontSize: 13, opacity: 0.85 }}>
                  아직 등록된 성과가 없어요.
                </p>
              ) : (
                <ul>
                  {goals.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =======================
   탭 목록
   ======================= */
const TABS = [
  { key: "all",      label: "All" },
  { key: "founding", label: "Founder" },
  { key: "0",        label: "0기" },
  { key: "1",        label: "1기" },
  { key: "2",        label: "2기" },
  { key: "3",        label: "3기" },
];

/* =======================
   gen 파라미터 정규화
   ======================= */
function normalizeGen(gen) {
  const g = String(gen ?? "all").toLowerCase();
  if (g === "founding" || g === "all") return g;
  if (g === "0" || g === "1" || g === "2" || g === "3") return g;
  return "founding";
}

/* =======================
   MembersPage
   ======================= */
export default function MembersPage() {
  const navigate = useNavigate();
  const { gen } = useParams();

  const selected = normalizeGen(gen);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const go = (next) => { navigate(`/members/${next}`); setMenuOpen(false); };

  // 바깥 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [menuOpen]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (selected === "all") return true;
      if (selected === "founding") return m.group === "founding";
      return String(m.generation) === selected;
    });
  }, [selected]);

  const currentLabel = TABS.find((t) => t.key === selected)?.label ?? selected;
  const selectedIndex = TABS.findIndex((t) => t.key === selected);

  const title =
    selected === "founding"
      ? "Founding Members"
      : selected === "all"
      ? "All Members"
      : `${selected}기 Members`;

  return (
    <div className="membersPage">
      <div className="membersBg" />
      <div className="membersGlow" />

      <Navbar />

      <main className="wrap">

        {/* 데스크탑: 슬라이딩 세그먼트 탭 */}
        <div className="memberSegmentTabs">
          <div
            className="memberSegmentSlider"
            style={{ transform: `translateX(${selectedIndex * 100}%)` }}
          />
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`memberSegmentBtn${selected === t.key ? " active" : ""}`}
              onClick={() => go(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 모바일: 드롭다운 메뉴 */}
        <div className="genDropdownWrap" ref={menuRef}>
          <button
            className="genDropdownBtn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
          >
            <span>{currentLabel}</span>
            <span className={`genDropdownArrow${menuOpen ? " open" : ""}`}>▾</span>
          </button>
          {menuOpen && (
            <div className="genDropdownMenu">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className={`genDropdownItem${selected === t.key ? " active" : ""}`}
                  onClick={() => go(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <h2 className="sectionTitle">{title}</h2>

        <div className="cardGrid">
          {filteredMembers.map((m) => (
            <MemberFlipCard key={m.id ?? `${m.name}-${m.role}`} m={m} />
          ))}
        </div>
      </main>
    </div>
  );
}
