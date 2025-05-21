// public/firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDvDgOKdmeJ0tUmy8wpU-Bt09AKqBt4r9s",
  authDomain: "politalk-4e0dd.firebaseapp.com",
  projectId: "politalk-4e0dd",
  messagingSenderId: "656791746532",
  appId: "1:656791746532:web:0f4435e1badcae30ae79f1",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("📩 [FCM] 백그라운드 메시지 수신:", payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png", // 필요 시 사이트 로고 파일로 변경 가능
  });
});
