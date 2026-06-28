// ================================================================
// firebase-config.js
// ملف الإعداد المشترك — يُحمَّل في كل صفحة قبل أي script آخر
// ================================================================

const firebaseConfig = {
  apiKey: "AIzaSyBrgF29WN56mMRwHWV7Ysu8jjTw3HFALSc",
  authDomain: "gaza-memory.firebaseapp.com",
  projectId: "gaza-memory",
  storageBucket: "gaza-memory.firebasestorage.app",
  messagingSenderId: "878729698725",
  appId: "1:878729698725:web:5a8bfeedecf919f14e1c4c",
};

// نتحقق إن Firebase ما تمت تهيئته مسبقاً (احترازاً)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// ================================================================
// HELPER — getRole
// يجلب دور المستخدم من Firestore (يُستخدم في أكثر من صفحة)
// ================================================================
async function getUserRole(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) return doc.data().role || "user";
  } catch (_) {}
  return "user";
}
