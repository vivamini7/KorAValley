import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";

import { ref, push, remove, get, limitToLast, query, onValue, orderByKey, endBefore } from "firebase/database";
import { rtdb } from "../firebase";
import { WEB_APP_URL } from "../webAppConfig";
import { avatarMap, defaultAvatar } from "../utils/avatarMap";
import { useAvatarByName, useMembersMap } from "../context/MembersContext";
import { useLivePlans, usePlanMutations } from "../context/LivePlansContext";
import { useAuth } from "../context/AuthContext";
import membersData from "../data/members.json";
import "./LiveChatPanel.css";

const CSV_CACHE_KEY = "plansCSV_v2";
const CSV_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CSV_LOAD_BATCH = 10;

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

// CSV 캐시에서 직접 내 계획번호 목록을 읽음 (채팅창 표시 상태와 무관하게 항상 최신 시트 기준)
function getMyPlanNumbersFromCSV(myName) {
  try {
    const cached = JSON.parse(localStorage.getItem(CSV_CACHE_KEY) ?? "null");
    if (!cached?.rawText) return new Set();
    return new Set(
      parseCSV(cached.rawText)
        .filter((r) => r["이름"] === myName)
        .map((r) => Number(r["계획번호"]))
    );
  } catch { return new Set(); }
}

// CSV 캐시가 일시적으로 비어있을 때를 대비해 마지막으로 확인된 계획번호 집합을
// 사용자별로 localStorage에 보존해둔다 (삭제로 빈 번호가 생겨도 정확히 채우기 위함)
function getKnownPlanNumbers(myName) {
  try {
    const arr = JSON.parse(localStorage.getItem(`lcpAllNums_${myName}`) ?? "[]");
    return new Set(Array.isArray(arr) ? arr.map(Number) : []);
  } catch { return new Set(); }
}
function saveKnownPlanNumbers(myName, nums) {
  localStorage.setItem(`lcpAllNums_${myName}`, JSON.stringify([...nums]));
}

