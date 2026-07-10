import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import "./Navbar.css";
import logo from "../images/logo.png";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import LoginModal from "./LoginModal";
import SignUpModal from "./SignUpModal";

function ThemeSwitch({ theme, onToggle, className = "" }) {
  return (
    <label
      className={`themeSwitch${theme === "light" ? " isLight" : ""}${className ? " " + className : ""}`}
      aria-label={theme === "dark" ? "라이트모드로 전환" : "다크모드로 전환"}
      title={theme === "dark" ? "라이트모드" : "다크모드"}
    >
      <input type="checkbox" checked={theme === "light"} onChange={onToggle} />
      <span className="themeSwitchTrack" />
      <span className="themeSwitchThumb" />
    </label>
  );
}

export default function Navbar({ onMembersClick }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const { currentUser, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

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
    <>
      <header className="navbar">
        <Link to="/" className="navBrand" onClick={close}>
          <img src={logo} alt="KorA Valley" className="navLogo" />
        </Link>

        {/* 데스크탑 네비 */}
        <nav className="navLinks" aria-label="main navigation">
          <Link className={cls("/")} to="/">Main</Link>
          <Link className={cls("/members")} to="/members" onClick={onMembersClick}>Members</Link>
          <Link className={cls("/networking")} to="/networking">Networking</Link>
          <Link className={cls("/notice")} to="/notice">Notice</Link>
        </nav>

        {/* 우측 영역 (데스크탑) */}
        <div className="navAuthArea">
          {/* 테마 토글 스위치 */}
          <ThemeSwitch theme={theme} onToggle={toggleTheme} />

          {currentUser ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="navAuthBtn navAdminBtn" style={{ textDecoration: "none" }}>
                  관리
                </Link>
              )}
              <button className="navAuthBtn navMyPageBtn" onClick={() => navigate("/mypage")}>
                My
              </button>
              <button className="navAuthBtn navLogoutBtn" onClick={logout}>
                LogOut
              </button>
            </>
          ) : (
            <button className="navAuthBtn navLoginBtn" onClick={() => setShowLogin(true)}>
              로그인
            </button>
          )}
        </div>

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
              <Link
                className={cls("/members")}
                to="/members"
                onClick={() => { onMembersClick?.(); close(); }}
              >Members</Link>
              <Link className={cls("/networking")} to="/networking" onClick={close}>Networking</Link>
              <Link className={cls("/notice")} to="/notice" onClick={close}>Notice</Link>

              {/* 테마 토글 행 */}
              <div className="navMobileThemeRow">
                <span className="navMobileThemeLabel">
                  {theme === "dark" ? "다크 모드" : "라이트 모드"}
                </span>
                <ThemeSwitch theme={theme} onToggle={toggleTheme} />
              </div>

              <div className="navMobileAuthRow">
                {currentUser ? (
                  <>
                    <button className="navAuthBtn navMyPageBtn" onClick={() => { navigate("/mypage"); close(); }}>
                      Mypage
                    </button>
                    <button className="navAuthBtn navLogoutBtn" onClick={() => { logout(); close(); }}>
                      로그아웃
                    </button>
                  </>
                ) : (
                  <button className="navAuthBtn navLoginBtn" onClick={() => { setShowLogin(true); close(); }}>
                    로그인
                  </button>
                )}
              </div>
            </nav>
          </>,
          document.body
        )}
      </header>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSwitchToSignUp={() => { setShowLogin(false); setShowSignUp(true); }}
        />
      )}
      {showSignUp && (
        <SignUpModal
          onClose={() => setShowSignUp(false)}
          onSwitchToLogin={() => { setShowSignUp(false); setShowLogin(true); }}
        />
      )}
    </>
  );
}
