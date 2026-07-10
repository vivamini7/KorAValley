import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const ADMIN_UIDS = ["jwxmTNjk75Ra7GhejIeX2C9bTMS2"];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [memberId, setMemberId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canEditNetworking, setCanEditNetworking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const baseAdmin = ADMIN_UIDS.includes(user.uid);
        setIsAdmin(baseAdmin);
        setCanEditNetworking(baseAdmin);

        // 매 로그인마다 Firestore에서 최신 권한/memberId 조회
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setMemberId(data.memberId ?? null);
            if (data.isAdmin) {
              setIsAdmin(true);
              setCanEditNetworking(true);
            }
          } else {
            setMemberId(null);
          }
        } catch {
          setMemberId(null);
        }
      } else {
        setMemberId(null);
        setIsAdmin(false);
        setCanEditNetworking(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const logout = () => {
    if (currentUser) {
      try { localStorage.removeItem(`kv_profile_${currentUser.uid}`); } catch {}
    }
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, memberId, isAdmin, canEditNetworking, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
