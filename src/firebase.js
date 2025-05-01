// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyDvDgOKdmeJ0tUmy8wpU-Bt09AKqBt4r9s",
  authDomain: "politalk-4e0dd.firebaseapp.com",
  projectId: "politalk-4e0dd",
  storageBucket: "politalk-4e0dd.appspot.com", // ✅ 꼭 .**appspot.com** 으로 수정해야 작동합니다!
  messagingSenderId: "656791746532",
  appId: "1:656791746532:web:0f4435e1badcae30ae79f1",
  measurementId: "G-3T8YW3B3J5"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스 불러오기
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
