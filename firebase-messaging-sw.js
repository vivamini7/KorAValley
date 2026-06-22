/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDx3T5ZQvwX4r-FR7U_GYP1yN6P5RN6j14",
  authDomain: "kora-valley.firebaseapp.com",
  projectId: "kora-valley",
  storageBucket: "kora-valley.firebasestorage.app",
  messagingSenderId: "421492258308",
  appId: "1:421492258308:web:2605dec18ffbf8cac36751",
});

const messaging = firebase.messaging();

// 사이트가 닫혀 있거나 백그라운드일 때 푸시를 받아 알림으로 표시
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.data || {};
  self.registration.showNotification(title || "코라밸리", {
    body: body || "",
    icon: "/favicon-192-src.png",
    tag: "plan-summary",
  });
});
