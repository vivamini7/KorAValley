/**
 * Firestore 초기화 스크립트
 *
 * 사용법:
 *   1. firebase.js의 config 값을 먼저 채우세요
 *   2. node scripts/seedFirestore.js
 *
 * members 컬렉션: 문서 ID = 멤버 id (숫자를 문자열로)
 * users 컬렉션:   문서 ID = Firebase Auth UID
 *                  { memberId: 1, isAdmin: false }
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const members = require("../src/data/members.json");

const firebaseConfig = {
  apiKey: "AIzaSyDx3T5ZQvwX4r-FR7U_GYP1yN6P5RN6j14",
  authDomain: "kora-valley.firebaseapp.com",
  projectId: "kora-valley",
  storageBucket: "kora-valley.firebasestorage.app",
  messagingSenderId: "421492258308",
  appId: "1:421492258308:web:2605dec18ffbf8cac36751",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log(`멤버 ${members.length}명 업로드 시작...`);
  for (const m of members) {
    await setDoc(doc(db, "members", String(m.id)), m);
    console.log(`  ✓ ${m.name} (id: ${m.id})`);
  }
  console.log("완료!");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
