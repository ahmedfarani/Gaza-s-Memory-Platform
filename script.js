"use strict";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBrgF29WN56mMRwHWV7Ysu8jjTw3HFALSc",
  authDomain: "gaza-memory.firebaseapp.com",
  projectId: "gaza-memory",
  storageBucket: "gaza-memory.firebasestorage.app",
  messagingSenderId: "878729698725",
  appId: "1:878729698725:web:5a8bfeedecf919f14e1c4c",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const MAX_CHARS = 3000;

// ================================================================
// 🔧 API CONFIG — صاحبي: غيّر هذا الـ URL لما تبني الباك اند
// ================================================================
let stories = [];
let activeFilter = "all";
let searchQuery = "";

const storiesGrid = document.getElementById("storiesGrid");
const emptyState = document.getElementById("emptyState");
const storyCount = document.getElementById("storyCount");
const storyForm = document.getElementById("storyForm");
const searchInput = document.getElementById("searchInput");
const charCount = document.getElementById("charCount");
const storyContent = document.getElementById("storyContent");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");
const submitBtn = document.getElementById("submitBtn");

// ================================================================
// 📡 API FUNCTIONS
// صاحبي: هون كل الـ API calls — كل function واضح شو تتوقع ترجعه
// ================================================================

/**
 * GET /api/stories
 * المتوقع من الباك اند يرجع: Array of story objects
 * مثال: [{ id, title, content, author, location, date, tag, createdAt }, ...]
 */
async function apiFetchStories() {
  // بنجيب كل القصص بدون ما نطلب من الفايربيس يرتبهم عشان ما يضرب
  const snapshot = await db.collection("stories").get();

  const fetchedStories = [];
  snapshot.forEach((doc) => {
    fetchedStories.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  return fetchedStories;
}

/**
 * POST /api/stories
 * المتوقع يرسل: story object بدون id (الباك اند يعطيه id)
 * المتوقع من الباك اند يرجع: نفس الـ story مع id
 * مثال: { id: "123", title: "...", content: "...", ... }
 */
async function apiCreateStory(storyData) {
  const docRef = await db.collection("stories").add(storyData);
  return {
    id: docRef.id,
    ...storyData,
  };
}

async function init() {
  try {
    stories = await apiFetchStories();
  } catch (err) {
    console.warn("API غير متاح، يستخدم البيانات المحلية:", err.message);
    stories = [];
  }

  updateCount();
  renderStories();
  bindEvents();
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

  filtered.forEach((story, i) => {
    const card = buildCard(story, i);
    storiesGrid.appendChild(card);
  });
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
    </div>
  `;

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

  document.getElementById(
    "modalTag"
  ).innerHTML = `<span class="story-card__tag tag--${story.tag}">${story.tag}</span>`;
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
        `${story.title}\n\n${story.content}\n\n— ${story.author || "مجهول"}, ${
          story.location || "غزة"
        }`
      )
      .then(() => showToast("تم نسخ القصة ✓", true));
  };
}

function closeModal() {
  modalOverlay.classList.remove("active");
  document.body.style.overflow = "";
}

async function handleSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  // ================================================================
  // 📦 البيانات اللي بتنبعت للباك اند
  // صاحبي: هذا الـ object هو اللي بوصلك في req.body
  // ================================================================
  const storyData = {
    title: document.getElementById("storyTitle").value.trim(),
    content: storyContent.value.trim(),
    author: document.getElementById("authorName").value.trim(),
    location: document.getElementById("storyLocation").value.trim(),
    date: document.getElementById("storyDate").value,
    tag: document.getElementById("storyTag").value,
    createdAt: Date.now(),
  };

  submitBtn.disabled = true;
  submitBtn.querySelector(".btn__text").style.display = "none";
  submitBtn.querySelector(".btn__loader").style.display = "inline";

  try {
    // ← هون بتنبعت للـ API
    const savedStory = await apiCreateStory(storyData);

    // أضف القصة اللي رجعت من الـ API (فيها id من الباك اند)
    stories.unshift(savedStory);
    updateCount();

    storyForm.reset();
    charCount.textContent = "0";
    clearErrors();

    activeFilter = "all";
    searchQuery = "";
    searchInput.value = "";
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("filter-btn--active"));
    document
      .querySelector('[data-filter="all"]')
      .classList.add("filter-btn--active");

    renderStories();
    showToast("تم نشر قصتك بنجاح! شكراً لمشاركتك ✓");
    document.getElementById("stories").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    console.warn("حُفظت محلياً بسبب:", err.message);
    showToast("عذراً، حدث خطأ أثناء النشر. تأكد من اتصالك بالإنترنت", true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector(".btn__text").style.display = "inline";
    submitBtn.querySelector(".btn__loader").style.display = "none";
  }
}

function validateForm() {
  clearErrors();
  let valid = true;

  const title = document.getElementById("storyTitle");
  const content = storyContent;
  const agree = document.getElementById("agreeCheck");

  if (!title.value.trim()) {
    showError("titleError", title);
    valid = false;
  }
  if (!content.value.trim()) {
    showError("contentError", content);
    valid = false;
  }
  if (!agree.checked) {
    showError("agreeError");
    valid = false;
  }
  return valid;
}

function showError(id, field) {
  document.getElementById(id).classList.add("visible");
  if (field) field.classList.add("error");
}

function clearErrors() {
  document
    .querySelectorAll(".form-error")
    .forEach((el) => el.classList.remove("visible"));
  document
    .querySelectorAll(".form-input, .form-textarea")
    .forEach((el) => el.classList.remove("error"));
}

let toastTimer;
function showToast(msg, info = false) {
  toastMsg.textContent = msg;
  toast.querySelector(".toast__icon").textContent = info ? "ℹ" : "✓";
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
  storyForm.addEventListener("submit", handleSubmit);

  storyContent.addEventListener("input", () => {
    const len = storyContent.value.length;
    charCount.textContent = len;
    if (len > MAX_CHARS)
      storyContent.value = storyContent.value.slice(0, MAX_CHARS);
  });

  let searchDebounce;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      renderStories();
    }, 250);
  });

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

  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  document.querySelectorAll(".form-input, .form-textarea").forEach((el) => {
    el.addEventListener("input", () => el.classList.remove("error"));
  });

  const sections = document.querySelectorAll("section[id]");
  window.addEventListener(
    "scroll",
    () => {
      sections.forEach((sec) => {
        const rect = sec.getBoundingClientRect();
        if (rect.top < 80 && rect.bottom > 80) {
          document.querySelectorAll(".nav__link").forEach((l) => {
            l.style.color =
              l.getAttribute("href") === `#${sec.id}` ? "var(--sand)" : "";
          });
        }
      });
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      const nav = document.querySelector(".nav");
      nav.style.boxShadow =
        window.scrollY > 10 ? "0 4px 24px rgba(0,0,0,0.5)" : "none";
    },
    { passive: true }
  );
}

document.addEventListener("DOMContentLoaded", init);
