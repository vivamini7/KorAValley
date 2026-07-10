import React, { useState, useMemo } from "react";
import staticMembers from "../data/members.json";
import "./EditProfileModal.css";
import "./NetworkingEditModal.css";

const TYPE_OPTIONS = ["공식 네트워킹", "사적 네트워킹", "소모임", "카공&스터디"];
const MEMBER_NAMES = staticMembers.map((m) => m.name);

export default function NetworkingEditModal({ event, onClose, onSave }) {
  const [date, setDate] = useState(event?.date ?? "");
  const [type, setType] = useState(event?.type ?? "공식 네트워킹");
  const [content, setContent] = useState(event?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 참여자: Set으로 관리
  const [selected, setSelected] = useState(() => {
    const raw = event?.participants ?? "";
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  });
  const [manualInput, setManualInput] = useState("");

  const toggleMember = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  // 직접 입력 → 엔터/쉼표로 추가
  const handleManualKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const name = manualInput.trim().replace(/,$/, "");
      if (name) { setSelected((prev) => new Set([...prev, name])); }
      setManualInput("");
    }
  };

  const removeParticipant = (name) => {
    setSelected((prev) => { const next = new Set(prev); next.delete(name); return next; });
  };

  const participantsStr = useMemo(() => [...selected].join(", "), [selected]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!date || !content) { setError("날짜와 내용을 입력해주세요."); return; }
    setSaving(true);
    try {
      await onSave({ date, type, content, participants: participantsStr });
      onClose();
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editOverlay" onClick={onClose}>
      <div className="editModal netEditModal" onClick={(e) => e.stopPropagation()}>
        <button className="editClose" onClick={onClose}>✕</button>
        <h2 className="editTitle">{event ? "네트워킹 수정" : "네트워킹 추가"}</h2>

        <form onSubmit={handleSave} className="editForm">

          {/* 날짜 */}
          <label className="editLabel">
            날짜
            <div className="netDateWrap">
              <span className="netDateIcon">📅</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="editInput netDateInput"
                required
              />
            </div>
          </label>

          {/* 유형 */}
          <label className="editLabel">
            유형
            <div className="netTypeRow">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`netTypeBtn${type === t ? " active" : ""}`}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </label>

          {/* 내용 */}
          <label className="editLabel">
            내용
            <input type="text" value={content} onChange={(e) => setContent(e.target.value)} className="editInput" placeholder="네트워킹 내용" required />
          </label>

          {/* 참여자 */}
          <div className="editLabel">
            참여자
            <div className="netParticipantsArea">
              {/* 선택된 참여자 태그 */}
              {selected.size > 0 && (
                <div className="netSelectedChips">
                  {[...selected].map((name) => (
                    <span key={name} className="netSelectedChip">
                      {name}
                      <button type="button" onClick={() => removeParticipant(name)} className="netChipRemove">✕</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="netParticipantsColumns">
                {/* 직접 입력 */}
                <div className="netManualWrap">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={handleManualKeyDown}
                    className="editInput netManualInput"
                    placeholder="직접 입력 후 Enter"
                  />
                </div>

                {/* 멤버 버튼 목록 */}
                <div className="netMemberBtns">
                  {MEMBER_NAMES.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={`netMemberBtn${selected.has(name) ? " active" : ""}`}
                      onClick={() => toggleMember(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && <p className="editError">{error}</p>}

          <div className="editActions">
            <button type="button" className="editCancelBtn" onClick={onClose}>취소</button>
            <button type="submit" className="editSaveBtn" disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
