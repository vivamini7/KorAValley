import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import "./LoginModal.css";

export default function SignUpModal({ onClose, onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      onClose();
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("이미 사용 중인 이메일입니다.");
      } else if (err.code === "auth/invalid-email") {
        setError("올바른 이메일 형식이 아닙니다.");
      } else {
        setError("회원가입에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginOverlay" onClick={onClose}>
      <div className="loginModal" onClick={(e) => e.stopPropagation()}>
        <button className="loginClose" onClick={onClose} aria-label="닫기">✕</button>
        <h2 className="loginTitle">회원가입</h2>
        <p className="loginSub">KorA Valley 멤버 전용 — 가입 후 운영진 승인 필요</p>

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
              placeholder="6자 이상"
              required
              className="loginInput"
            />
          </label>
          <label className="loginLabel">
            비밀번호 확인
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="비밀번호 재입력"
              required
              className="loginInput"
            />
          </label>

          {error && <p className="loginError">{error}</p>}

          <button type="submit" className="loginBtn" disabled={loading}>
            {loading ? "가입 중..." : "회원가입"}
          </button>

          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            이미 계정이 있으신가요?{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              style={{ background: "none", border: "none", color: "rgba(147,197,253,0.9)", cursor: "pointer", fontSize: 13, padding: 0 }}
            >
              로그인
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
