// lib/firebase/clientApp.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// 💡 인증 관련 함수들을 추가로 import하고 export합니다.
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { getStorage } from "firebase/storage";

// [수정] 모든 환경 변수 이름 앞에 NEXT_PUBLIC_ 접두사를 추가합니다.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 앱 초기화 (이미 초기화되지 않았다면)
// 이 로직은 클라이언트 측에서만 실행되므로, getApps() 체크가 유효합니다.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// 💡 추가된 인증 함수들을 export합니다.
export { app, db, auth, storage, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut };
