"use strict";
// لوحة تحكم المستخدم العادي

const MAX_CHARS = 3000;

let currentUser   = null;
let allStories    = [];
let myStories     = [];
let activeFilter  = "all";
let deleteStoryId = null;

// ── حماية الصفحة: إذا ما في مستخدم مسجّل → auth
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.replace("auth.html");
    return;
  }

  // تحقق من الدور — الأدمن يذهب للوحته
  const role = await getUserRole(user.uid);
  if (role === "admin") {
    window.location.replace("admin.html");
    return;
  }

  currentUser = user;
  await initDashboard();
});

// INIT
async function initDashboard() {
  // اسم المستخدم
  try {
    const doc = await db.collection("users").doc(currentUser.uid).get();
    const name = doc.exists ? (doc.data().name || currentUser.email) : currentUser.email;

    document.getElementById("navUserName").textContent      = name;
    document.getElementById("sidebarUserName").textContent  = name;
    document.getElementById("sidebarUserEmail").textContent = currentUser.email;

    const initial = name.charAt(0).toUpperCase();
    document.getElementById("dashAvatar").textContent = initial;
  } catch (_) {}

  // زر خروج
  document.getElementById("navLogoutBtn").addEventListener("click", async () => {
    await auth.signOut();
    window.location.replace("auth.html");
  });

  await Promise.all([loadAllStories(), loadMyStories()]);
  bindDashEvents();
}

// DATA LOADING
async function loadAllStories() {
  try {
    const snap = await db.collection("stories").get();
    allStories = [];
    snap.forEach(d => allStories.push({ id: d.id, ...d.data() }));
    allStories.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderBrowse();
  } catch (err) {
    console.error("خطأ في جلب القصص:", err);
  }
}

async function loadMyStories() {
  try {
    const snap = await db.collection("stories")
      .where("authorUid", "==", currentUser.uid)
      .get();
    myStories = [];
    snap.forEach(d => myStories.push({ id: d.id, ...d.data() }));
    myStories.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderMyStories();
  } catch (err) {
    console.error("خطأ في جلب قصصي:", err);
  }
}

// VIEWS
function showView(view) {
  // إخفاء/إظهار الـ views
  ["browse","mystories","write"].forEach(v => {
    const el = document.getElementById("view" + v.charAt(0).toUpperCase() + v.slice(1));
    if (el) el.style.display = v === view ? "" : "none";
  });

  // السايدبار — desktop
  const sidebarItems = document.querySelectorAll(".dash-nav__item");
  const viewOrder = ["browse","mystories","write"];
  sidebarItems.forEach((btn, i) => {
    btn.classList.toggle("dash-nav__item--active", viewOrder[i] === view);
  });

  // Bottom nav — mobile
  const mbnMap = { browse: "mbn-browse", mystories: "mbn-mystories", write: "mbn-write" };
  Object.entries(mbnMap).forEach(([v, id]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("mobile-bottom-nav__item--active", v === view);
  });
}

