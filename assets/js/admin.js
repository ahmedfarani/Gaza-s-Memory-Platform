"use strict";
// لوحة تحكم الأدمن

let allStories = [];
let allUsers = [];
let deleteStoryId = null;
let deleteUserId = null;

// ── حماية: فقط الأدمن يدخل هذه الصفحة
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.replace("auth.html");
    return;
  }

  const role = await getUserRole(user.uid);
  if (role !== "admin") {
    // مستخدم عادي حاول يدخل — أرسله للداشبورد
    window.location.replace("dashboard.html");
    return;
  }

  // اسم الأدمن
  try {
    const doc = await db.collection("users").doc(user.uid).get();
    const name = doc.exists ? doc.data().name || user.email : user.email;
    document.getElementById("adminName").textContent = name;
  } catch (_) {}

  // زر خروج
  document
    .getElementById("navLogoutBtn")
    .addEventListener("click", async () => {
      await auth.signOut();
      window.location.replace("auth.html");
    });

  await Promise.all([loadAllStories(), loadAllUsers()]);
  bindAdminEvents();
  renderOverview();
});

// LOAD DATA
async function loadAllStories() {
  const snap = await db
    .collection("stories")
    .orderBy("createdAt", "desc")
    .get();
  allStories = [];
  snap.forEach((d) => allStories.push({ id: d.id, ...d.data() }));
  document.getElementById("statTotalStories").textContent = allStories.length;
}

async function loadAllUsers() {
  const snap = await db.collection("users").get();
  allUsers = [];
  snap.forEach((d) => allUsers.push({ id: d.id, ...d.data() }));
  document.getElementById("statTotalUsers").textContent = allUsers.length;
}

// 
// VIEWS
function showAdminView(view) {
  // إخفاء/إظهار الـ views
  ["overview", "stories", "users"].forEach((v) => {
    const el = document.getElementById(
      "adminView" + v.charAt(0).toUpperCase() + v.slice(1),
    );
    if (el) el.style.display = v === view ? "" : "none";
  });

  // السايدبار — desktop
  const sidebarItems = document.querySelectorAll(".dash-nav__item");
  const viewOrder = ["overview", "stories", "users"];
  sidebarItems.forEach((btn, i) => {
    btn.classList.toggle("dash-nav__item--active", viewOrder[i] === view);
  });

  // Bottom nav — mobile
  const mbnMap = {
    overview: "mbn-overview",
    stories: "mbn-stories",
    users: "mbn-users",
  };
  Object.entries(mbnMap).forEach(([v, id]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("mobile-bottom-nav__item--active", v === view);
  });

  if (view === "stories") renderAdminStories();
  if (view === "users") renderAdminUsers();
}

// OVERVIEW
function renderOverview() {
  const list = document.getElementById("recentStoriesList");
  list.innerHTML = "";
  const recent = allStories.slice(0, 5);

  if (recent.length === 0) {
    list.innerHTML =
      "<p style='color:var(--sand-muted);padding:20px 0'>لا توجد قصص بعد.</p>";
    return;
  }

  recent.forEach((story) => {
    const row = buildAdminStoryRow(story, true); // true = compact
    list.appendChild(row);
  });
}

