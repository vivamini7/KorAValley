import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { MembersProvider } from "./context/MembersContext";
import { LivePlansProvider } from "./context/LivePlansContext";
import "./light-mode.css";

import MainPage from "./pages/MainPage";
import MembersPage from "./pages/MembersPage";
import NetworkingPage from "./pages/NetworkingPage";
import AdminPage from "./pages/AdminPage";
import LivePage from "./pages/LivePage";
import LiveChatPanel from "./components/LiveChatPanel";
import AppShell from "./components/AppShell";
import PlanCountNotifier from "./components/PlanCountNotifier";
import MyPage from "./pages/MyPage";
import NoticePage from "./pages/NoticePage";
import UpdateNoticeModal from "./components/UpdateNoticeModal";

const OPEN_AT = new Date("2026-06-08T16:00:00+09:00");

function MaintenancePage() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#0a0c1c", color: "rgba(255,255,255,0.85)",
      fontFamily: "sans-serif", gap: 16, textAlign: "center", padding: 24,
    }}>
      <div style={{ fontSize: 48 }}>🔧</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>잠시 점검 중이에요</div>
      <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)" }}>
        오늘 오후 4시에 다시 열려요
      </div>
    </div>
  );
}

export default function App() {
  if (new Date() < OPEN_AT) return <MaintenancePage />;

  // 채팅 + 마이페이지를 앱 형태로 열었을 때
  if (new URLSearchParams(window.location.search).get("app") === "open") {
    return (
      <ThemeProvider>
      <MembersProvider>
      <AuthProvider>
      <BrowserRouter>
      <LivePlansProvider>
        <AppShell />
        <PlanCountNotifier />
      </LivePlansProvider>
      </BrowserRouter>
      </AuthProvider>
      </MembersProvider>
      </ThemeProvider>
    );
  }

  // 채팅을 별도 창으로 열었을 때는 채팅 패널만 표시
  if (new URLSearchParams(window.location.search).get("chat") === "open") {
    return (
      <ThemeProvider>
      <MembersProvider>
      <AuthProvider>
      <BrowserRouter>
      <LivePlansProvider>
        <LiveChatPanel standalone />
      </LivePlansProvider>
      </BrowserRouter>
      </AuthProvider>
      </MembersProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
    <MembersProvider>
    <AuthProvider>
    <BrowserRouter>
    <LivePlansProvider>
      <Routes>
        <Route path="/" element={<MainPage />} />

        <Route path="/members" element={<Navigate to="/members/all" replace />} />
        <Route path="/members/:gen" element={<MembersPage />} />

        <Route path="/plans" element={<Navigate to="/members/all" replace />} />
        <Route path="/networking" element={<NetworkingPage />} />
        <Route path="/live" element={<LivePage />} />

        <Route path="/mypage" element={<MyPage />} />
        <Route path="/notice" element={<NoticePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <LiveChatPanel />
      <UpdateNoticeModal />
      <PlanCountNotifier />
    </LivePlansProvider>
    </BrowserRouter>
    </AuthProvider>
    </MembersProvider>
    </ThemeProvider>
  );
}