function MiniProfileCard({ name, onClose }) {
  const membersMap = useMembersMap();
  const member = membersMap[name] ?? membersData.find((m) => m.name === name);
  const avatar = member?.avatarUrl || (member?.avatar && avatarMap[member.avatar]) || defaultAvatar;
  const links = member?.links || {};

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!member) return null;

  return createPortal(
    <div className="lcpMiniOverlay" onClick={onClose}>
      <div className="lcpMiniCard" onClick={(e) => e.stopPropagation()}>
        <button className="lcpMiniClose" onClick={onClose}>✕</button>
        <div className="lcpMiniTop">
          <img src={avatar} alt={member.name} className="lcpMiniAvatar" />
          <div>
            <div className="lcpMiniName">{member.name}</div>
            <div className="lcpMiniRole">{member.role}</div>
          </div>
        </div>
        {member.quote && <p className="lcpMiniQuote">"{member.quote}"</p>}
        {Array.isArray(member.bullets) && member.bullets.length > 0 && (
          <ul className="lcpMiniBullets">
            {member.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        )}
        {Array.isArray(member.goals) && member.goals.length > 0 && (
          <div className="lcpMiniGoals">
            <div className="lcpMiniGoalsLabel">목표</div>
            <ul className="lcpMiniBullets">
              {member.goals.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          </div>
        )}
        <div className="lcpMiniLinks">
          {links.linkedin?.trim() && (
            <a href={links.linkedin} target="_blank" rel="noreferrer" className="lcpMiniLink">LinkedIn</a>
          )}
          {Array.isArray(links.custom) &&
            links.custom.filter((c) => c.url?.trim()).map((c, i) => (
              <a key={i} href={c.url} target="_blank" rel="noreferrer" className="lcpMiniLink">
                {c.label?.trim() || "Link"}
              </a>
            ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

// 채팅 메시지를 버블로 렌더링
function ChatBubble({ msg, isMe, isDone, onProfileClick, onComplete, onDelete, showHeader, editMode }) {
  const avatar = useAvatarByName(msg.authorName);

  const inner = msg.type === "done" ? (
    <div className="lcpDoneCard">
      <div className="lcpDoneCardHeader">
        <span className="lcpDoneCheck">✓</span>
        <span className="lcpDoneCardNum">{msg.planNumber}번째 계획 완료</span>
      </div>
      <div className="lcpDoneCardContent">{msg.content}</div>
    </div>
  ) : (
    <span className="lcpPlanText">
      <span className="lcpNum">{msg.planNumber}번째 계획</span>
      <span className="lcpColon"> : </span>
      <span className="lcpContent">{msg.content}</span>
      {msg.edited && <span className="lcpEditedBadge"> (수정됨)</span>}
    </span>
  );

  return (
    <div className={`lcpRow${isMe ? " lcpRowMine" : ""}${!showHeader ? " lcpRowGrouped" : ""}`}>
      {!isMe && (
        showHeader ? (
          <img
            src={avatar}
            alt={msg.authorName}
            className="lcpAvatar lcpAvatarClickable"
            onClick={() => onProfileClick(msg.authorName)}
            title={`${msg.authorName} 프로필 보기`}
          />
        ) : (
          <div className="lcpAvatarSpacer" />
        )
      )}
      <div className="lcpBubbleWrap">
        {!isMe && showHeader && (
          <div className="lcpName lcpNameClickable" onClick={() => onProfileClick(msg.authorName)}>
            {msg.authorName}
          </div>
        )}
        <div className="lcpBubbleRow">
          <div className={`lcpBubble${msg.type === "done" ? " lcpBubbleDone" : isMe ? " lcpBubbleMe" : ""}`}>
            {inner}
          </div>
          {msg.type !== "done" && editMode && (
            <div className="lcpOutsideBtnGroup">
              {isMe && !isDone && (
                <button
                  className="lcpOutsideCompleteBtn"
                  onClick={() => onComplete(msg)}
                  title="완료 처리"
                >✓</button>
              )}
              <button
                className="lcpOutsideDeleteBtn"
                onClick={() => onDelete(msg)}
                title="삭제"
              >✕</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function LiveChatPanel({ standalone = false }) {
  const isMobile = useIsMobile();
  const { currentUser, memberId } = useAuth();
  const csvPlans = useLivePlans();
  const { appendPlan, updatePlan, upsertPlan } = usePlanMutations();
  const [localCompletedKeys, setLocalCompletedKeys] = useState(new Set());

  // RTDB 메시지 (실시간 + 페이지네이션)
  const [rtdbMessages, setRtdbMessages] = useState([]); // 최근 10개 live
  const [rtdbHistory, setRtdbHistory] = useState([]);   // 스크롤 시 추가 로드
  const [oldestKey, setOldestKey] = useState(null);     // 페이지네이션 커서
  const [hasMoreRtdb, setHasMoreRtdb] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [localMessages, setLocalMessages] = useState([]);
  const [csvExtraCount, setCsvExtraCount] = useState(0); // 1주일 범위 밖 CSV 기록을 몇 개 더 불러왔는지

  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).get("chat") === "open");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [panelWidth, setPanelWidth] = useState(380);
  const [editMode, setEditMode] = useState(false);
  const [panelHeight, setPanelHeight] = useState(() => window.innerHeight - 90);
  const [panelTop, setPanelTop] = useState(80);
  const [panelLeft, setPanelLeft] = useState(null); // null = anchored to right edge
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [profileName, setProfileName] = useState(null);

  const panelRef = useRef(null);
  const feedRef = useRef(null);
  const inputRef = useRef(null);
  const isComposingRef = useRef(false);
  const searchRef = useRef(null);
  const isDraggingV = useRef(false);
  const dragStartY = useRef(0);
  const dragStartTop = useRef(0);
  const dragStartX = useRef(0);
  const dragStartLeft = useRef(0);
  const isResizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const scrollAfterSendRef = useRef(false);

  const myName = memberId != null
    ? (membersData.find((m) => String(m.id) === String(memberId))?.name ?? null)
    : null;

  // ── RTDB 실시간 리스너 (최근 10개) ────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const msgsRef = ref(rtdb, "chatMessages");
    const recentQ = query(msgsRef, limitToLast(10));
    const unsubscribe = onValue(recentQ, (snap) => {
      const msgs = [];
      snap.forEach((child) => { msgs.push({ key: child.key, ...child.val() }); });
      msgs.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
      setRtdbMessages(msgs);
      setLocalMessages((prev) => prev.filter((lm) => !msgs.some((m) => m.key === lm.key)));
      // 첫 로드 시 페이지네이션 커서 설정
      if (msgs.length > 0) setOldestKey((prev) => prev ?? msgs[0].key);
      if (msgs.length < 10) setHasMoreRtdb(false);
    }, () => {});
    return () => unsubscribe();
  }, [currentUser]);

  // ── 스크롤 위로 → 이전 RTDB 메시지 추가 로드 ─────────────────
  const loadMoreRtdb = useCallback(async () => {
    if (!hasMoreRtdb || loadingMore || !oldestKey) return;
    setLoadingMore(true);
    try {
      const q = query(ref(rtdb, "chatMessages"), orderByKey(), endBefore(oldestKey), limitToLast(10));
      const snap = await get(q);
      const msgs = [];
      snap.forEach((child) => { msgs.push({ key: child.key, ...child.val() }); });
      if (msgs.length === 0) { setHasMoreRtdb(false); return; }
      msgs.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
      setOldestKey(msgs[0].key);
      setRtdbHistory((prev) => {
        const existingKeys = new Set(prev.map((m) => m.key));
        return [...msgs.filter((m) => !existingKeys.has(m.key)), ...prev];
      });
      if (msgs.length < 10) setHasMoreRtdb(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreRtdb, loadingMore, oldestKey]);

  const rtdbDoneKeySet = useMemo(() => {
    return new Set(
      [...rtdbHistory, ...rtdbMessages]
        .filter((m) => m.type === "done")
        .map((m) => `${m.authorName}||${m.planNumber}`)
    );
  }, [rtdbHistory, rtdbMessages]);

  // ── CSV 과거 기록 전체 (RTDB·local과 중복 제거, 시간순) ────────
  const csvHistoryAll = useMemo(() => {
    const allRtdbMsgs = [...rtdbHistory, ...rtdbMessages];
    const rtdbPlanKeys = new Set(
      allRtdbMsgs.filter((m) => m.type !== "done").map((m) => `${m.authorName}||${m.planNumber}`)
    );
    const rtdbDoneKeys = new Set(
      allRtdbMsgs.filter((m) => m.type === "done").map((m) => `${m.authorName}||${m.planNumber}`)
    );
    const localKeys = new Set(localMessages.map((lm) => `${lm.authorName}||${lm.planNumber}`));

    const csvItems = [];
    csvPlans
      .filter((p) => p.status !== "deleted" && !rtdbPlanKeys.has(`${p.authorName}||${p.planNumber}`) && !localKeys.has(`${p.authorName}||${p.planNumber}`))
      .forEach((p) => {
        const createdAt = (p.createdAt?.seconds ?? 0) * 1000;
        csvItems.push({
          key: `csv-${p.authorName}-${p.planNumber}`,
          authorName: p.authorName,
          planNumber: p.planNumber,
          content: p.content,
          createdAt,
        });
        // 완료된 계획은 completedAt 시점에 done 버블 추가 (RTDB에 이미 있으면 생략)
        if (p.status === "done" && p.completedAt?.seconds && !rtdbDoneKeys.has(`${p.authorName}||${p.planNumber}`)) {
          csvItems.push({
            key: `done-${p.authorName}-${p.planNumber}`,
            type: "done",
            authorName: p.authorName,
            planNumber: p.planNumber,
            content: p.content,
            createdAt: p.completedAt.seconds * 1000,
          });
        }
      });
    return csvItems.sort((a, b) => a.createdAt - b.createdAt);
  }, [csvPlans, rtdbMessages, rtdbHistory, localMessages]);

  // 최근 1주일 기록의 시작 인덱스 (그 이전은 스크롤로 추가 로드)
  const csvWindowStartIndex = useMemo(() => {
    const cutoff = Date.now() - CSV_WINDOW_MS;
    const idx = csvHistoryAll.findIndex((item) => item.createdAt >= cutoff);
    return idx === -1 ? csvHistoryAll.length : idx;
  }, [csvHistoryAll]);

  const loadMoreCsv = useCallback(() => {
    if (csvWindowStartIndex - csvExtraCount <= 0) return;
    setCsvExtraCount((c) => Math.min(csvWindowStartIndex, c + CSV_LOAD_BATCH));
  }, [csvWindowStartIndex, csvExtraCount]);

  // ── 표시할 메시지 목록: CSV 과거(1주일+추가로드) → RTDB 최근 → local 즉시 ────
  const displayMessages = useMemo(() => {
    const csvHistory = csvHistoryAll.slice(Math.max(0, csvWindowStartIndex - csvExtraCount));

    // 2) RTDB 메시지 (히스토리 + 최근, 통합 후 시간순)
    const allRtdbKeys = new Set();
    const allRtdb = [...rtdbHistory, ...rtdbMessages].filter((m) => {
      if (allRtdbKeys.has(m.key)) return false;
      allRtdbKeys.add(m.key);
      return true;
    });
    const rtdbSorted = allRtdb.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

    // 3) local 낙관적 메시지 — RTDB에 아직 없는 것만
    const localOnly = localMessages
      .filter((lm) => !rtdbMessages.some((m) => m.key === lm.key))
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

    return [...csvHistory, ...rtdbSorted, ...localOnly].sort(
      (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)
    );
  }, [csvHistoryAll, csvWindowStartIndex, csvExtraCount, rtdbMessages, rtdbHistory, localMessages]);

  // ── 검색 필터 ──────────────────────────────────────────────────
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return displayMessages;
    const q = searchQuery.toLowerCase();
    return displayMessages.filter((m) =>
      m.content?.toLowerCase().includes(q) ||
      m.authorName?.toLowerCase().includes(q) ||
      String(m.planNumber).includes(q)
    );
  }, [displayMessages, searchQuery]);

  // ── 패널 열기/닫기 ─────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      document.body.classList.add("lcp-open");
      setTimeout(() => {
        if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }, 300);
    } else {
      document.body.classList.remove("lcp-open");
      setShowSearch(false);
      setSearchQuery("");
    }
    return () => document.body.classList.remove("lcp-open");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── 새 메시지 도착 시 스크롤 (DOM 커밋 직후 동기) ──────────────
  useLayoutEffect(() => {
    if (!open) return;
    if (!scrollAfterSendRef.current && !atBottom) return;
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
      scrollAfterSendRef.current = false;
    }
  }, [filteredMessages, open, atBottom]);

  // ── 스크롤 감지 ────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
    if (el.scrollTop < 80) {
      loadMoreRtdb();
      loadMoreCsv();
    }
  }, [loadMoreRtdb, loadMoreCsv]);

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll, open]);

  // ── 검색창 포커스 ──────────────────────────────────────────────
  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50);
  }, [showSearch]);

  // ── 패널 드래그 이동 (자유 위치) ────────────────────────────────
  const startDragV = useCallback((e) => {
    isDraggingV.current = true;
    dragStartY.current = e.clientY;
    dragStartX.current = e.clientX;
    dragStartTop.current = panelTop;
    dragStartLeft.current = panelLeft ?? (window.innerWidth - panelWidth);
    document.body.style.userSelect = "none";
    let detachPending = false;
    const onMove = (ev) => {
      if (!isDraggingV.current) return;
      const dy = ev.clientY - dragStartY.current;
      const dx = ev.clientX - dragStartX.current;
      const panelH = panelRef.current?.offsetHeight ?? 0;
      const panelW = panelRef.current?.offsetWidth ?? panelWidth;
      const maxTop = Math.max(0, window.innerHeight - panelH);
      const maxLeft = Math.max(0, window.innerWidth - panelW);
      // 화면 오른쪽 끝 너머로 끌어내면 분리(별도 창)로 인식
      detachPending = ev.clientX >= window.innerWidth - 2;
      setPanelTop(Math.max(0, Math.min(maxTop, dragStartTop.current + dy)));
      setPanelLeft(Math.max(0, Math.min(maxLeft, dragStartLeft.current + dx)));
    };
    const onUp = () => {
      isDraggingV.current = false;
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (detachPending) {
        const url = `${window.location.origin}${process.env.PUBLIC_URL}/?chat=open`;
        window.open(url, "lcpChatWindow", `width=${panelWidth},height=${panelHeight},resizable=yes`);
        setOpen(false);
        setPanelLeft(null);
        setPanelTop(0);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [panelTop, panelLeft, panelWidth, panelHeight]);

  // ── 패널 크기 조절 (모든 가장자리/모서리) ──────────────────────
  const startResize = useCallback((e, dir) => {
    e.stopPropagation();
    isResizing.current = true;
    const rect = panelRef.current.getBoundingClientRect();
    resizeStart.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height, left: rect.left, top: rect.top };
    if (panelLeft == null) setPanelLeft(rect.left);
    document.body.style.userSelect = "none";
    const onMove = (ev) => {
      if (!isResizing.current) return;
      const dx = ev.clientX - resizeStart.current.x;
      const dy = ev.clientY - resizeStart.current.y;
      let { w, h, left, top } = resizeStart.current;
      if (dir.includes("e")) w = Math.max(260, Math.min(800, w + dx));
      if (dir.includes("w")) {
        const newW = Math.max(260, Math.min(800, w - dx));
        left += w - newW;
        w = newW;
      }
      if (dir.includes("s")) h = Math.max(300, Math.min(window.innerHeight, h + dy));
      if (dir.includes("n")) {
        const newH = Math.max(300, Math.min(window.innerHeight, h - dy));
        top += h - newH;
        h = newH;
      }
      setPanelWidth(w);
      setPanelHeight(h);
      if (dir.includes("w")) setPanelLeft(left);
      if (dir.includes("n")) setPanelTop(top);
    };
    const onUp = () => {
      isResizing.current = false;
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [panelLeft]);

  // ── 다음 플랜 번호 계산 ────────────────────────────────────────
  const getNextPlanNumber = useCallback(() => {
    if (!myName) return 1;
    const raw = parseInt(localStorage.getItem("lcpMaxPlan") ?? "0", 10);
    const localMax = Number.isFinite(raw) ? raw : 0;

    // CSV 파일 전체 기준 (신뢰할 수 있는 출처) — 채팅창 표시 상태와 무관
    const csvNums = getMyPlanNumbersFromCSV(myName);
    let nums;
    if (csvNums.size > 0) {
      nums = csvNums;
      saveKnownPlanNumbers(myName, nums); // 다음에 캐시가 비었을 때를 위해 보존
    } else {
      // CSV 캐시가 일시적으로 비어있으면 마지막으로 보존해둔 번호 집합 사용
      nums = getKnownPlanNumbers(myName);
    }

    const numsMax = nums.size ? Math.max(...nums) : 0;
    const overallMax = Math.max(numsMax, localMax);
    // 삭제로 비워진 번호가 있으면 그 번호부터 채움
    for (let i = 1; i <= overallMax; i++) {
      if (!nums.has(i)) return i;
    }
    return overallMax + 1;
  }, [myName]);

  // ── 메시지 전송 ────────────────────────────────────────────────
  const handleSend = async () => {
    if (sendingRef.current) return;
    const content = input.trim();
    if (!content || sending || !currentUser || !myName) return;
    sendingRef.current = true;
    setSending(true);
    setInput("");
    try {
      const planNumber = getNextPlanNumber();
      localStorage.setItem("lcpMaxPlan", String(planNumber));
      const known = getKnownPlanNumbers(myName);
      known.add(planNumber);
      saveKnownPlanNumbers(myName, known);
      const nowMs = Date.now();

      // Firebase RTDB에 저장
      const pushRef = push(ref(rtdb, "chatMessages"), {
        authorName: myName,
        planNumber,
        content,
        createdAt: nowMs,
      });

      // 즉시 로컬에 표시 (낙관적 업데이트)
      scrollAfterSendRef.current = true;
      setLocalMessages((prev) => [
        ...prev,
        { key: pushRef.key, authorName: myName, planNumber, content, createdAt: nowMs },
      ]);

      // CSV에도 기록 (fire-and-forget)
      localStorage.removeItem(CSV_CACHE_KEY);
      fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ type: "newPlan", authorName: myName, planNumber, content }),
      }).catch(() => {});

      // LivePlansContext에도 추가 (MyPage 등 동기화)
      appendPlan({
        id: pushRef.key, planNumber, content,
        authorName: myName, authorUid: currentUser.uid,
        status: "active",
        createdAt: { seconds: Math.floor(nowMs / 1000), nanoseconds: 0 },
        completedAt: null,
      });
    } finally {
      sendingRef.current = false;
      setSending(false);
      if (inputRef.current) inputRef.current.style.height = "auto";
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  // ── 채팅에서 바로 완료 처리 ────────────────────────────────────
  const handleCompletePlan = useCallback((msg) => {
    const planKey = `${msg.authorName}||${msg.planNumber}`;
    setLocalCompletedKeys((prev) => new Set(prev).add(planKey));

    const planId = `csv-${msg.authorName}-${msg.planNumber}`;
    const nowMs = Date.now();
    updatePlan(planId, {
      status: "done",
      completedAt: { seconds: Math.floor(nowMs / 1000), nanoseconds: 0 },
    });

    push(ref(rtdb, "chatMessages"), {
      type: "done",
      authorName: msg.authorName,
      planNumber: msg.planNumber,
      content: msg.content,
      createdAt: nowMs,
    });

    localStorage.removeItem(CSV_CACHE_KEY);
    fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ type: "complete", memberName: msg.authorName, planNumber: msg.planNumber }),
    }).catch(() => {});
  }, [updatePlan]);

  // ── 채팅에서 바로 삭제 처리 ────────────────────────────────────
  const handleDeletePlan = useCallback(async (msg) => {
    if (!window.confirm(`${msg.planNumber}번째 계획을 삭제할까요?`)) return;

    // 이 메시지 자체 삭제 (RTDB)
    if (msg.key && !msg.key.startsWith("csv-")) {
      remove(ref(rtdb, `chatMessages/${msg.key}`)).catch(() => {});
    }
    setLocalMessages((prev) => prev.filter((lm) => lm.key !== msg.key));

    // 같은 작성자/번호의 다른 메시지(완료 표시 등)도 정리
    try {
      const snap = await get(ref(rtdb, "chatMessages"));
      const removals = [];
      snap.forEach((child) => {
        const v = child.val();
        if (v.authorName === msg.authorName && Number(v.planNumber) === Number(msg.planNumber)) {
          removals.push(remove(child.ref));
        }
      });
      await Promise.all(removals);
    } catch (e) {
      console.error("handleDeletePlan cleanup failed", e);
    }

    // 목록/CSV 동기화
    upsertPlan({
      id: `csv-${msg.authorName}-${msg.planNumber}`,
      authorName: msg.authorName,
      planNumber: Number(msg.planNumber),
      content: msg.content,
      authorUid: null,
      status: "deleted",
      createdAt: { seconds: 0, nanoseconds: 0 },
      completedAt: null,
    });
    // 삭제된 번호를 재사용 가능하도록 보존된 번호 집합에서 제거
    if (msg.authorName === myName) {
      const known = getKnownPlanNumbers(myName);
      known.delete(Number(msg.planNumber));
      saveKnownPlanNumbers(myName, known);
    }

    localStorage.removeItem(CSV_CACHE_KEY);
    fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ type: "delete", memberName: msg.authorName, planNumber: msg.planNumber }),
    }).catch(() => {});
  }, [upsertPlan, myName]);

  const handleProfileClick = useCallback((authorName) => {
    setProfileName(authorName);
  }, []);

  const scrollToBottom = () => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
      setAtBottom(true);
    }
  };

  return (
    <>
      {profileName && (
        <MiniProfileCard name={profileName} onClose={() => setProfileName(null)} />
      )}
      <div
        ref={panelRef}
        className={`lcpPanel${open ? " lcpPanelOpen" : ""}${standalone ? " lcpPanelStandalone" : ""}`}
        style={standalone || isMobile ? undefined : {
          width: `${panelWidth}px`,
          height: `${panelHeight}px`,
          top: `${panelTop}px`,
          left: panelLeft != null ? `${panelLeft}px` : undefined,
          right: panelLeft != null ? "auto" : 0,
        }}
      >
        {!standalone && !isMobile && (
          <>
            <div className="lcpResize lcpResizeN" onMouseDown={(e) => startResize(e, "n")} />
            <div className="lcpResize lcpResizeS" onMouseDown={(e) => startResize(e, "s")} />
            <div className="lcpResize lcpResizeE" onMouseDown={(e) => startResize(e, "e")} />
            <div className="lcpResize lcpResizeW" onMouseDown={(e) => startResize(e, "w")} />
            <div className="lcpResize lcpResizeNE" onMouseDown={(e) => startResize(e, "ne")} />
            <div className="lcpResize lcpResizeNW" onMouseDown={(e) => startResize(e, "nw")} />
            <div className="lcpResize lcpResizeSE" onMouseDown={(e) => startResize(e, "se")} />
            <div className="lcpResize lcpResizeSW" onMouseDown={(e) => startResize(e, "sw")} />
          </>
        )}
        <div className="lcpHeader" onMouseDown={standalone || isMobile ? undefined : startDragV}>
          <span className="lcpHeaderTitle">💬 Live Plans</span>
          <div className="lcpHeaderActions" onMouseDown={(e) => e.stopPropagation()}>
            <button
              className={`lcpSearchToggle${showSearch ? " active" : ""}`}
              onClick={() => setShowSearch((v) => !v)}
              title="검색"
            >🔍</button>
            <button
              className={`lcpSearchToggle${editMode ? " active" : ""}`}
              onClick={() => setEditMode((v) => !v)}
              title="완료/삭제 표시"
            >✏️</button>
            {!standalone && !isMobile && (
              <button
                className="lcpSearchToggle"
                onClick={() => {
                  const url = `${window.location.origin}${process.env.PUBLIC_URL}/?chat=open`;
                  window.open(url, "lcpChatWindow", "width=360,height=640,resizable=yes");
                }}
                title="새 창으로 열기"
              >🗗</button>
            )}
            <button
              className="lcpCloseBtn"
              onMouseDown={(e) => {
                e.stopPropagation();
                if (standalone) window.close();
                else setOpen(false);
              }}
            >✕</button>
          </div>
        </div>

        {showSearch && (
          <div className="lcpSearchBar">
            <input
              ref={searchRef}
              className="lcpSearchInput"
              placeholder="이름, 계획 내용 검색…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="lcpSearchClear" onClick={() => setSearchQuery("")}>✕</button>
            )}
          </div>
        )}

        <div className="lcpFeed" ref={feedRef}>
          {filteredMessages.length === 0 ? (
            <div className="lcpEmpty">
              {searchQuery ? "검색 결과가 없어요." : "아직 등록된 계획이 없어요."}
            </div>
          ) : (() => {
            const items = [];
            let lastDateStr = null;
            let lastAuthor = null;
            filteredMessages.forEach((msg) => {
              const dateStr = new Date(msg.createdAt ?? 0).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", ".");
              if (dateStr !== lastDateStr) {
                items.push(
                  <div key={`date-${dateStr}`} className="lcpDateDivider">
                    <span>{dateStr}</span>
                  </div>
                );
                lastDateStr = dateStr;
                lastAuthor = null;
              }
              const planKey = `${msg.authorName}||${msg.planNumber}`;
              const isDone = msg.type === "done"
                || rtdbDoneKeySet.has(planKey)
                || localCompletedKeys.has(planKey)
                || csvPlans.find((p) => p.authorName === msg.authorName && p.planNumber === msg.planNumber)?.status === "done";
              const showHeader = msg.authorName !== lastAuthor;
              lastAuthor = msg.authorName;
              items.push(
                <ChatBubble
                  key={msg.key}
                  msg={msg}
                  isMe={msg.authorName === myName}
                  isDone={isDone}
                  showHeader={showHeader}
                  editMode={editMode}
                  onProfileClick={handleProfileClick}
                  onComplete={handleCompletePlan}
                  onDelete={handleDeletePlan}
                />
              );
            });
            return items;
          })()}
          {/* 스크롤 앵커 */}
          <div style={{ height: 1, flexShrink: 0 }} />
        </div>

        {!atBottom && (
          <button className="lcpScrollBottom" onClick={scrollToBottom} title="맨 아래로">
            ↓
          </button>
        )}

        {currentUser && myName && (
          <div className="lcpInputRow">
            <textarea
              ref={inputRef}
              className="lcpInput"
              placeholder="계획을 입력하세요…"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  if (e.nativeEvent.isComposing || isComposingRef.current || e.key === "Process") {
                    return;
                  }
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              disabled={sending}
            />
            <button
              className="lcpSendBtn"
              onClick={handleSend}
              disabled={sending || !input.trim()}
            >
              {sending ? "…" : "↑"}
            </button>
          </div>
        )}
      </div>
      {!standalone && !open && currentUser && (
        <button className="lcpFab" onClick={() => setOpen(true)} aria-label="Live Plans 채팅 열기">
          <span className="lcpFabIcon">💬</span>
          <span>Live</span>
        </button>
      )}
    </>
  );
}
