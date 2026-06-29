"use strict";
// صفحة إنشاء الحساب فقط

// إذا مسجّل دخول أصلاً، وجّهه
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const role = await getUserRole(user.uid);
  window.location.replace(role === "admin" ? "admin.html" : "dashboard.html");
});

async function handleRegister() {
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const pass = document.getElementById("regPassword").value;
  const confirm = document.getElementById("regPasswordConfirm").value;
  const errEl = document.getElementById("registerError");
  const sucEl = document.getElementById("registerSuccess");
  const btn = document.getElementById("registerBtn");

  errEl.style.display = "none";
  sucEl.style.display = "none";

  if (!name || !email || !pass || !confirm)
    return showErr(errEl, "يرجى ملء جميع الحقول.");
  if (pass.length < 8)
    return showErr(errEl, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
  if (pass !== confirm) return showErr(errEl, "كلمتا المرور غير متطابقتين.");

  setLoading(btn, true);
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await db.collection("users").doc(cred.user.uid).set({
      name,
      email,
      role: "user",
      createdAt: Date.now(),
    });
    await cred.user.updateProfile({ displayName: name });
    await auth.signOut();

    setLoading(btn, false);
    sucEl.style.display = "block";
    // انتقل لصفحة تسجيل الدخول بعد ثانيتين
    setTimeout(() => window.location.replace("login.html"), 2000);
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
    "auth/email-already-in-use": "هذا البريد مسجّل مسبقاً.",
    "auth/invalid-email": "البريد الإلكتروني غير صالح.",
    "auth/weak-password": "كلمة المرور ضعيفة جداً.",
  };
  return map[code] || "حدث خطأ. حاول مجدداً.";
}
