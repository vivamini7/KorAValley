import React, { useEffect, useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useRefreshMembers } from "../context/MembersContext";
import "./EditProfileModal.css";

export default function EditProfileModal({ member, onClose, onSaved }) {
  const refreshMembers = useRefreshMembers();
  const [role, setRole] = useState(member.role || "");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(member.avatarUrl || "");
  const [quote, setQuote] = useState(member.quote || "");
  const [bullets, setBullets] = useState((member.bullets || []).join("\n"));
  const [goals, setGoals] = useState((member.goals || []).join("\n"));
  const [linkedin, setLinkedin] = useState(member.links?.linkedin || "");
  const [email, setEmail] = useState(member.links?.email || "");
  const [customLinks, setCustomLinks] = useState(
    Array.isArray(member.links?.custom) && member.links.custom.length > 0
      ? member.links.custom.map((c) => ({ label: c.label || "", url: c.url || "" }))
      : [{ label: "", url: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const QUOTE_MAX_CHARS = 60;
  const BULLETS_MAX_LINES = 3;
  const BULLETS_MAX_CHARS_PER_LINE = 50;
  const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

  const compressToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 256;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = url;
    });

  useEffect(() => {
    if (!imageFile) return undefined;
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    setError("");
    if (!file) {
      setImageFile(null);
      setImagePreview(member.avatarUrl || "");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 선택할 수 있습니다.");
      e.target.value = "";
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setError("이미지는 5MB 이하만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }
    setImageFile(file);
  };

  const handleQuoteChange = (e) => {
    const val = e.target.value.replace("\n", "");
    if (val.length > QUOTE_MAX_CHARS) return;
    setQuote(val);
  };

  const handleBulletsChange = (e) => {
    const val = e.target.value;
    const lines = val.split("\n");
    if (lines.length > BULLETS_MAX_LINES) return;
    if (lines.some((line) => line.length > BULLETS_MAX_CHARS_PER_LINE)) return;
    setBullets(val);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const trimmedRole = role.trim();
      if (!trimmedRole) {
        setError("Role을 입력해주세요.");
        setSaving(false);
        return;
      }

      const customLinksArr = customLinks
        .map((c) => ({ label: c.label.trim(), url: c.url.trim() }))
        .filter((c) => c.label && c.url);

      const bulletsArr = bullets.split("\n").map((s) => s.trim()).filter(Boolean);
      const goalsArr = goals.split("\n").map((s) => s.trim()).filter(Boolean);
      let avatarUrl = member.avatarUrl || "";

      if (imageFile) {
        avatarUrl = await compressToBase64(imageFile);
      }

      await updateDoc(doc(db, "members", String(member.id)), {
        role: trimmedRole,
        roleLines: deleteField(),
        ...(avatarUrl ? { avatarUrl } : {}),
        quote,
        bullets: bulletsArr,
        goals: goalsArr,
        "links.linkedin": linkedin,
        "links.email": email,
        "links.custom": customLinksArr,
      });
      const updatedMember = {
        ...member,
        role: trimmedRole,
        quote,
        bullets: bulletsArr,
        goals: goalsArr,
        links: { ...member.links, linkedin, email, custom: customLinksArr },
      };
      delete updatedMember.roleLines;
      if (avatarUrl) updatedMember.avatarUrl = avatarUrl;
      onSaved(updatedMember);
      refreshMembers();
      onClose();
    } catch {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editOverlay" onClick={onClose}>
      <div className="editModal" onClick={(e) => e.stopPropagation()}>
        <button className="editClose" onClick={onClose} aria-label="닫기">✕</button>
        <h2 className="editTitle">{member.name} 프로필 수정</h2>

        <form onSubmit={handleSave} className="editForm">
          <label className="editLabel">
            프로필 이미지
            {imagePreview && (
              <img
                className="editImagePreview"
                src={imagePreview}
                alt={`${member.name} 프로필 미리보기`}
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="editFileInput"
            />
            <span className="editHint">이미지 파일 · 최대 5MB</span>
          </label>

          <label className="editLabel">
            Role
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="editInput"
              placeholder="Medical AI"
              maxLength={60}
              required
            />
          </label>

          <label className="editLabel">
            비전 / 한 마디
            <textarea
              value={quote}
              onChange={handleQuoteChange}
              rows={2}
              className="editInput"
              placeholder="나의 비전을 입력해주세요"
            />
            <span className="editHint">
              1줄 · 최대 {QUOTE_MAX_CHARS}자 ({quote.length}/{QUOTE_MAX_CHARS})
            </span>
          </label>

          <label className="editLabel">
            소개 (한 줄씩 입력)
            <textarea
              value={bullets}
              onChange={handleBulletsChange}
              rows={4}
              className="editInput"
              placeholder={"백엔드 개발\n독서\n투자"}
            />
            <span className="editHint">
              최대 {BULLETS_MAX_LINES}줄 · 줄당 {BULLETS_MAX_CHARS_PER_LINE}자 이내
            </span>
          </label>

          <label className="editLabel">
            목표 (한 줄씩 입력)
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={6}
              className="editInput"
              placeholder={"목표 1\n목표 2\n목표 3"}
            />
          </label>

          <label className="editLabel">
            LinkedIn URL
            <input
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              className="editInput"
              placeholder="https://linkedin.com/in/..."
            />
          </label>

          <label className="editLabel">
            이메일
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="editInput"
              placeholder="your@email.com"
            />
          </label>

          <label className="editLabel">
            기타 링크 (포트폴리오, 블로그 등)
            {customLinks.map((c, i) => (
              <div className="editCustomLinkRow" key={i}>
                <input
                  type="text"
                  value={c.label}
                  onChange={(e) => {
                    const next = [...customLinks];
                    next[i] = { ...next[i], label: e.target.value };
                    setCustomLinks(next);
                  }}
                  className="editInput editCustomLinkLabel"
                  placeholder="이름 (예: 블로그)"
                  maxLength={20}
                />
                <input
                  type="url"
                  value={c.url}
                  onChange={(e) => {
                    const next = [...customLinks];
                    next[i] = { ...next[i], url: e.target.value };
                    setCustomLinks(next);
                  }}
                  className="editInput editCustomLinkUrl"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  className="editCustomLinkRemove"
                  onClick={() => setCustomLinks(customLinks.filter((_, idx) => idx !== i))}
                  aria-label="링크 삭제"
                >✕</button>
              </div>
            ))}
            <button
              type="button"
              className="editCustomLinkAdd"
              onClick={() => setCustomLinks([...customLinks, { label: "", url: "" }])}
            >+ 링크 추가</button>
          </label>

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
