import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { isSupported, getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDx3T5ZQvwX4r-FR7U_GYP1yN6P5RN6j14",
  authDomain: "kora-valley.firebaseapp.com",
  projectId: "kora-valley",
  storageBucket: "kora-valley.firebasestorage.app",
  messagingSenderId: "421492258308",
  appId: "1:421492258308:web:2605dec18ffbf8cac36751",
  measurementId: "G-G8X7PG9T4E",
  databaseURL: "https://kora-valley-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// 사파리 등 미지원 환경에서 getMessaging()이 던지는 에러를 막기 위해 isSupported로 가드
export const getMessagingIfSupported = () =>
  isSupported().then((ok) => (ok ? getMessaging(app) : null));
