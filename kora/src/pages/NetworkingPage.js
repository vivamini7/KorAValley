import { useEffect, useState } from "react";
import "./NetworkingPage.css";
import Navbar from "../components/Navbar";

/*
  ── networking.json 형식 ──────────────────────────────────────────
  public/data/networking.json 파일을 직접 수정해서 행사를 추가하세요.
  사진 파일은 public/data/photos/ 폴더에 넣어두면 됩니다.

  [
    {
      "id": 1,
      "event": "1기 네트워킹",          ← 행사 이름
      "date": "2025년 1월",             ← 날짜
      "description": "행사 설명...",    ← 내용 (없으면 빈 문자열 "")
      "photos": [                       ← 사진 파일 경로 목록
        "data/photos/1.jpg",
        "data/photos/2.jpg"
      ]
    },
    { "id": 2, ... }
  ]
  ─────────────────────────────────────────────────────────────────
*/

export default function NetworkingPage() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null); // { src, event, date }

  useEffect(() => {
    fetch(process.env.PUBLIC_URL + "/data/networking.json")
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox]);

  const base = process.env.PUBLIC_URL + "/";

  return (
    <div className="networkingPage">
      <div className="networkingBg" />
      <div className="networkingGlow" />
      <Navbar />

      <main className="networkingWrap">
        <div className="networkingHeader">
          <h1 className="networkingTitle">Networking</h1>
          <p className="networkingDesc">KorA Valley 네트워킹 현장</p>
        </div>

        {loading ? (
          <div className="networkingStatus">사진 불러오는 중…</div>
        ) : events.length === 0 ? (
          <div className="networkingEmpty">
            <div className="networkingEmptyIcon">📷</div>
            <div className="networkingEmptyText">네트워킹 사진이 곧 업로드될 예정입니다.</div>
            <div className="networkingEmptyHint">
            </div>
          </div>
        ) : (
          <div className="networkingEvents">
            {events.map((ev) => (
              <div key={ev.id} className="networkingEvent">
                {/* 행사 정보 헤더 */}
                <div className="networkingEventHeader">
                  <div className="networkingEventMeta">
                    <span className="networkingEventDate">{ev.date}</span>
                    <h2 className="networkingEventName">{ev.event}</h2>
                  </div>
                  {ev.description && (
                    <p className="networkingEventDesc">{ev.description}</p>
                  )}
                </div>

                {/* 사진 그리드 */}
                {ev.photos && ev.photos.length > 0 && (
                  <div className="networkingGrid">
                    {ev.photos.map((src, i) => (
                      <button
                        key={i}
                        className="networkingItem"
                        onClick={() => setLightbox({ src: base + src, event: ev.event, date: ev.date })}
                        type="button"
                        aria-label={`${ev.event} 사진 ${i + 1}`}
                      >
                        <img
                          src={base + src}
                          alt={`${ev.event} ${i + 1}`}
                          className="networkingImg"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <div className="networkingEventSep" />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="networkingLightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="networkingLightboxClose"
            onClick={() => setLightbox(null)}
            aria-label="닫기"
          >✕</button>
          <div className="networkingLightboxInner" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.event} className="networkingLightboxImg" />
            <div className="networkingLightboxInfo">
              <span className="networkingLightboxDate">{lightbox.date}</span>
              <span className="networkingLightboxEvent">{lightbox.event}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
