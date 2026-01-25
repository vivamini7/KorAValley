import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import "./MembersPage.css";

import image15 from "../images/image15.png";
import yoon from "../images/yoon.png";
import zo from "../images/zo.png";
import cheo from "../images/cheo.png";
import hong from "../images/image_hong.png";
import bae from "../images/image_bae.png";
import hwang from "../images/image_hwang.png";
import park from "../images/image_park.png";

import members from "../data/members.json";
import logo from "../images/logo.png";

const avatarMap = {
  "image15.png": image15,
  "yoon.png": yoon,
  "zo.png": zo,
  "cheo.png": cheo,
  "image_hong.png": hong,
  "image_bae.png": bae,
  "image_hwang.png": hwang,
  "image_park.png": park,
};

// 링크가 없으면 클릭 막는 유틸
function safeLinkProps(url) {
  const has = typeof url === "string" && url.trim().length > 0;
  return {
    href: has ? url : "#",
    target: has ? "_blank" : undefined,
    rel: has ? "noreferrer" : undefined,
    "aria-disabled": has ? undefined : "true",
    onClick: (e) => {
      e.stopPropagation();
      if (!has) e.preventDefault();
    },
  };
}

function MemberFlipCard({ m }) {
  const [flipped, setFlipped] = useState(false);
  const toggle = () => setFlipped((v) => !v);

  const avatarSrc = avatarMap[m.avatar] || image15;
  const links = m.links || {};
  const goals = Array.isArray(m.goals) ? m.goals : [];

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
        {/* ===== FRONT (프로필) ===== */}
        <div className="memberFlipFace memberFront">
          <div className="frontTop">
            <div className="badgeCircle" aria-hidden="true">
              <img className="badgeImg" src={avatarSrc} alt={`${m.name}`} />
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
              m.bullets.map((b, idx) => <li key={idx}>{b}</li>)}
          </ul>

          {/* ✅ JSON 링크 연결 */}
          <div className="frontSocialRow" aria-label="social links">
            <a
              className="frontSocialBtn"
              {...safeLinkProps(links.linkedin)}
              aria-label="LinkedIn"
            >
              in
            </a>
            <a
              className="frontSocialBtn"
              {...safeLinkProps(links.medium)}
              aria-label="Medium"
            >
              M
            </a>
          </div>
        </div>

        {/* ===== BACK (성과) ===== */}
        <div className="memberFlipFace memberBack">
          <div className="planBox">
            <div className="planScroll">
              <h4 className="planHeading">Goals</h4>

              {goals.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    color: "rgba(230,235,255,0.82)",
                    fontSize: 13,
                  }}
                >
                  아직 등록된 성과가 없어요.
                </p>
              ) : (
                <ul>
                  {goals.map((t, i) => (
                    <li key={i}>{t}</li>
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

/** gen 파라미터 정규화:
 * - "founding" | "all" | "0" | "1" | "2"
 */
function normalizeGen(gen) {
  const g = String(gen ?? "all").toLowerCase();
  if (g === "founding" || g === "all") return g;
  if (g === "0" || g === "1" || g === "2") return g;
  return "founding";
}

export default function MembersPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { gen } = useParams();

  const selected = normalizeGen(gen);

  const navClass = (path) => `navItem ${pathname === path ? "active" : ""}`;

  // ✅ 탭 클릭 -> URL 이동(넘어가는 느낌)
  const go = (next) => navigate(`/members/${next}`);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (selected === "all") return true;
      if (selected === "founding") return m.group === "founding";
      return String(m.generation) === selected;
    });
  }, [selected]);

  const title =
    selected === "founding"
      ? "Founding Members"
      : selected === "all"
      ? "All Members"
      : `${selected}기 Members`;

  return (
    <div className="membersPage">
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
          <Link className={navClass("/plans")} to="/plans">
            Plans
          </Link>
          <Link className={navClass("/insights")} to="/insights">
            Insights
          </Link>
        </nav>
      </header>

      <main className="wrap">
        {/* ✅ 필터 탭 */}
        <div className="memberTabs" role="tablist" aria-label="member generations">
          <button
            className={`tabBtn ${selected === "all" ? "active" : ""}`}
            onClick={() => go("all")}
          >
            All
          </button>
          <button
            className={`tabBtn ${selected === "founding" ? "active" : ""}`}
            onClick={() => go("founding")}
          >
            Founder
          </button>
          <button
            className={`tabBtn ${selected === "0" ? "active" : ""}`}
            onClick={() => go("0")}
          >
            0기
          </button>
          <button
            className={`tabBtn ${selected === "1" ? "active" : ""}`}
            onClick={() => go("1")}
          >
            1기
          </button>
          <button
            className={`tabBtn ${selected === "2" ? "active" : ""}`}
            onClick={() => go("2")}
          >
            2기
          </button>
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
