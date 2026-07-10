import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import staticMembers from "../data/members.json";
import { avatarMap, defaultAvatar, nameToAvatarKey } from "../utils/avatarMap";

const CACHE_KEY = "kvMembersCache_v1";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

const MembersContext = createContext(null);
const RefreshContext = createContext(null);

function buildMapFromStatic() {
  const map = {};
  staticMembers.forEach((m) => { map[m.name] = m; });
  return map;
}

async function fetchMembersMap() {
  try {
    const snap = await getDocs(collection(db, "members"));
    const map = {};
    if (snap.empty) {
      return buildMapFromStatic();
    }
    const fsMap = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      const id = data.id ?? d.id;
      fsMap[String(id)] = { ...data, id };
    });
    staticMembers.forEach((m) => {
      const merged = fsMap[String(m.id)] ?? m;
      map[merged.name] = merged;
    });
    return map;
  } catch {
    return buildMapFromStatic();
  }
}

export function MembersProvider({ children }) {
  const [membersMap, setMembersMap] = useState(buildMapFromStatic);

  const refresh = useCallback(async (force = false) => {
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
          setMembersMap(cached.data);
          return;
        }
      } catch {}
    }
    const map = await fetchMembersMap();
    setMembersMap(map);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: map }));
    } catch {}
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <RefreshContext.Provider value={() => refresh(true)}>
      <MembersContext.Provider value={membersMap}>
        {children}
      </MembersContext.Provider>
    </RefreshContext.Provider>
  );
}

export function useMembersMap() {
  return useContext(MembersContext) ?? {};
}

export function useRefreshMembers() {
  return useContext(RefreshContext) ?? (() => {});
}

export function useAvatarByName(name) {
  const map = useMembersMap();
  if (!name) return defaultAvatar;
  const member = map[name];
  if (member?.avatarUrl) return member.avatarUrl;
  const key = nameToAvatarKey[name];
  return (key && avatarMap[key]) || defaultAvatar;
}
