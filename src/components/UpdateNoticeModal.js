import { useEffect, useState } from "react";
import { CHANGELOG_VERSION, CHANGELOG } from "../data/changelog";
import "./UpdateNoticeModal.css";

const STORAGE_KEY = "noticeDismissed";

export default function UpdateNoticeModal() {
  const [open, setOpen] = useState(false);
  const latest = CHANGELOG[0];

  useEffect(() => {
    try {
      const dismissedVersion = localStorage.getItem(STORAGE_KEY);
      if (dismissedVersion !== CHANGELOG_VERSION) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const close = () => setOpen(false);

  const dontShowAgain = () => {
    try {
      localStorage.setItem(STORAGE_KEY, CHANGELOG_VERSION);
    } catch {}
    setOpen(false);
  };

  if (!open || !latest) return null;

  return (
    <div className="unOverlay" onClick={close}>
      <div className="unModal" onClick={(e) => e.stopPropagation()}>
        <button className="unClose" onClick={close} aria-label="닫기">✕</button>
        <h2 className="unTitle">📢 업데이트 소식</h2>
        <div className="unDate">{latest.date}</div>
        <ul className="unList">
          {latest.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <div className="unActions">
          <button className="unDontShowBtn" onClick={dontShowAgain}>다시 보지 않기</button>
          <button className="unCloseBtn" onClick={close}>닫기</button>
        </div>
      </div>
    </div>
  );
}
