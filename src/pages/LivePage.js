import { useEffect, useRef, useState, useCallback } from "react";
import { WEB_APP_URL } from "../webAppConfig";
import { useAuth } from "../context/AuthContext";
import { useLivePlans, usePlanMutations } from "../context/LivePlansContext";
import Navbar from "../components/Navbar";
import "./LivePage.css";

/* ── 날짜 구분선 포맷 ── */
function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/* ── plans 배열 → 시간순 이벤트 배열 ── */
function buildTimeline(plans) {
  const events = [];
  plans.forEach((plan) => {
    if (plan.createdAt) {
      events.push({ type: "plan", plan, ts: plan.createdAt });
    }
    if (plan._pendingSync && plan.pendingAt) {
      events.push({ type: "pending", plan, ts: plan.pendingAt });
    } else if (plan.status === "done" && plan.completedAt) {
      events.push({ type: "done", plan, ts: plan.completedAt });
    }
  });
  events.sort((a, b) => {
    const as = a.ts?.seconds ?? 0;
    const bs = b.ts?.seconds ?? 0;
    return as - bs;
  });
  return events;
}

/* ── 날짜 구분선 삽입 ── */
function insertDateSeparators(events) {
  const result = [];
  let lastDate = null;
  events.forEach((ev) => {
    const dateStr = formatDate(ev.ts);
    if (dateStr && dateStr !== lastDate) {
      result.push({ type: "date", label: dateStr, key: dateStr });
      lastDate = dateStr;
    }
    result.push(ev);
  });
  return result;
}

/* ── 채팅 이벤트 컴포넌트 ── */
function ChatEvent({ event, currentUser, onComplete, completing }) {
  const { type, plan } = event;

  if (type === "date") {
    return <div className="liveDateSep"><span>{event.label}</span></div>;
  }

  const isOwner = currentUser?.uid === plan.authorUid;

  if (type === "plan") {
    return (
      <div className="liveChatRow">
        <div className="liveChatBubble liveChatBubblePlan">
          <span className="livePlanNum">{plan.planNumber}번째 계획</span>
          <span className="livePlanColon"> : </span>
          <span className="livePlanContent">{plan.content}</span>
          {isOwner && (
            <button
              className={`liveCompleteBtn${plan._pendingSync ? " liveUndoBtn" : ""}`}
              onClick={() => onComplete(plan)}
              disabled={completing === plan.id}
            >
              {completing === plan.id ? "…" : plan._pendingSync ? "↩ 되돌리기" : "완료"}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (type === "pending") {
    return (
      <div className="liveChatRow">
        <div className="liveChatBubble liveChatBubblePending">
          ⏳{plan.planNumber}번째 계획 완료 예정
        </div>
      </div>
    );
  }

  if (type === "done") {
    return (
      <div className="liveChatRow">
        <div className="liveChatBubble liveChatBubbleDone">
          ✅{plan.planNumber}번째 계획 완료
        </div>
      </div>
    );
  }

  return null;
}

/* ── 메인 페이지 ── */
export default function LivePage() {
  const { currentUser, memberId } = useAuth();
  const plans = useLivePlans();
  const { appendPlan, updatePlan } = usePlanMutations();
  const loading = plans.length === 0;
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(null);
  const bottomRef = useRef(null);
  const feedRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const authorName = memberId || currentUser?.displayName || currentUser?.email || "익명";

  /* ── 새 메시지 오면 자동 스크롤 ── */
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [plans, autoScroll]);

  /* ── 스크롤 위로 올리면 자동스크롤 해제 ── */
  const handleScroll = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(near);
  }, []);

  /* ── 계획 등록 ── */
  const handleSubmit = async () => {
    const content = input.trim();
    if (!content || !currentUser || submitting) return;
    setSubmitting(true);
    try {
      // 내 계획 중 최대 번호 + 1
      const myMax = plans
        .filter((p) => p.authorName === authorName)
        .reduce((max, p) => Math.max(max, p.planNumber ?? 0), 0);
      const localRaw = parseInt(localStorage.getItem("lcpMaxPlan") ?? "0", 10);
      const newNumber = Math.max(myMax, Number.isFinite(localRaw) ? localRaw : 0) + 1;
      localStorage.setItem("lcpMaxPlan", String(newNumber));

      const nowSecs = Math.floor(Date.now() / 1000);
      appendPlan({
        id: `local-${Date.now()}`, planNumber: newNumber, content,
        authorName, authorUid: currentUser.uid, status: "active",
        createdAt: { seconds: nowSecs, nanoseconds: 0 }, completedAt: null,
      });
      setInput("");
      setAutoScroll(true);
      // Apps Script Web App에 기록 (fire-and-forget)
      fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ type: "newPlan", authorName, planNumber: newNumber, content }),
      }).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  /* ── 완료 처리 ── */
  const handleComplete = async (plan) => {
    if (completing) return;
    setCompleting(plan.id);
    try {
      const nowSecs = Math.floor(Date.now() / 1000);
      updatePlan(plan.id, {
        ...plan, status: "done",
        completedAt: { seconds: nowSecs, nanoseconds: 0 },
      });
      fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ type: "complete", memberName: plan.authorName, planNumber: String(plan.planNumber) }),
      }).catch(() => {});
    } finally {
      setCompleting(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const timeline = insertDateSeparators(buildTimeline(plans));

  /* ── 미완료 계획 수 (현재 유저) ── */
  const myActive = currentUser
    ? plans.filter((p) => p.authorUid === currentUser.uid && p.status === "active").length
    : 0;

  return (
    <div className="livePage">
      <div className="bg" />
      <div className="glow" />
      <Navbar />

      <main className="liveMain">
        {/* 헤더 */}
        <div className="liveHeader">
          <div className="liveHeaderLeft">
            <span className="liveHeaderTitle">Live Plans</span>
            <span className="liveHeaderSub">실시간 계획 채팅</span>
          </div>
          {currentUser && myActive > 0 && (
            <div className="liveMyActive">
              내 미완료 <span className="liveMyActiveBadge">{myActive}</span>
            </div>
          )}
        </div>

        {/* 채팅 피드 */}
        <div className="liveFeed" ref={feedRef} onScroll={handleScroll}>
          {loading ? (
            <div className="liveStatusMsg">불러오는 중…</div>
          ) : timeline.length === 0 ? (
            <div className="liveStatusMsg">아직 계획이 없어요. 첫 번째 계획을 등록해보세요!</div>
          ) : (
            timeline.map((ev, i) => (
              <ChatEvent
                key={ev.type === "date" ? ev.key : `${ev.type}-${ev.plan?.id}-${i}`}
                event={ev}
                currentUser={currentUser}
                onComplete={handleComplete}
                completing={completing}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        {currentUser ? (
          <div className="liveInputArea">
            <textarea
              className="liveTextarea"
              placeholder="계획을 입력하세요… (Enter로 등록)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={submitting}
              rows={1}
            />
            <button
              className="liveSubmitBtn"
              onClick={handleSubmit}
              disabled={submitting || !input.trim()}
            >
              {submitting ? "…" : "등록"}
            </button>
          </div>
        ) : (
          <div className="liveLoginNotice">
            로그인 후 계획을 입력하고 완료할 수 있어요.
          </div>
        )}

        {/* 아래로 이동 버튼 */}
        {!autoScroll && (
          <button
            className="liveScrollDownBtn"
            onClick={() => {
              setAutoScroll(true);
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            ↓ 최신으로
          </button>
        )}
      </main>
    </div>
  );
}
