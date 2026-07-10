import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import "./NetworkingPage.css";
import Navbar from "../components/Navbar";
import NetworkingEditModal from "../components/NetworkingEditModal";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";


function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const normalize = (row) => ({
    date:         (row["date"] || row["날짜"] || "").trim(),
    type:         (row["type"] || row["카테고리"] || row["유형"] || "").trim(),
    content:      (row["content"] || row["내용"] || "").trim(),
    participants: (row["participants"] || row["사람"] || "").trim(),
  });
  const normalizeDate = (d) => {
    const m = d.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
    if (!m) return d;
    return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  };
  return lines.slice(1).map((line) => {
    const fields = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === "," && !inQ) { fields.push(cur.trim()); cur = ""; }
      else { cur += line[i]; }
    }
    fields.push(cur.trim());
    const raw = {};
    headers.forEach((h, i) => { raw[h] = fields[i] ?? ""; });
    const ev = normalize(raw);
    ev.date = normalizeDate(ev.date);
    return ev;
  }).filter((ev) => ev.date);
}

const MONTH_KO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DAY_KO   = ["일","월","화","수","목","금","토"];

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${y}.${m}.${d}`;
}

const TYPE_COLORS = {
  "공식 네트워킹": "#64d2f5",
  "사적 네트워킹": "#a78bfa",
  "소모임":        "#34d399",
  "카공&스터디":   "#fbbf24",
};
function getColor(type) { return TYPE_COLORS[type] || "#64d2f5"; }

export default function NetworkingPage() {
  const { canEditNetworking: canEdit } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cur, setCur] = useState(() => {
    const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [selected, setSelected] = useState(null);
  const [editModal, setEditModal] = useState(null); // null | { mode: "add" } | { mode: "edit", event, docId }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // docId

  const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRIuZ2j6E6cDBpDGszOJSGT2HaRuY23xnuh8JWNNBC73jVdly_juU9SN_Xxa1SoY6TaW3cmPNZytM1S/pub?gid=0&single=true&output=csv";

  useEffect(() => {
    async function load() {
      // Firestore 우선
      try {
        const snap = await getDocs(collection(db, "networking"));
        if (!snap.empty) {
          const data = snap.docs.map((d) => ({ ...d.data(), _id: d.id }));
          data.sort((a, b) => b.date.localeCompare(a.date));
          setEvents(data);
          setLoading(false);
          return;
        }
      } catch {}

      // Firestore 없으면 Google Sheets CSV 폴백
      try {
        const r = await fetch(SHEET_CSV);
        const t = await r.text();
        setEvents(parseCSV(t));
      } catch {
        try {
          const r = await fetch(process.env.PUBLIC_URL + "/data/networking.csv");
          const t = await r.text();
          setEvents(parseCSV(t));
        } catch { setEvents([]); }
      }
      setLoading(false);
    }
    load();
  }, []);

  const { y, m } = cur;
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const byDate = {};
  events.forEach((ev) => {
    const d = (ev.date || "").trim();
    if (d) { if (!byDate[d]) byDate[d] = []; byDate[d].push(ev); }
  });

  const prevMonth = () => setCur(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
  const nextMonth = () => setCur(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 });
  const handleDayClick = (dateStr) => {
    if (!byDate[dateStr]) return;
    setSelected((prev) => prev === dateStr ? null : dateStr);
  };

  const selectedEvents = selected ? (byDate[selected] || []) : [];
  const sortedDates = Object.keys(byDate).sort().reverse();
  const totalParticipants = new Set(
    events.flatMap(e => (e.participants || "").split(",").map(p => p.trim()).filter(Boolean))
  ).size;

  // ── CRUD ──
  const handleAdd = async (data) => {
    const docRef = await addDoc(collection(db, "networking"), data);
    const newEv = { ...data, _id: docRef.id };
    setEvents((prev) => [newEv, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
  };

  const handleEdit = async (data) => {
    const { docId } = editModal;
    await updateDoc(doc(db, "networking", docId), data);
    setEvents((prev) =>
      prev.map((e) => e._id === docId ? { ...e, ...data } : e)
        .sort((a, b) => b.date.localeCompare(a.date))
    );
    setSelected(null);
  };

  const handleDelete = async (docId) => {
    await deleteDoc(doc(db, "networking", docId));
    setEvents((prev) => prev.filter((e) => e._id !== docId));
    setDeleteConfirm(null);
    setSelected(null);
  };

  return (
    <div className="networkingPage">
      <div className="networkingBg" />
      <div className="networkingGlow" />
      <Navbar />

      <main className="networkingWrap">
        <div className="networkingHeader">
          <div className="networkingTitleGroup">
            <h1 className="networkingTitle">Networking</h1>
            <p className="networkingDesc">KorA Valley 네트워킹 기록</p>
          </div>
          <div className="networkingHeaderDiv" />
          <div className="networkingStats">
            <div className="networkingStat">
              <span className="networkingStatNum">{events.length}</span>
              <span className="networkingStatLabel">총 네트워킹</span>
            </div>
            <div className="networkingStatDiv" />
            <div className="networkingStat">
              <span className="networkingStatNum">{totalParticipants}</span>
              <span className="networkingStatLabel">참여 멤버</span>
            </div>
          </div>
          {canEdit && (
            <button
              className="networkingAddBtn"
              onClick={() => setEditModal({ mode: "add" })}
            >
              + 추가
            </button>
          )}
        </div>

        {loading ? (
          <div className="networkingStatus">불러오는 중…</div>
        ) : (
          <div className="calLayout">

            {/* ── LEFT: Calendar ── */}
            <div className="calCard">
              <div className="calNav">
                <button className="calNavBtn" onClick={prevMonth}>‹</button>
                <span className="calMonthLabel">{y}년 {MONTH_KO[m]}</span>
                <button className="calNavBtn" onClick={nextMonth}>›</button>
              </div>

              <div className="calGrid">
                {DAY_KO.map((d, i) => (
                  <div key={d} className={`calDayHeader ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>{d}</div>
                ))}
                {Array.from({ length: 42 }).map((_, i) => {
                  const day = i - firstDow + 1;
                  if (day < 1 || day > daysInMonth)
                    return <div key={`empty-${i}`} className="calCell calCellEmpty" />;
                  const dow = i % 7;
                  const dateStr = toDateStr(y, m, day);
                  const dayEvents = byDate[dateStr];
                  const hasEvent = !!dayEvents;
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selected;
                  const color = hasEvent ? getColor(dayEvents[0].type) : null;
                  return (
                    <div
                      key={dateStr}
                      className={["calCell", hasEvent ? "calCellEvent" : "", isToday ? "calCellToday" : "", isSelected ? "calCellSelected" : "", dow === 0 ? "sun" : dow === 6 ? "sat" : ""].filter(Boolean).join(" ")}
                      style={hasEvent ? { "--event-color": color } : {}}
                      onClick={() => handleDayClick(dateStr)}
                      role={hasEvent ? "button" : undefined}
                      tabIndex={hasEvent ? 0 : undefined}
                      onKeyDown={hasEvent ? (e) => e.key === "Enter" && handleDayClick(dateStr) : undefined}
                    >
                      <span className="calDayNum">{day}</span>
                      {hasEvent && (
                        <span className="calEventPill" style={{ background: color + "33", color }}>
                          {dayEvents[0].content.length > 5 ? dayEvents[0].content.slice(0, 5) + "…" : dayEvents[0].content}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="calLegend">
                {Object.entries(TYPE_COLORS).map(([label, color]) => (
                  <div key={label} className="calLegendItem">
                    <span className="calLegendDot" style={{ background: color }} />
                    <span className="calLegendLabel">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: List / Detail ── */}
            <div className="calSidebar">
              {selected && selectedEvents.length > 0 ? (
                <div className="calDetailPane">
                  <div className="calDetailHeader">
                    <div>
                      <div className="calDetailDate">{formatDate(selected)}</div>
                      <div className="calDetailCount">{selectedEvents.length}건의 네트워킹</div>
                    </div>
                    <button className="calDetailClose" onClick={() => setSelected(null)}>✕</button>
                  </div>

                  {selectedEvents.map((ev, i) => {
                    const color = getColor(ev.type);
                    const participants = (ev.participants || "").split(",").map(p => p.trim()).filter(Boolean);
                    return (
                      <div key={i} className="calDetailCard" style={{ "--event-color": color }}>
                        <div className="calDetailCardBar" style={{ background: color }} />
                        <div className="calDetailCardBody">
                          <div className="calDetailTitle">{ev.content}</div>
                          <div className="calDetailMeta">{participants.length}명 참가</div>
                          <div className="calDetailChips">
                            {participants.map((p, j) => (
                              <span key={j} className="calChip" style={{ borderColor: color + "44", color: color + "cc" }}>{p}</span>
                            ))}
                          </div>
                          {canEdit && ev._id && (
                            <div className="calDetailEditRow">
                              <button className="calDetailEditBtn" onClick={() => setEditModal({ mode: "edit", event: ev, docId: ev._id })}>수정</button>
                              {deleteConfirm === ev._id ? (
                                <>
                                  <span style={{ fontSize: 12, color: "rgba(255,100,100,0.8)" }}>삭제할까요?</span>
                                  <button className="calDetailDeleteBtn confirm" onClick={() => handleDelete(ev._id)}>확인</button>
                                  <button className="calDetailEditBtn" onClick={() => setDeleteConfirm(null)}>취소</button>
                                </>
                              ) : (
                                <button className="calDetailDeleteBtn" onClick={() => setDeleteConfirm(ev._id)}>삭제</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="calListPane">
                  <div className="calListHeader">최근 네트워킹</div>
                  <div className="calListItems">
                    {sortedDates.map((dateStr) => {
                      const evs = byDate[dateStr];
                      const color = getColor(evs[0].type);
                      const participants = evs.flatMap(e =>
                        (e.participants || "").split(",").map(p => p.trim()).filter(Boolean)
                      );
                      const unique = [...new Set(participants)];
                      return (
                        <button
                          key={dateStr}
                          className="calListItem"
                          onClick={() => {
                            const [ry, rm] = dateStr.split("-").map(Number);
                            setCur({ y: ry, m: rm - 1 });
                            setSelected(dateStr);
                          }}
                        >
                          <div className="calListItemBar" style={{ background: color }} />
                          <div className="calListItemBody">
                            <div className="calListItemTop">
                              <span className="calListItemContent">{evs[0].content}</span>
                              <span className="calListItemDate">{formatDate(dateStr)}</span>
                            </div>
                            <div className="calListItemPeople">
                              {unique.slice(0, 5).map((p, j) => <span key={j} className="calListChip">{p}</span>)}
                              {unique.length > 5 && <span className="calListMore">+{unique.length - 5}</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {editModal && (
        <NetworkingEditModal
          event={editModal.mode === "edit" ? editModal.event : null}
          onClose={() => setEditModal(null)}
          onSave={editModal.mode === "add" ? handleAdd : handleEdit}
        />
      )}
    </div>
  );
}
