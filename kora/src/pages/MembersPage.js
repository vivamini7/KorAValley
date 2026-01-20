import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./MembersPage.css";

import image15 from "../images/image15.png";
import image16 from "../images/image16.png";
import image17 from "../images/image17.png";

import members from "../data/members.json";
import logo from "../images/logo.png";
const avatarMap = {
  "image15.png": image15,
  "image16.png": image16,
  "image17.png": image17,
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
  const achievements = Array.isArray(m.achievements) ? m.achievements : [];

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
              <img className="badgeImg" src={avatarSrc} alt={`${m.name} avatar`} />
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
            <a className="frontSocialBtn" {...safeLinkProps(links.linkedin)} aria-label="LinkedIn">
              in
            </a>
            <a className="frontSocialBtn" {...safeLinkProps(links.medium)} aria-label="Medium">
              M
            </a>
            <a className="frontSocialBtn" {...safeLinkProps(links.notion)} aria-label="Notion">
              N
            </a>
            <a className="frontSocialBtn" {...safeLinkProps(links.instagram)} aria-label="Instagram">
              ◎
            </a>
          </div>
        </div>

        {/* ===== BACK (성과) ===== */}
        <div className="memberFlipFace memberBack">
          <div className="planBox">
            <div className="planScroll">
              <h4 className="planHeading">Achievements</h4>

              {achievements.length === 0 ? (
                <p style={{ margin: 0, color: "rgba(230,235,255,0.82)", fontSize: 13 }}>
                  아직 등록된 성과가 없어요.
                </p>
              ) : (
                <ul>
                  {achievements.map((t, i) => (
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

export default function MembersPage() {
  const { pathname } = useLocation();
  const navClass = (path) => `navItem ${pathname === path ? "active" : ""}`;

  return (
    <div className="membersPage">
      <div className="bg" />
      <div className="glow" />

      <header className="topbar">
        <div className="brand">
                  <img
                    src={logo}
                    alt="YOUR APP logo"
                    className="logoImg"
                  />
                </div>

        <nav className="nav">
          <Link className={navClass("/")} to="/">Main</Link>
          <Link className={navClass("/members")} to="/members">Members</Link>
          <Link className={navClass("/plans")} to="/plans">Plans</Link>
          <Link className={navClass("/insights")} to="/insights">Insights</Link>
        </nav>
      </header>

      <main className="wrap">

          <h2 className="sectionTitle">Founding Members</h2>

          <div className="cardGrid">
            {members.map((m) => (
              <MemberFlipCard key={m.id ?? `${m.name}-${m.role}`} m={m} />
            ))}
          </div>
      </main>
    </div>
  );
}
