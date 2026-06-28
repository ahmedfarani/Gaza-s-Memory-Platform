"use strict";
// تسجيل الدخول وإنشاء الحساب

// ── إذا المستخدم مسجّل دخول أصلاً، وجّهه حسب دوره
auth.onAuthStateChanged(async (user) => {
  if (!user) return; // زائر — خليه على الصفحة
  const role = await getUserRole(user.uid);
  if (role === "admin") {
    window.location.replace("admin.html");
  } else {
    window.location.replace("dashboard.html");
  }
});

// التبديل بين نموذج الدخول والتسجيل
function switchTab(tab) {
  const isLogin = tab === "login";
  document.getElementById("panelLogin").style.display = isLogin ? "" : "none";
  document.getElementById("panelRegister").style.display = isLogin
    ? "none"
    : "";
  document
    .getElementById("tabLogin")
    .classList.toggle("auth-tab--active", isLogin);
  document
    .getElementById("tabRegister")
    .classList.toggle("auth-tab--active", !isLogin);
}

// تسجيل الدخول
async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginError");
  const btn = document.getElementById("loginBtn");

  clearError(errEl);

  if (!email || !password) {
    return showAuthError(errEl, "يرجى ملء جميع الحقول.");
  }

  setLoading(btn, true);

  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const role = await getUserRole(cred.user.uid);

    // التوجيه حسب الدور
    if (role === "admin") {
      window.location.replace("admin.html");
    } else {
      window.location.replace("dashboard.html");
    }
  } catch (err) {
    setLoading(btn, false);
    showAuthError(errEl, friendlyError(err.code));
  }
}

// إنشاء حساب جديد
async function handleRegister() {
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const pass = document.getElementById("regPassword").value;
  const confirm = document.getElementById("regPasswordConfirm").value;
  const errEl = document.getElementById("registerError");
  const sucEl = document.getElementById("registerSuccess");
  const btn = document.getElementById("registerBtn");

  clearError(errEl);
  sucEl.style.display = "none";

  if (!name || !email || !pass || !confirm) {
    return showAuthError(errEl, "يرجى ملء جميع الحقول.");
  }
  if (pass.length < 8) {
    return showAuthError(errEl, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
  }
  if (pass !== confirm) {
    return showAuthError(errEl, "كلمتا المرور غير متطابقتين.");
  }

  setLoading(btn, true);

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);

    // حفظ بيانات المستخدم في Firestore مع دور "user" افتراضياً
    await db.collection("users").doc(cred.user.uid).set({
      name,
      email,
      role: "user",
      createdAt: Date.now(),
    });

    // تحديث displayName في Firebase Auth
    await cred.user.updateProfile({ displayName: name });

    // تسجيل خروج تلقائي بعد الإنشاء — يطلب منه تسجيل دخول
    await auth.signOut();

    setLoading(btn, false);
    sucEl.style.display = "block";

    // انتقل لتبويب الدخول بعد ثانيتين
    setTimeout(() => switchTab("login"), 2000);
  } catch (err) {
    setLoading(btn, false);
    showAuthError(errEl, friendlyError(err.code));
  }
}

// HELPERS
function showAuthError(el, msg) {
  el.textContent = msg;
  el.style.display = "block";
}
function clearError(el) {
  el.textContent = "";
  el.style.display = "none";
}
function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.querySelector(".btn__text").style.display = loading ? "none" : "inline";
  btn.querySelector(".btn__loader").style.display = loading ? "inline" : "none";
}

// ترجمة رسائل Firebase لأخطاء بالعربي
function friendlyError(code) {
  const map = {
    "auth/user-not-found": "لا يوجد حساب بهذا البريد الإلكتروني.",
    "auth/wrong-password": "كلمة المرور غير صحيحة.",
    "auth/invalid-email": "البريد الإلكتروني غير صالح.",
    "auth/email-already-in-use": "هذا البريد الإلكتروني مسجّل مسبقاً.",
    "auth/weak-password": "كلمة المرور ضعيفة جداً.",
    "auth/too-many-requests": "محاولات كثيرة جداً. حاول لاحقاً.",
    "auth/invalid-credential": "البريد أو كلمة المرور غير صحيحة.",
  };
  return map[code] || "حدث خطأ غير متوقع. حاول مجدداً.";
}

// ربط Enter بأزرار تسجيل الدخول والتسجيل
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const loginPanel = document.getElementById("panelLogin");
  const registerPanel = document.getElementById("panelRegister");
  if (loginPanel.style.display !== "none" && !loginPanel.style.display)
    handleLogin();
  else if (
    loginPanel.style.display === "" ||
    loginPanel.style.display === "block"
  )
    handleLogin();
  // يتعامل مع نموذج التسجيل
  if (registerPanel.style.display === "block") handleRegister();
});
