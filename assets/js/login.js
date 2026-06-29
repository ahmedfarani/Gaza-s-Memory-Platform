"use strict";
// صفحة تسجيل الدخول فقط

// إذا مسجّل دخول أصلاً، وجّهه حسب دوره
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const role = await getUserRole(user.uid);
  window.location.replace(role === "admin" ? "admin.html" : "dashboard.html");
});

async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginError");
  const btn = document.getElementById("loginBtn");

  errEl.style.display = "none";
  if (!email || !password) return showErr(errEl, "يرجى ملء جميع الحقول.");

  setLoading(btn, true);
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const role = await getUserRole(cred.user.uid);
    window.location.replace(role === "admin" ? "admin.html" : "dashboard.html");
  } catch (err) {
    setLoading(btn, false);
    showErr(errEl, friendlyError(err.code));
  }
}

function showErr(el, msg) {
  el.textContent = msg;
  el.style.display = "block";
}
function setLoading(btn, on) {
  btn.disabled = on;
  btn.querySelector(".btn__text").style.display = on ? "none" : "inline";
  btn.querySelector(".btn__loader").style.display = on ? "inline" : "none";
}
function friendlyError(code) {
  const map = {
    "auth/user-not-found": "لا يوجد حساب بهذا البريد.",
    "auth/wrong-password": "كلمة المرور غير صحيحة.",
    "auth/invalid-email": "البريد الإلكتروني غير صالح.",
    "auth/too-many-requests": "محاولات كثيرة. حاول لاحقاً.",
    "auth/invalid-credential": "البريد أو كلمة المرور غير صحيحة.",
  };
  return map[code] || "حدث خطأ. حاول مجدداً.";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleLogin();
});