// ADMIN STORIES
function renderAdminStories() {
  const searchVal = (document.getElementById("adminStorySearch")?.value || "")
    .trim()
    .toLowerCase();
  const filtered = allStories.filter(
    (s) =>
      !searchVal ||
      s.title.toLowerCase().includes(searchVal) ||
      (s.author || "").toLowerCase().includes(searchVal) ||
      (s.location || "").toLowerCase().includes(searchVal),
  );

  const list = document.getElementById("adminStoriesList");
  const empty = document.getElementById("adminEmptyStories");
  list.innerHTML = "";

  if (filtered.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  filtered.forEach((story) => list.appendChild(buildAdminStoryRow(story)));
}

function buildAdminStoryRow(story, compact = false) {
  const row = document.createElement("div");
  row.className = "admin-row";

  const date = story.createdAt
    ? new Date(story.createdAt).toLocaleDateString("ar-PS", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  row.innerHTML = `
    <div class="admin-row__info">
      <span class="story-card__tag tag--${story.tag}" style="margin-bottom:0;font-size:0.68rem">${story.tag}</span>
      <div>
        <div class="admin-row__title">${escHtml(story.title)}</div>
        <div class="admin-row__meta">
          ${escHtml(story.author || "مجهول")} • ${escHtml(story.location || "غزة")} • ${date}
        </div>
      </div>
    </div>
    <div class="admin-row__actions">
      <button class="btn-icon btn-icon--view" title="عرض">عرض</button>
      ${!compact ? `<button class="btn-icon btn-icon--delete" title="حذف">حذف</button>` : ""}
    </div>`;

  row
    .querySelector(".btn-icon--view")
    .addEventListener("click", () => openModal(story));
  if (!compact) {
    row
      .querySelector(".btn-icon--delete")
      .addEventListener("click", () => openDeleteStoryModal(story.id));
  }

  return row;
}

// ADMIN USERS
function renderAdminUsers() {
  const list = document.getElementById("adminUsersList");
  const empty = document.getElementById("adminEmptyUsers");
  list.innerHTML = "";

  if (allUsers.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  allUsers.forEach((user) => list.appendChild(buildAdminUserRow(user)));
}

function buildAdminUserRow(user) {
  const row = document.createElement("div");
  row.className = "admin-row";

  const date = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("ar-PS", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const isAdmin = user.role === "admin";

  row.innerHTML = `
    <div class="admin-row__info">
      <div class="dash-avatar" style="width:38px;height:38px;font-size:1rem;flex-shrink:0">
        ${(user.name || user.email || "?").charAt(0).toUpperCase()}
      </div>
      <div>
        <div class="admin-row__title">
          ${escHtml(user.name || "—")}
          ${isAdmin ? `<span class="admin-badge" style="margin-right:8px">أدمن</span>` : ""}
        </div>
        <div class="admin-row__meta">${escHtml(user.email || "")} • انضم: ${date}</div>
      </div>
    </div>
    <div class="admin-row__actions">
      ${
        !isAdmin
          ? `<button class="btn-icon btn-icon--delete" title="حذف">حذف</button>`
          : `<span style="font-size:0.78rem;color:var(--sand-muted)">محمي</span>`
      }
    </div>`;

  if (!isAdmin) {
    row
      .querySelector(".btn-icon--delete")
      .addEventListener("click", () => openDeleteUserModal(user.id));
  }

  return row;
}

// DELETE STORY
function openDeleteStoryModal(storyId) {
  deleteStoryId = storyId;
  document.getElementById("deleteStoryOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}
function closeDeleteStoryModal() {
  deleteStoryId = null;
  document.getElementById("deleteStoryOverlay").classList.remove("active");
  document.body.style.overflow = "";
}

document
  .getElementById("confirmDeleteStoryBtn")
  .addEventListener("click", async () => {
    if (!deleteStoryId) return;
    try {
      await db.collection("stories").doc(deleteStoryId).delete();
      allStories = allStories.filter((s) => s.id !== deleteStoryId);
      document.getElementById("statTotalStories").textContent =
        allStories.length;
      renderAdminStories();
      renderOverview();
      showToast("تم حذف القصة.");
    } catch (err) {
      showToast("فشل الحذف.", true);
    } finally {
      closeDeleteStoryModal();
    }
  });

// DELETE USER (Firestore data فقط)
function openDeleteUserModal(userId) {
  deleteUserId = userId;
  document.getElementById("deleteUserOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}
function closeDeleteUserModal() {
  deleteUserId = null;
  document.getElementById("deleteUserOverlay").classList.remove("active");
  document.body.style.overflow = "";
}

document
  .getElementById("confirmDeleteUserBtn")
  .addEventListener("click", async () => {
    if (!deleteUserId) return;
    try {
      await db.collection("users").doc(deleteUserId).delete();
      allUsers = allUsers.filter((u) => u.id !== deleteUserId);
      document.getElementById("statTotalUsers").textContent = allUsers.length;
      renderAdminUsers();
      showToast("تم حذف بيانات المستخدم.");
    } catch (err) {
      showToast("فشل الحذف.", true);
    } finally {
      closeDeleteUserModal();
    }
  });

// MODAL
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

  document.getElementById("modalOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

// TOAST
let toastTimer;
function showToast(msg, isInfo = false) {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  toastMsg.textContent = msg;
  toast.querySelector(".toast__icon").textContent = isInfo ? "ℹ" : "✓";
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// BIND EVENTS
function bindAdminEvents() {
  // بحث في القصص
  let searchDebounce;
  document.getElementById("adminStorySearch")?.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(renderAdminStories, 250);
  });

  // إغلاق المودال
  document.getElementById("modalClose").addEventListener("click", () => {
    document.getElementById("modalOverlay").classList.remove("active");
    document.body.style.overflow = "";
  });
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("modalOverlay")) {
      document.getElementById("modalOverlay").classList.remove("active");
      document.body.style.overflow = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".modal-overlay.active")
        .forEach((el) => el.classList.remove("active"));
      document.body.style.overflow = "";
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      document.querySelector(".nav").style.boxShadow =
        window.scrollY > 10 ? "0 4px 24px rgba(0,0,0,0.5)" : "none";
    },
    { passive: true },
  );
}
