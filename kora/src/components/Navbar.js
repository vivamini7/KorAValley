import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import "./Navbar.css";
import logo from "../images/logo.png";

// 4월(month === 3)에만 벚꽃 에디션 버튼 활성화. 5월 이후 false.
const isApril = new Date().getMonth() === 3;
const PETAL_COUNT = 14;

/**
 * 공유 네비게이션 바
 * @param {function} [onPlansClick] - Plans 링크 클릭 시 추가 동작 (PlansPage 상태 리셋 등)
 */
export default function Navbar({ onPlansClick }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [cherryOn, setCherryOn] = useState(false);

  const toggleCherry = () => {
    const next = !cherryOn;
    setCherryOn(next);
    document.body.classList.toggle("cherry-mode", next);
  };

  const cls = (path) => {
    const active =
      path === "/"
        ? pathname === "/"
        : path === "/members"
        ? pathname.startsWith("/members")
        : pathname === path;
    return `navLink${active ? " active" : ""}`;
  };

  const close = () => setOpen(false);

  return (
    <header className="navbar">
      {/* 4월 한정: 벚꽃 꽃잎 오버레이 (전 페이지 fixed) */}
      {isApril && cherryOn && createPortal(
        <div className="cherryPetals" aria-hidden="true">
          {Array.from({ length: PETAL_COUNT }).map((_, i) => (
            <span key={i} className={`petal petal-${i + 1}`} />
          ))}
        </div>,
        document.body
      )}

      <Link to="/" className="navBrand" onClick={close}>
        <img src={logo} alt="KorA Valley" className="navLogo" />
      </Link>

      {/* 데스크탑 네비 */}
      <nav className="navLinks" aria-label="main navigation">
        <Link className={cls("/")} to="/">Main</Link>
        <Link className={cls("/members")} to="/members">Members</Link>
        <Link className={cls("/plans")} to="/plans" onClick={onPlansClick}>Plans</Link>
        <Link className={cls("/networking")} to="/networking">Networking</Link>
        {/* 4월 한정: 벚꽃 에디션 토글 버튼 */}
        {isApril && (
          <button
            className={`cherryToggleBtn${cherryOn ? " cherry-on" : ""}`}
            onClick={toggleCherry}
            title={cherryOn ? "기본 테마로 돌아가기" : "벚꽃 에디션 켜기"}
          >
            🌸
          </button>
        )}
      </nav>

      {/* 햄버거 버튼 (모바일) */}
      <button
        className={`navHamburger${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
      >
        <span />
        <span />
        <span />
      </button>

      {/* 모바일 메뉴 */}
      {open && createPortal(
        <>
          <div className="navOverlay" onClick={close} aria-hidden="true" />
          <nav className="navMobile" aria-label="mobile navigation">
            <Link className={cls("/")} to="/" onClick={close}>Main</Link>
            <Link className={cls("/members")} to="/members" onClick={close}>Members</Link>
            <Link
              className={cls("/plans")}
              to="/plans"
              onClick={() => { onPlansClick?.(); close(); }}
            >Plans</Link>
            <Link className={cls("/insights")} to="/insights" onClick={close}>Insights</Link>
            {/* 4월 한정: 모바일 메뉴에도 토글 버튼 */}
            {isApril && (
              <button
                className={`cherryToggleBtn mobile${cherryOn ? " cherry-on" : ""}`}
                onClick={() => { toggleCherry(); close(); }}
              >
                {cherryOn ? "🌸 벚꽃 에디션 끄기" : "🌸 벚꽃 에디션 켜기"}
              </button>
            )}
          </nav>
        </>,
        document.body
      )}
    </header>
  );
}
