import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, push, remove, get } from "firebase/database";
import { rtdb } from "../firebase";
import { WEB_APP_URL } from "../webAppConfig";
import { useAuth } from "../context/AuthContext";
import { usePlanMutations } from "../context/LivePlansContext";
import membersData from "../data/members.json";
import { useAvatarByName, useMembersMap } from "../context/MembersContext";
import Navbar from "../components/Navbar";
import "./MyPage.css";

const CSV_URL = "https://docs.google.com/spreadsheets/d/1yAeYVbqyFwePzjjdU0ile_OAmZ-cR8iwu_95KPVsx7o/export?format=csv&gid=0";
// PlansPage와 동일한 캐시 키 공유 → 중복 네트워크 요청 없음
const CSV_CACHE_KEY = "plansCSV_v2";

function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === "," && !inQ) {
      result.push(cur.trim()); cur = "";
    } else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

function fmtDate(str) {
  if (!str) return "";
  const parts = str.split(".");
  if (parts.length >= 3) return `${parts[0]}.${parts[1].padStart(2, "0")}.${parts[2].padStart(2, "0")}`;
  return str;
}

export default function MyPage({ hideNavbar = false }) {
  const { currentUser, memberId, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const membersMap = useMembersMap();
  const myMember = useMemo(() => {
    if (memberId == null) return null;
    // MembersContext 우선 (Firestore 최신 데이터), 없으면 정적 JSON fallback
    const fromContext = Object.values(membersMap).find((m) => String(m.id) === String(memberId));
    return fromContext ?? membersData.find((m) => String(m.id) === String(memberId)) ?? null;
  }, [memberId, membersMap]);

  const memberName = myMember?.name ?? null;
  const avatarSrc = useAvatarByName(memberName);
  const { updatePlan, upsertPlan } = usePlanMutations();

  const [tab, setTab] = useState("active");
  const [sortOrder, setSortOrder] = useState("newest");
  const [csvRows, setCsvRows] = useState([]);
  const [csvLoading, setCsvLoading] = useState(true);
  const [csvError, setCsvError] = useState(false);
  const [fetchKey, setFetchKey] = useState(0); // 재시도용
  // planNumber 기준으로 즉시 완료 표시 (낙관적 업데이트)
  const [localDone, setLocalDone] = useState(new Set());
  const [actioningNum, setActioningNum] = useState(null);
  const [editingNum, setEditingNum] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [localEdits, setLocalEdits] = useState({});
  const [doneChatKeys, setDoneChatKeys] = useState({});

  useEffect(() => {
    if (!authLoading && !currentUser) navigate("/", { replace: true });
  }, [authLoading, currentUser, navigate]);

  // 6시간마다 CSV 자동 갱신
  useEffect(() => {
    if (!memberName) return;
    const id = setInterval(() => {
      localStorage.removeItem(CSV_CACHE_KEY);
      setFetchKey((k) => k + 1);
    }, 6 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [memberName]);

  // CSV 로드 — PlansPage 캐시에서 읽기 (직접 fetch 안 함)
  // PlansPage를 먼저 방문하면 캐시가 생성됨
  useEffect(() => {
    if (!memberName) { setCsvLoading(false); return; }
    setCsvLoading(true);
    setCsvError(false);

    const load = () => {
      try {
        const cached = JSON.parse(localStorage.getItem(CSV_CACHE_KEY) ?? "null");
        if (cached?.rawText) {
          setCsvRows(parseCSV(cached.rawText));
          setCsvLoading(false);
          return true;
        }
      } catch {}
      return false;
    };

    if (load()) return;

    // 캐시 없으면 직접 fetch 시도 (PlansPage 방식과 동일 — r.ok 체크 없음)
    fetch(CSV_URL)
      .then((r) => {
        if (!r.ok) throw new Error("fetch");
        return r.text();
      })
      .then((text) => {
        if (text.trim().startsWith("<")) throw new Error("html"); // 로그인 페이지 응답
        localStorage.setItem(CSV_CACHE_KEY, JSON.stringify({ ts: Date.now(), rawText: text }));
        setCsvRows(parseCSV(text));
        setCsvLoading(false);
      })
      .catch(() => { setCsvError(true); setCsvLoading(false); });
  }, [memberName, fetchKey]);

  const myRows = useMemo(() => {
    const filtered = csvRows.filter((r) => r["이름"] === memberName);
    const byNum = new Map();
    filtered.forEach((r) => byNum.set(String(r["계획번호"]).replace(/\s/g, ""), r));
    return [...byNum.values()];
  }, [csvRows, memberName]);

  // 미완료 목록 — localDone 포함해서 표시 (완료 누른 건 체크만 바뀜, 목록에서 제거 안 함)
  const activePlans = useMemo(
    () => myRows
      .filter((r) => r["상태"] === "미완료")
      .map((r) => ({ id: r["ID"] || r["계획번호"], num: r["계획번호"], title: r["계획내용"], date: fmtDate(r["생성일"]) }))
      .sort((a, b) => sortOrder === "oldest" ? Number(a.num) - Number(b.num) : Number(b.num) - Number(a.num)),
    [myRows, sortOrder]
  );

  const donePlans = useMemo(
    () => myRows
      .filter((r) => r["상태"] === "완료")
      .map((r) => ({ id: r["ID"] || r["계획번호"], num: r["계획번호"], title: r["계획내용"], date: fmtDate(r["완료일"] || r["생성일"]) }))
      .sort((a, b) => sortOrder === "oldest" ? Number(a.num) - Number(b.num) : Number(b.num) - Number(a.num)),
    [myRows, sortOrder]
  );

  const handleComplete = (plan) => {
    if (actioningNum) return;
    setActioningNum(plan.num);
    // 즉시 체크 표시 (MyPage)
    setLocalDone((prev) => new Set([...prev, plan.num]));
    // 채팅에도 완료 반영 — LivePlansContext의 CSV 플랜 ID 형식
    const planId = `csv-${memberName}-${plan.num}`;
    const nowSecs = Math.floor(Date.now() / 1000);
    updatePlan(planId, {
      status: "done",
      completedAt: { seconds: nowSecs, nanoseconds: 0 },
    });
    // 실시간 채팅에도 완료 카드 즉시 공유
    const doneRef = push(ref(rtdb, "chatMessages"), {
      type: "done",
      authorName: memberName,
      planNumber: Number(plan.num),
      content: localEdits[plan.num] ?? plan.title,
      createdAt: Date.now(),
    });
    setDoneChatKeys((prev) => ({ ...prev, [plan.num]: doneRef.key }));
    // Apps Script Web App에 완료 기록 (fire-and-forget)
    fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ type: "complete", memberName, planNumber: plan.num }),
    }).catch(() => {});
    setActioningNum(null);
  };

  const handleUndoComplete = (plan) => {
    setLocalDone((prev) => { const next = new Set(prev); next.delete(plan.num); return next; });
    const planId = `csv-${memberName}-${plan.num}`;
    updatePlan(planId, { status: null, completedAt: null });
    const chatKey = doneChatKeys[plan.num];
    if (chatKey) {
      remove(ref(rtdb, `chatMessages/${chatKey}`)).catch(() => {});
      setDoneChatKeys((prev) => { const next = { ...prev }; delete next[plan.num]; return next; });
    }
    fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ type: "uncomplete", memberName, planNumber: plan.num }),
    }).catch(() => {});
  };

  // 채팅에 올라간 해당 계획 메시지(들)를 즉시 제거
  const removeChatPlanMessages = async (planNumber) => {
    try {
      const snap = await get(ref(rtdb, "chatMessages"));
      const removals = [];
      snap.forEach((child) => {
        const v = child.val();
        if (v.authorName === memberName && Number(v.planNumber) === Number(planNumber) && !v.type) {
          removals.push(remove(child.ref));
        }
      });
      await Promise.all(removals);
    } catch (e) {
      console.error("removeChatPlanMessages failed", e);
    }
  };

  const handleEditSave = async (plan) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setLocalEdits((prev) => ({ ...prev, [plan.num]: trimmed }));
    setEditingNum(null);

    localStorage.removeItem(CSV_CACHE_KEY);

    // 채팅: 기존 메시지 지우고, 수정된 내용으로 다시 게시 (수정됨 표시)
    await removeChatPlanMessages(plan.num);
    const nowMs = Date.now();
    const pushRef = push(ref(rtdb, "chatMessages"), {
      authorName: memberName,
      planNumber: Number(plan.num),
      content: trimmed,
      createdAt: nowMs,
      edited: true,
    });

    upsertPlan({
      id: pushRef.key,
      authorName: memberName,
      planNumber: Number(plan.num),
      content: trimmed,
      authorUid: null,
      status: "active",
      createdAt: { seconds: Math.floor(nowMs / 1000), nanoseconds: 0 },
      completedAt: null,
    });

    fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ type: "edit", memberName, planNumber: plan.num, content: trimmed }),
    }).catch(() => {});
  };

  if (authLoading || !currentUser) return null;

  return (
    <div className="myPageRoot">
      {!hideNavbar && <Navbar />}
      <main className="myPageContent">
        {/* 프로필 헤더 */}
        <div className="myPageHeader">
          {avatarSrc && (
            <img src={avatarSrc} alt={memberName ?? "프로필"} className="myPageAvatar" />
          )}
          <div className="myPageInfo">
            <div className="myPageName">{myMember?.name ?? currentUser.email}</div>
            <div className="myPageRole">{myMember?.role ?? "멤버"}</div>
            {myMember?.quote && (
              <div className="myPageQuote">"{myMember.quote}"</div>
            )}
            {Array.isArray(myMember?.bullets) && myMember.bullets.length > 0 && (
              <div className="myPageBullets">
                {myMember.bullets.map((b, i) => (
                  <span key={i} className="myPageBulletTag">{b}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {!myMember ? (
          <div className="myPageNoProfile">
            Plans 페이지에서 본인 카드를 클릭해 프로필을 연결해주세요.
          </div>
        ) : csvError ? (
          <div className="myPageNoProfile">
            <div>데이터를 불러오지 못했어요.</div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
              Plans 페이지를 먼저 방문한 뒤 다시 시도해주세요.
            </div>
            <button
              onClick={() => { localStorage.removeItem(CSV_CACHE_KEY); setFetchKey(k => k + 1); }}
              style={{ marginTop: 10, padding: "5px 14px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", fontSize: 13 }}
            >다시 시도</button>
          </div>
        ) : csvLoading ? (
          <div className="csvStatusMsg">불러오는 중…</div>
        ) : (
          <>
            {/* 탭 + 새로고침 버튼 */}
            <div className="myPageTabRow">
              <button
                className={`myPageTabBtn${tab === "active" ? " active" : ""}`}
                onClick={() => setTab("active")}
              >
                미완료 <span className="myPageTabCount">{activePlans.length}</span>
              </button>
              <button
                className={`myPageTabBtn${tab === "done" ? " active" : ""}`}
                onClick={() => setTab("done")}
              >
                완료 <span className="myPageTabCount">{donePlans.length}</span>
              </button>
              <div className="myPageSortBtns">
                <button
                  className={`myPageSortBtn${sortOrder === "oldest" ? " active" : ""}`}
                  onClick={() => setSortOrder("oldest")}
                >Oldest</button>
                <button
                  className={`myPageSortBtn${sortOrder === "newest" ? " active" : ""}`}
                  onClick={() => setSortOrder("newest")}
                >Newest</button>
              </div>
              <button
                className="myPageRefreshBtn"
                onClick={() => { localStorage.removeItem(CSV_CACHE_KEY); setFetchKey((k) => k + 1); }}
                disabled={csvLoading}
                title="구글 시트에서 최신 데이터 불러오기"
              >
                {csvLoading ? "⟳" : "↻"}
              </button>
            </div>

            {/* 계획 목록 */}
            <div className="myPlansList">
              {tab === "active" ? (
                activePlans.length === 0 ? (
                  <div className="myPlansEmpty">미완료 계획이 없어요 🎉</div>
                ) : (
                  activePlans.map((plan, i) => {
                    const isDone = localDone.has(plan.num);
                    const isEditing = editingNum === plan.num;
                    const displayTitle = localEdits[plan.num] ?? plan.title;
                    return (
                      <div key={`active-${plan.num}-${i}`} className={`myPlanItem${isDone ? " myPlanItemDone" : ""}`}>
                        <div className="myPlanItemLeft">
                          <span className="myPlanNum">{plan.num}번</span>
                          {isEditing ? (
                            <input
                              className="myPlanEditInput"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditSave(plan);
                                if (e.key === "Escape") setEditingNum(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            <span className="myPlanContent">{displayTitle}</span>
                          )}
                        </div>
                        <div className="myPlanItemRight">
                          {isEditing ? (
                            <>
                              <button className="myPlanSaveBtn" onClick={() => handleEditSave(plan)}>저장</button>
                              <button className="myPlanCancelBtn" onClick={() => setEditingNum(null)}>취소</button>
                            </>
                          ) : (
                            <>
                              <span className="myPlanDate">{plan.date}</span>
                              {isDone ? (
                                <>
                                  <span className="myPlanDoneBadge">✅</span>
                                  <button
                                    className="myPlanCancelBtn"
                                    onClick={() => handleUndoComplete(plan)}
                                  >취소</button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="myPlanEditBtn"
                                    onClick={() => { setEditingNum(plan.num); setEditValue(displayTitle); }}
                                    title="수정"
                                  >✏️</button>
                                  <button
                                    className="myPlanCompleteBtn"
                                    onClick={() => handleComplete(plan)}
                                    disabled={actioningNum === plan.num}
                                  >
                                    {actioningNum === plan.num ? "…" : "완료"}
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )
              ) : donePlans.length === 0 ? (
                <div className="myPlansEmpty">완료된 계획이 없어요.</div>
              ) : (
                donePlans.map((plan, i) => (
                  <div key={`done-${plan.num}-${i}`} className="myPlanItem myPlanItemDone">
                    <div className="myPlanItemLeft">
                      <span className="myPlanNum">{plan.num}번</span>
                      <span className="myPlanContent">{plan.title}</span>
                    </div>
                    <div className="myPlanItemRight">
                      <span className="myPlanDate">{plan.date}</span>
                      <span className="myPlanDoneBadge">✅</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
