// firebase-config.js
// ملف الإعداد المشترك — يُحمَّل في كل صفحة قبل أي script آخر

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

// HELPER — getRole
// يجلب دور المستخدم من Firestore (يُستخدم في أكثر من صفحة)
async function getUserRole(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) return doc.data().role || "user";
  } catch (_) {}
  return "user";
}

// ================================================================
// HELPER — initMobileNav
// يفعّل زر الهامبرغر + القائمة المنسدلة. مشترك بين كل الصفحات
// لازم يُستدعى بعد DOMContentLoaded في كل صفحة فيها nav بهذا الشكل
// إذا الصفحة ما فيها هامبرغر (id مش موجود) يخرج بهدوء بدون أخطاء
// ================================================================
function initMobileNav() {
  const hamburger = document.getElementById("navHamburger");
  const panel = document.getElementById("navMobilePanel");
  const backdrop = document.getElementById("navMobileBackdrop");

  if (!hamburger || !panel || !backdrop) return; // الصفحة ما فيها هامبرغر

  function openMenu() {
    hamburger.classList.add("nav__hamburger--active");
    hamburger.setAttribute("aria-expanded", "true");
    panel.classList.add("nav__mobile-panel--active");
    backdrop.classList.add("nav__mobile-backdrop--active");
    document.body.classList.add("nav-locked");
  }

  function closeMenu() {
    hamburger.classList.remove("nav__hamburger--active");
    hamburger.setAttribute("aria-expanded", "false");
    panel.classList.remove("nav__mobile-panel--active");
    backdrop.classList.remove("nav__mobile-backdrop--active");
    document.body.classList.remove("nav-locked");
  }

  hamburger.addEventListener("click", () => {
    const isOpen = panel.classList.contains("nav__mobile-panel--active");
    isOpen ? closeMenu() : openMenu();
  });

  backdrop.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // أي رابط جوّا القائمة (عدا زر الخروج اللي إله منطقه الخاص) يقفلها بعد الضغط
  panel.querySelectorAll("a.nav__mobile-link").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  // نخزّن closeMenu بشكل عام عشان زر الخروج بكل صفحة يقدر يستدعيها قبل التحويل
  initMobileNav._closeMenu = closeMenu;
}
