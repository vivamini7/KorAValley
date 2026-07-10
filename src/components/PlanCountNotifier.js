import { useEffect } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { db, getMessagingIfSupported } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { FCM_VAPID_KEY } from "../pushConfig";

// 사이트가 닫혀 있어도 매일 9/12/15/18/21/24시(KST)에 서버(Cloud Functions)가
// 계획 등록/완료 현황을 푸시 알림으로 보낸다. 이 컴포넌트는 그 알림을
// 받을 수 있도록 FCM 토큰을 발급받아 Firestore에 등록만 한다.
export default function PlanCountNotifier() {
  const { currentUser, memberId } = useAuth();

  useEffect(() => {
    if (!currentUser || memberId == null || typeof Notification === "undefined") return;
    // PC에서 토큰을 등록하면 휴대폰 토큰을 덮어써서 PC로 알림이 가버리므로,
    // 모바일 기기에서만 FCM 토큰을 등록한다.
    if (!/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

    let unsubscribeOnMessage = () => {};

    (async () => {
      try {
        if (Notification.permission === "default") {
          const result = await Notification.requestPermission();
          if (result !== "granted") return;
        }
        if (Notification.permission !== "granted") return;

        const messaging = await getMessagingIfSupported();
        if (!messaging) return;

        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        const token = await getToken(messaging, {
          vapidKey: FCM_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        if (!token) return;

        // 문서 ID를 uid로 고정해 재설치/재등록 시 이전 토큰을 덮어쓰도록 한다
        // (그렇지 않으면 기기당 토큰이 계속 쌓여 같은 기기에 알림이 중복 발송됨)
        await setDoc(doc(db, "fcmTokens", currentUser.uid), {
          token,
          uid: currentUser.uid,
          memberId,
          updatedAt: serverTimestamp(),
        });

        // 탭이 열려있는 동안 도착하는 푸시도 표시한다.
        // new Notification()이 아니라 SW와 동일한 registration.showNotification을 써야
        // 같은 tag로 SW 쪽 알림과 중복되지 않고 하나로 합쳐진다.
        unsubscribeOnMessage = onMessage(messaging, (payload) => {
          const { title, body } = payload.data || {};
          if (title) {
            registration.showNotification(title, { body, tag: "plan-summary" });
          }
        });
      } catch {
        // 알림 권한 거부, 미지원 브라우저 등은 조용히 무시
      }
    })();

    return () => unsubscribeOnMessage();
  }, [currentUser, memberId]);

  return null;
}