// BROWSE
function renderBrowse() {
  const searchVal = (document.getElementById("dashSearch")?.value || "").trim().toLowerCase();

  const filtered = allStories.filter(s => {
    if (activeFilter !== "all" && s.tag !== activeFilter) return false;
    if (searchVal) {
      return (
        s.title.toLowerCase().includes(searchVal) ||
        s.content.toLowerCase().includes(searchVal) ||
        (s.author   || "").toLowerCase().includes(searchVal) ||
        (s.location || "").toLowerCase().includes(searchVal)
      );
    }
    return true;
  });

  const grid  = document.getElementById("dashStoriesGrid");
  const empty = document.getElementById("dashEmptyBrowse");
  grid.innerHTML = "";

  if (filtered.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  filtered.forEach((s, i) => grid.appendChild(buildBrowseCard(s, i)));
}

function buildBrowseCard(story, index) {
  const card = document.createElement("div");
  card.className = "story-card";
  card.style.animationDelay = `${index * 0.05}s`;

  const excerpt = story.content.length > 150
    ? story.content.slice(0, 150) + "…"
    : story.content;

  card.innerHTML = `
    <div class="story-card__tag tag--${story.tag}">${story.tag}</div>
    <h3 class="story-card__title">${escHtml(story.title)}</h3>
    <p class="story-card__excerpt">${escHtml(excerpt)}</p>
    <div class="story-card__footer">
      <div class="story-card__meta">
        <span class="story-card__author">${escHtml(story.author || "مجهول")}</span>
        <span class="story-card__loc">${escHtml(story.location || "غزة")}</span>
      </div>
      <span class="story-card__read">اقرأ ←</span>
    </div>`;

  card.addEventListener("click", () => openModal(story));
  return card;
}

// MY STORIES
function renderMyStories() {
  const grid  = document.getElementById("myStoriesGrid");
  const empty = document.getElementById("dashEmptyMine");
  grid.innerHTML = "";

  if (myStories.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  myStories.forEach((s, i) => grid.appendChild(buildMyCard(s, i)));
}

function buildMyCard(story, index) {
  const card = document.createElement("div");
  card.className = "story-card story-card--mine";
  card.style.animationDelay = `${index * 0.05}s`;

  const excerpt = story.content.length > 130
    ? story.content.slice(0, 130) + "…"
    : story.content;

  const date = story.date
    ? new Date(story.date).toLocaleDateString("ar-PS", { year:"numeric", month:"long" })
    : "";

  card.innerHTML = `
    <div class="story-card__tag tag--${story.tag}">${story.tag}</div>
    <h3 class="story-card__title">${escHtml(story.title)}</h3>
    <p class="story-card__excerpt">${escHtml(excerpt)}</p>
    <div class="story-card__footer">
      <span class="story-card__date">${date}</span>
      <div class="story-card__actions">
        <button class="btn-icon btn-icon--edit" title="تعديل">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          تعديل
        </button>
        <button class="btn-icon btn-icon--delete" title="حذف">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          حذف
        </button>
      </div>
    </div>`;

  card.querySelector(".btn-icon--edit").addEventListener("click", (e) => {
    e.stopPropagation();
    startEdit(story);
  });
  card.querySelector(".btn-icon--delete").addEventListener("click", (e) => {
    e.stopPropagation();
    openDeleteModal(story.id);
  });
  card.addEventListener("click", () => openModal(story));

  return card;
}

// WRITE / EDIT
function startEdit(story) {
  document.getElementById("editStoryId").value       = story.id;
  document.getElementById("dAuthorName").value       = story.author   || "";
  document.getElementById("dStoryLocation").value    = story.location || "";
  document.getElementById("dStoryDate").value        = story.date     || "";
  document.getElementById("dStoryTag").value         = story.tag      || "ذكرى";
  document.getElementById("dStoryTitle").value       = story.title    || "";
  document.getElementById("dStoryContent").value     = story.content  || "";
  document.getElementById("dCharCount").textContent  = (story.content || "").length;
  document.getElementById("dAgreeCheck").checked     = true;

  document.getElementById("writeFormTitle").textContent  = "تعديل القصة";
  document.getElementById("dCancelEditBtn").style.display = "";

  showView("write");
}

function cancelEdit() {
  document.getElementById("editStoryId").value       = "";
  document.getElementById("dashStoryForm").reset();
  document.getElementById("dCharCount").textContent  = "0";
  document.getElementById("writeFormTitle").textContent  = "قصة جديدة";
  document.getElementById("dCancelEditBtn").style.display = "none";
}

async function handleStorySubmit(e) {
  e.preventDefault();
  if (!validateStoryForm()) return;

  const editId = document.getElementById("editStoryId").value;
  const isEdit = !!editId;

  const storyData = {
    title    : document.getElementById("dStoryTitle").value.trim(),
    content  : document.getElementById("dStoryContent").value.trim(),
    author   : document.getElementById("dAuthorName").value.trim(),
    location : document.getElementById("dStoryLocation").value.trim(),
    date     : document.getElementById("dStoryDate").value,
    tag      : document.getElementById("dStoryTag").value,
    authorUid: currentUser.uid,
  };

  const submitBtn = document.getElementById("dSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.querySelector(".btn__text").style.display   = "none";
  submitBtn.querySelector(".btn__loader").style.display = "inline";

  try {
    if (isEdit) {
      // تعديل: نحافظ على createdAt الأصلي
      storyData.updatedAt = Date.now();
      await db.collection("stories").doc(editId).update(storyData);

      // تحديث محلي
      const idx = allStories.findIndex(s => s.id === editId);
      if (idx !== -1) allStories[idx] = { ...allStories[idx], ...storyData };
      const mIdx = myStories.findIndex(s => s.id === editId);
      if (mIdx !== -1) myStories[mIdx] = { ...myStories[mIdx], ...storyData };

      showToast("تم تعديل القصة بنجاح ✓");
    } else {
      // نشر جديد
      storyData.createdAt = Date.now();
      const ref = await db.collection("stories").add(storyData);
      const newStory = { id: ref.id, ...storyData };
      allStories.unshift(newStory);
      myStories.unshift(newStory);
      showToast("تم نشر قصتك بنجاح! شكراً لمشاركتك ✓");
    }

    document.getElementById("dashStoryForm").reset();
    document.getElementById("dCharCount").textContent = "0";
    cancelEdit();
    renderBrowse();
    renderMyStories();
    showView("mystories");

  } catch (err) {
    console.error(err);
    showToast("حدث خطأ، يرجى المحاولة لاحقاً.", true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector(".btn__text").style.display   = "inline";
    submitBtn.querySelector(".btn__loader").style.display = "none";
  }
}

// DELETE (قصصي فقط)
function openDeleteModal(storyId) {
  deleteStoryId = storyId;
  document.getElementById("deleteOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}
function closeDeleteModal() {
  deleteStoryId = null;
  document.getElementById("deleteOverlay").classList.remove("active");
  document.body.style.overflow = "";
}

document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
  if (!deleteStoryId) return;
  try {
    await db.collection("stories").doc(deleteStoryId).delete();
    allStories = allStories.filter(s => s.id !== deleteStoryId);
    myStories  = myStories.filter(s  => s.id !== deleteStoryId);
    renderBrowse();
    renderMyStories();
    showToast("تم حذف القصة.");
  } catch (err) {
    showToast("فشل الحذف. حاول لاحقاً.", true);
  } finally {
    closeDeleteModal();
  }
});

// MODAL
function openModal(story) {
  const date = story.date
    ? new Date(story.date).toLocaleDateString("ar-PS", { year:"numeric", month:"long", day:"numeric" })
    : "غير محدد";

  document.getElementById("modalTag").innerHTML =
    `<span class="story-card__tag tag--${story.tag}">${story.tag}</span>`;
  document.getElementById("modalTitle").textContent    = story.title;
  document.getElementById("modalAuthor").textContent   = story.author   || "مجهول";
  document.getElementById("modalLocation").textContent = story.location || "غزة";
  document.getElementById("modalDate").textContent     = date;
  document.getElementById("modalBody").textContent     = story.content;

  document.getElementById("modalOverlay").classList.add("active");
  document.body.style.overflow = "hidden";

  document.getElementById("modalCopyBtn").onclick = () => {
    navigator.clipboard.writeText(
      `${story.title}\n\n${story.content}\n\n— ${story.author || "مجهول"}, ${story.location || "غزة"}`
    ).then(() => showToast("تم نسخ القصة ✓"));
  };
}

// VALIDATION
function validateStoryForm() {
  clearFormErrors();
  let valid = true;
  const title   = document.getElementById("dStoryTitle");
  const content = document.getElementById("dStoryContent");
  const agree   = document.getElementById("dAgreeCheck");

  if (!title.value.trim()) {
    document.getElementById("dTitleError").classList.add("visible");
    title.classList.add("error");
    valid = false;
  }
  if (!content.value.trim()) {
    document.getElementById("dContentError").classList.add("visible");
    content.classList.add("error");
    valid = false;
  }
  if (!agree.checked) {
    document.getElementById("dAgreeError").classList.add("visible");
    valid = false;
  }
  return valid;
}
function clearFormErrors() {
  document.querySelectorAll(".form-error")
    .forEach(el => el.classList.remove("visible"));
  document.querySelectorAll(".form-input, .form-textarea")
    .forEach(el => el.classList.remove("error"));
}

// TOAST
let toastTimer;
function showToast(msg, isInfo = false) {
  const toast   = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  toastMsg.textContent = msg;
  toast.querySelector(".toast__icon").textContent = isInfo ? "ℹ" : "✓";
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// BIND EVENTS
function bindDashEvents() {
  // نموذج الكتابة
  document.getElementById("dashStoryForm")
    .addEventListener("submit", handleStorySubmit);

  // عدّاد الحروف
  document.getElementById("dStoryContent").addEventListener("input", function() {
    const len = this.value.length;
    document.getElementById("dCharCount").textContent = len;
    if (len > MAX_CHARS) this.value = this.value.slice(0, MAX_CHARS);
    this.classList.remove("error");
  });

  // فلاتر تصفح
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn")
        .forEach(b => b.classList.remove("filter-btn--active"));
      btn.classList.add("filter-btn--active");
      activeFilter = btn.dataset.filter;
      renderBrowse();
    });
  });

  // بحث
  let searchDebounce;
  document.getElementById("dashSearch").addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(renderBrowse, 250);
  });

  // إغلاق المودال
  document.getElementById("modalClose").addEventListener("click", () => {
    document.getElementById("modalOverlay").classList.remove("active");
    document.body.style.overflow = "";
  });
  document.getElementById("modalOverlay").addEventListener("click", e => {
    if (e.target === document.getElementById("modalOverlay")) {
      document.getElementById("modalOverlay").classList.remove("active");
      document.body.style.overflow = "";
    }
  });

  // Escape
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.active")
        .forEach(el => el.classList.remove("active"));
      document.body.style.overflow = "";
    }
  });

  // nav shadow
  window.addEventListener("scroll", () => {
    document.querySelector(".nav").style.boxShadow =
      window.scrollY > 10 ? "0 4px 24px rgba(0,0,0,0.5)" : "none";
  }, { passive: true });
}
