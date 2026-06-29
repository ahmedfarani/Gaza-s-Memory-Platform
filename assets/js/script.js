"use strict";

// script.js — الصفحة الرئيسية (index.html)
// يعمل للزوار والمستخدمين المسجّلين (قراءة فقط)

const MAX_CHARS = 3000;

let stories = [];
let activeFilter = "all";
let searchQuery = "";

// DOM refs
const storiesGrid = document.getElementById("storiesGrid");
const emptyState = document.getElementById("emptyState");
const storyCount = document.getElementById("storyCount");
const searchInput = document.getElementById("searchInput");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");

// AUTH STATE — ضبط الـ NAV حسب حالة الدخول
auth.onAuthStateChanged(async (user) => {
  const guestEls = document.querySelectorAll(".nav__guest-only");
  const authEls = document.querySelectorAll(".nav__auth-only");

  if (user) {
    // مستخدم مسجّل
    guestEls.forEach((el) => (el.style.display = "none"));
    authEls.forEach((el) => (el.style.display = ""));

    // اسمه في الـ nav
    const nameEl = document.getElementById("navUserName");
    if (nameEl) {
      try {
        const doc = await db.collection("users").doc(user.uid).get();
        nameEl.textContent = doc.exists
          ? doc.data().name || user.email
          : user.email;
      } catch (_) {
        nameEl.textContent = user.email;
      }
    }

    // زر خروج
    const logoutBtn = document.getElementById("navLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await auth.signOut();
        window.location.reload();
      });
    }
  } else {
    // زائر
    guestEls.forEach((el) => (el.style.display = ""));
    authEls.forEach((el) => (el.style.display = "none"));
  }
});

// INIT
async function init() {
  try {
    stories = await apiFetchStories();
  } catch (err) {
    console.warn("تعذّر جلب القصص:", err.message);
    stories = [];
  }
  updateCount();
  renderStories();
  bindEvents();
}

// FIRESTORE FETCH
async function apiFetchStories() {
  const snapshot = await db.collection("stories").get();
  const result = [];
  snapshot.forEach((doc) => result.push({ id: doc.id, ...doc.data() }));
  return result;
}

function updateCount() {
  storyCount.textContent = stories.length;
}

function getFilteredStories() {
  return stories
    .filter((s) => {
      if (activeFilter !== "all" && s.tag !== activeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.content.toLowerCase().includes(q) ||
          (s.author || "").toLowerCase().includes(q) ||
          (s.location || "").toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function renderStories() {
  const filtered = getFilteredStories();
  storiesGrid.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";
  filtered.forEach((story, i) => storiesGrid.appendChild(buildCard(story, i)));
}

function buildCard(story, index) {
  const card = document.createElement("div");
  card.className = "story-card";
  card.style.animationDelay = `${index * 0.06}s`;

  const excerpt =
    story.content.length > 160
      ? story.content.slice(0, 160) + "…"
      : story.content;

  const author = story.author || "مجهول";
  const location = story.location || "غزة";
  const date = story.date
    ? new Date(story.date).toLocaleDateString("ar-PS", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  card.innerHTML = `
    <div class="story-card__tag tag--${story.tag}">${story.tag}</div>
    <h3 class="story-card__title">${escHtml(story.title)}</h3>
    <p class="story-card__excerpt">${escHtml(excerpt)}</p>
    <div class="story-card__footer">
      <div class="story-card__meta">
        <span class="story-card__author">${escHtml(author)}</span>
        <span class="story-card__loc">${escHtml(location)}</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="story-card__date">${date}</span>
        <span class="story-card__read">اقرأ القصة ←</span>
      </div>
    </div>`;

  card.addEventListener("click", () => openModal(story));
  return card;
}

function openModal(story) {
  const date = story.date
    ? new Date(story.date).toLocaleDateString("ar-PS", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "غير محدد";

  document.getElementById("modalTag").innerHTML =
    `<span class="story-card__tag tag--${story.tag}">${story.tag}</span>`;
  document.getElementById("modalTitle").textContent = story.title;
  document.getElementById("modalAuthor").textContent = story.author || "مجهول";
  document.getElementById("modalLocation").textContent =
    story.location || "غزة";
  document.getElementById("modalDate").textContent = date;
  document.getElementById("modalBody").textContent = story.content;

  modalOverlay.classList.add("active");
  document.body.style.overflow = "hidden";

  document.getElementById("modalCopyBtn").onclick = () => {
    navigator.clipboard
      .writeText(
        `${story.title}\n\n${story.content}\n\n— ${story.author || "مجهول"}, ${story.location || "غزة"}`,
      )
      .then(() => showToast("تم نسخ القصة ✓"));
  };
}

function closeModal() {
  modalOverlay.classList.remove("active");
  document.body.style.overflow = "";
}

let toastTimer;
function showToast(msg, isInfo = false) {
  toastMsg.textContent = msg;
  toast.querySelector(".toast__icon").textContent = isInfo ? "ℹ" : "✓";
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bindEvents() {
  // بحث
  let searchDebounce;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      renderStories();
    }, 250);
  });

  // فلاتر
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("filter-btn--active"));
      btn.classList.add("filter-btn--active");
      activeFilter = btn.dataset.filter;
      renderStories();
    });
  });

  // مودال
  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // nav shadow on scroll
  window.addEventListener(
    "scroll",
    () => {
      document.querySelector(".nav").style.boxShadow =
        window.scrollY > 10 ? "0 4px 24px rgba(0,0,0,0.5)" : "none";
    },
    { passive: true },
  );
}

document.addEventListener("DOMContentLoaded", init);
