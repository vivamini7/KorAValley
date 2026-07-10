import { useState } from "react";
import LiveChatPanel from "./LiveChatPanel";
import MyPage from "../pages/MyPage";
import "./AppShell.css";

export default function AppShell() {
  const [tab, setTab] = useState("chat");

  return (
    <div className="appShellRoot">
      <div className="appShellBody">
        {tab === "chat" ? (
          <LiveChatPanel standalone />
        ) : (
          <MyPage hideNavbar />
        )}
      </div>
      <nav className="appShellTabs">
        <button
          className={`appShellTab${tab === "chat" ? " active" : ""}`}
          onClick={() => setTab("chat")}
        >
          <span className="appShellTabIcon">💬</span>
          <span>채팅</span>
        </button>
        <button
          className={`appShellTab${tab === "mypage" ? " active" : ""}`}
          onClick={() => setTab("mypage")}
        >
          <span className="appShellTabIcon">👤</span>
          <span>마이페이지</span>
        </button>
      </nav>
    </div>
  );
}
