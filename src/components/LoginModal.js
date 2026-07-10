import React, { useState } from "react";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "../firebase";
import "./LoginModal.css";

export default function LoginModal({ onClose, onSwitchToSignUp }) {
  const [email, setEmail] = useState(() => localStorage.getItem("savedEmail") ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(() => !!localStorage.getItem("savedEmail"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      if (remember) {
        localStorage.setItem("savedEmail", email);
      } else {
        localStorage.removeItem("savedEmail");
      }
      onClose();
    } catch (err) {
      if (err.code === "auth/user-disabled") {
        setError("계정이 비활성화되었습니다. 운영진에게 문의하세요.");
      } else if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        setError("로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginOverlay" onClick={onClose}>
      <div className="loginModal" onClick={(e) => e.stopPropagation()}>
        <button className="loginClose" onClick={onClose} aria-label="닫기">✕</button>
        <h2 className="loginTitle">로그인</h2>
        <p className="loginSub">KorA Valley 멤버 전용</p>

        <form onSubmit={handleSubmit} className="loginForm">
          <label className="loginLabel">
            이메일
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              className="loginInput"
            />
          </label>
          <label className="loginLabel">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="loginInput"
            />
          </label>

          <label className="loginRememberRow">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="loginRememberCheck"
            />
            <span>로그인 상태 유지</span>
          </label>

          {error && <p className="loginError">{error}</p>}

          <button type="submit" className="loginBtn" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>

          {onSwitchToSignUp && (
            <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>
              계정이 없으신가요?{" "}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                style={{ background: "none", border: "none", color: "rgba(147,197,253,0.9)", cursor: "pointer", fontSize: 13, padding: 0 }}
              >
                회원가입
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
