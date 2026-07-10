import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import Navbar from "../components/Navbar";
import { CHANGELOG } from "../data/changelog";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import "./NoticePage.css";

function fmtDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}


export default function NoticePage() {
  const { currentUser, canEditNetworking: canEdit } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, "notices"));
        const data = snap.docs.map((d) => ({ ...d.data(), _id: d.id }));
        data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setPosts(data);
      } catch {
        setPosts([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    try {
      if (editingId) {
        const updates = { title: title.trim(), content: content.trim() };
        await updateDoc(doc(db, "notices", editingId), updates);
        setPosts((prev) => prev.map((p) => p._id === editingId ? { ...p, ...updates } : p));
      } else {
        const data = {
          title: title.trim(),
          content: content.trim(),
          authorName: currentUser?.displayName || currentUser?.email || "익명",
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, "notices"), data);
        setPosts((prev) => [{ ...data, createdAt: { seconds: Date.now() / 1000 }, _id: docRef.id }, ...prev]);
      }
      setTitle("");
      setContent("");
      setEditingId(null);
      setWriting(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p) => {
    setEditingId(p._id);
    setTitle(p.title);
    setContent(p.content);
    setWriting(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("이 공지를 삭제할까요?")) return;
    await deleteDoc(doc(db, "notices", id));
    setPosts((prev) => prev.filter((p) => p._id !== id));
  };

  return (
    <div className="noticePage">
      <Navbar />
      <main className="noticeWrap">
        <div className="noticeHeaderRow">
          <h1 className="noticeTitle">공지사항</h1>
          {canEdit && !writing && (
            <button className="noticeWriteBtn" onClick={() => setWriting(true)}>
              + 글쓰기
            </button>
          )}
        </div>

        {writing && (
          <div className="noticeWriteForm">
            <input
              className="noticeWriteTitle"
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="noticeWriteContent"
              placeholder="내용을 입력하세요"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="noticeWriteActions">
              <button className="noticeWriteCancelBtn" onClick={() => { setWriting(false); setTitle(""); setContent(""); setEditingId(null); }}>
                취소
              </button>
              <button className="noticeWriteSubmitBtn" onClick={handleSubmit} disabled={saving || !title.trim() || !content.trim()}>
                {saving ? "저장 중…" : editingId ? "수정 완료" : "등록"}
              </button>
            </div>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <section className="noticeSection">
            {posts.map((p) => (
              <div className="noticeRelease" key={p._id}>
                <div className="noticePostHeader">
                  <div>
                    <div className="noticePostTitle">{p.title}</div>
                    <div className="noticeReleaseDate">
                      {fmtDate(p.createdAt)}{p.authorName ? ` · ${p.authorName}` : ""}
                    </div>
                  </div>
                  {canEdit && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="noticePostDeleteBtn" onClick={() => handleEdit(p)}>수정</button>
                      <button className="noticePostDeleteBtn" onClick={() => handleDelete(p._id)}>삭제</button>
                    </div>
                  )}
                </div>
                <p className="noticePostContent">{p.content}</p>
              </div>
            ))}
          </section>
        )}

        <section className="noticeSection">
          {CHANGELOG.map((release) => (
            <div className="noticeRelease" key={release.version}>
              <div className="noticeReleaseDate">{release.date}</div>
              <ul className="noticeList">
                {release.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
