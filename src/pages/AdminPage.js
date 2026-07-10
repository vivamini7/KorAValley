import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import staticMembers from "../data/members.json";
import "./AdminPage.css";

const CSV_URL = "https://docs.google.com/spreadsheets/d/1yAeYVbqyFwePzjjdU0ile_OAmZ-cR8iwu_95KPVsx7o/export?format=csv&gid=0";

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

// "YYYY.MM.DD" 또는 "YYYY.MM.DD HH:MM" 문자열을 Date로 변환 (KST 기준)
function parseKstDate(str) {
  if (!str) return null;
  const [datePart] = str.trim().split(" ");
  const [y, m, d] = datePart.split(".").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d) - 9 * 60 * 60 * 1000);
}

// 해당 날짜가 속한 주(월요일 시작)의 "M.D~M.D" 라벨과 정렬용 키를 반환
function weekInfo(date) {
  const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const dow = kst.getUTCDay(); // 0=일 ~ 6=토
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(kstMs + diffToMonday * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const fmt = (d) => `${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
  const key = monday.toISOString().slice(0, 10);
  return { key, label: `${fmt(monday)} ~ ${fmt(sunday)}` };
}

function WeeklyStatsSection() {
  const [weekLabel, setWeekLabel] = useState("");
  const [totals, setTotals] = useState([]); // [{ name, reg, done }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(CSV_URL);
        const text = await res.text();
        if (text.trim().startsWith("<")) throw new Error("CSV 로드 실패");
        const rows = parseCSV(text);

        // 지난주(저번 월~일)만 집계 대상으로 삼는다
        const thisWeekMonday = weekInfo(new Date()).key;
        const lastWeekMonday = new Date(new Date(thisWeekMonday).getTime() - 7 * 86400000)
          .toISOString().slice(0, 10);

        const byName = new Map(); // name -> { reg: Set(planNumber), done: Set(planNumber) }
        let label = "";
        rows.forEach((r) => {
          const date = parseKstDate(r["생성일"]);
          if (!date) return;
          const info = weekInfo(date);
          if (info.key !== lastWeekMonday) return;
          label = info.label;
          const name = r["이름"];
          if (!byName.has(name)) byName.set(name, { reg: new Set(), done: new Set() });
          const bucket = byName.get(name);
          bucket.reg.add(r["계획번호"]);
          if (r["상태"] === "완료") bucket.done.add(r["계획번호"]);
        });

        const result = [...byName.entries()]
          .map(([name, v]) => ({ name, reg: v.reg.size, done: v.done.size }))
          .sort((a, b) => b.reg - a.reg);
        setWeekLabel(label);
        setTotals(result);
      } catch (e) {
        setError(e.message || "불러오기 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="adminSection">
      <div className="adminSectionHeader">
        <h2 className="adminSectionTitle">지난주 등록/완료 현황{weekLabel ? ` (${weekLabel})` : ""}</h2>
      </div>
      {loading ? (
        <p className="adminEmpty">불러오는 중...</p>
      ) : error ? (
        <p className="adminEmpty">{error}</p>
      ) : totals.length === 0 ? (
        <p className="adminEmpty">지난주에 등록된 계획이 없습니다.</p>
      ) : (
        <div className="adminCard">
          {totals.map(({ name, reg, done }) => (
            <div key={name} className="adminApprovedRow" style={{ padding: "4px 0" }}>
              <span className="adminApprovedName">{name}</span>
              <span>등록 {reg}개 / 완료 {done}개</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AdminPage() {
  const { currentUser, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!currentUser || !isAdmin)) navigate("/");
  }, [loading, currentUser, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    async function load() {
      // members 목록
      const memberSnap = await getDocs(collection(db, "members"));
      const memberList = memberSnap.empty
        ? staticMembers
        : memberSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
      memberList.sort((a, b) => Number(a.id) - Number(b.id));
      setMembers(memberList);

      // users 목록
      const userSnap = await getDocs(collection(db, "users"));
      const userList = userSnap.docs.map((d) => {
        const data = { uid: d.id, ...d.data() };
        // 이메일 자동 매칭
        if (data.memberId == null) {
          const matched = memberList.find(
            (m) => (m.links?.email || "").toLowerCase() === (data.email || "").toLowerCase()
          );
          data._suggested = matched ? matched.id : null;
          data._suggestedName = matched ? matched.name : null;
        }
        return data;
      });
      setUsers(userList);
      setFetching(false);
    }
    load();
  }, [isAdmin]);

  const toggleAdmin = async (uid, current) => {
    setSaving(uid + "_admin");
    await updateDoc(doc(db, "users", uid), { isAdmin: !current });
    setUsers((prev) =>
      prev.map((u) => u.uid === uid ? { ...u, isAdmin: !current } : u)
    );
    setSaving(null);
  };

  const approve = async (uid, memberId) => {
    if (!memberId && memberId !== 0) return;
    setSaving(uid);
    await updateDoc(doc(db, "users", uid), { memberId: Number(memberId) });
    setUsers((prev) =>
      prev.map((u) => u.uid === uid ? { ...u, memberId: Number(memberId) } : u)
    );
    setSaving(null);
  };

  const revoke = async (uid) => {
    setSaving(uid + "_revoke");
    await updateDoc(doc(db, "users", uid), { memberId: null });
    setUsers((prev) =>
      prev.map((u) => u.uid === uid ? { ...u, memberId: null, _suggested: u.memberId, _suggestedName: members.find(m => String(m.id) === String(u.memberId))?.name ?? null } : u)
    );
    setSaving(null);
  };

  const expel = async (uid, memberId) => {
    const member = members.find((m) => String(m.id) === String(memberId));
    const name = member?.name ?? "알 수 없음";
    if (!window.confirm(`${name}님을 내보내겠습니까?\n- Members/Plans에서 데이터가 모두 삭제됩니다.\n- 가입(승인)이 철회됩니다.\n이 작업은 되돌릴 수 없습니다.`)) return;

    setSaving(uid + "_expel");
    try {
      // 1. 해당 멤버의 livePlans 전부 삭제
      if (member?.name) {
        const planSnap = await getDocs(query(collection(db, "livePlans"), where("authorName", "==", member.name)));
        await Promise.all(planSnap.docs.map((d) => deleteDoc(doc(db, "livePlans", d.id))));
      }

      // 2. members 컬렉션에서 삭제 (Firestore에 저장된 경우)
      if (memberId != null) {
        try { await deleteDoc(doc(db, "members", String(memberId))); } catch {}
      }

      // 3. users 문서 삭제 (가입/승인 철회)
      await deleteDoc(doc(db, "users", uid));

      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      setMembers((prev) => prev.filter((m) => String(m.id) !== String(memberId)));
    } finally {
      setSaving(null);
    }
  };

  if (loading || fetching) {
    return <div style={{ color: "#fff", padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  const pending = users.filter((u) => u.memberId == null);
  const approved = users.filter((u) => u.memberId != null);

  return (
    <div className="adminPage">
      <Navbar />
      <main className="adminWrap">
        <h1 className="adminTitle">멤버 권한 관리</h1>

        {/* 승인 대기 */}
        <section className="adminSection">
          <div className="adminSectionHeader">
            <h2 className="adminSectionTitle">승인 대기</h2>
            <span className="adminBadge">{pending.length}</span>
          </div>

          {pending.length === 0 ? (
            <p className="adminEmpty">대기 중인 가입 요청이 없습니다.</p>
          ) : (
            <div className="adminCards">
              {pending.map((u) => (
                <PendingCard
                  key={u.uid}
                  u={u}
                  members={members}
                  saving={saving}
                  onApprove={approve}
                />
              ))}
            </div>
          )}
        </section>

        {/* 승인 완료 */}
        <section className="adminSection">
          <div className="adminSectionHeader">
            <h2 className="adminSectionTitle">승인 완료</h2>
            <span className="adminBadge adminBadgeGreen">{approved.length}</span>
          </div>

          {approved.length === 0 ? (
            <p className="adminEmpty">승인된 멤버가 없습니다.</p>
          ) : (
            <div className="adminApprovedList">
              {approved.map((u) => {
                const member = members.find((m) => String(m.id) === String(u.memberId));
                return (
                  <div key={u.uid} className="adminApprovedRow">
                    <div className="adminApprovedInfo">
                      <span className="adminApprovedName">{member?.name ?? "알 수 없음"}</span>
                      <span className="adminApprovedEmail">{u.email}</span>
                    </div>
                    <div className="adminApprovedActions">
                      <button
                        className={`adminNetworkingBtn${u.isAdmin ? " active" : ""}`}
                        onClick={() => toggleAdmin(u.uid, !!u.isAdmin)}
                        disabled={saving === u.uid + "_admin"}
                        title="Admin 권한 (네트워킹/공지 편집 + Admin 페이지 접근)"
                      >
                        {saving === u.uid + "_admin" ? "..." : u.isAdmin ? "Admin ✓" : "Admin"}
                      </button>
                      <button
                        className="adminRevokeBtn"
                        onClick={() => revoke(u.uid)}
                        disabled={saving === u.uid + "_revoke"}
                      >
                        {saving === u.uid + "_revoke" ? "처리 중..." : "승인 취소"}
                      </button>
                      <button
                        className="adminRevokeBtn"
                        style={{ background: "#c0392b", borderColor: "#c0392b", color: "#fff" }}
                        onClick={() => expel(u.uid, u.memberId)}
                        disabled={saving === u.uid + "_expel"}
                      >
                        {saving === u.uid + "_expel" ? "처리 중..." : "퇴출"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <WeeklyStatsSection />
      </main>
    </div>
  );
}

function PendingCard({ u, members, saving, onApprove }) {
  const [selectedId, setSelectedId] = useState(u._suggested ?? "");

  const selectedMember = members.find((m) => String(m.id) === String(selectedId));

  return (
    <div className="adminCard">
      <div className="adminCardEmail">{u.email}</div>
      <div className="adminCardDate">가입일: {u.createdAt?.slice(0, 10) ?? "-"}</div>

      {u._suggestedName && (
        <div className="adminCardSuggested">
          이메일 자동 매칭: <strong>{u._suggestedName}</strong>
        </div>
      )}

      <div className="adminCardRow">
        <select
          className="adminSelect"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— 멤버 선택 —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.role})
            </option>
          ))}
        </select>

        <button
          className="adminApproveBtn"
          disabled={!selectedId || saving === u.uid}
          onClick={() => onApprove(u.uid, selectedId)}
        >
          {saving === u.uid ? "처리 중..." : "✓ 승인"}
        </button>
      </div>

      {selectedMember && (
        <div className="adminCardPreview">
          {selectedMember.name} · {selectedMember.role}
        </div>
      )}
    </div>
  );
}
