/* ==========================================================================
   ORB - AUTHENTICATION CONTROLLER (DIRECT USERNAME & PASSWORD)
   Supports: Username & Password Authentication | Google Login | Session Guard
   ========================================================================== */

const Auth = {
  sessionTokenKey: "orb_session_token",
  userKey: "orb_user",

  isAuthenticated() {
    const token = localStorage.getItem(this.sessionTokenKey);
    return Boolean(token && token.length > 10);
  },

  getToken() {
    return localStorage.getItem(this.sessionTokenKey) || "";
  },

  getUser() {
    try {
      const u = localStorage.getItem(this.userKey);
      return u ? JSON.parse(u) : null;
    } catch (_) {
      return null;
    }
  },

  init() {
    this.setupPasswordForm();
    this.setupGoogleAuth();

    // Check if user is already authenticated
    if (this.isAuthenticated()) {
      this.unlockApp();
    } else {
      this.lockApp();
    }
  },

  setupPasswordForm() {
    const form = document.getElementById("authPasswordForm");
    const submitBtn = document.getElementById("authSubmitPasswordBtn");
    const pwdInput = document.getElementById("authPasswordInput");
    const unameInput = document.getElementById("authUsernameInput");

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.submitPassword();
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.submitPassword();
      });
    }

    if (pwdInput) {
      pwdInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.submitPassword();
        }
      });
    }

    if (unameInput) {
      unameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (pwdInput) pwdInput.focus();
        }
      });
    }
  },

  setupGoogleAuth() {
    const googleBtn = document.getElementById("authGoogleBtn");
    if (googleBtn) {
      googleBtn.addEventListener("click", async () => {
        await this.handleGoogleLogin();
      });
    }
  },

  showError(msg) {
    const errEl = document.getElementById("authErrorMessage");
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = "block";
    }
  },

  clearError() {
    const errEl = document.getElementById("authErrorMessage");
    if (errEl) {
      errEl.textContent = "";
      errEl.style.display = "none";
    }
  },

  async submitPassword() {
    this.clearError();

    const unameInput = document.getElementById("authUsernameInput");
    const pwdInput = document.getElementById("authPasswordInput");
    const submitBtn = document.getElementById("authSubmitPasswordBtn");

    const username = unameInput ? unameInput.value.trim() : "";
    const password = pwdInput ? pwdInput.value.trim() : "";

    if (!username) {
      this.showError("Silakan masukkan username.");
      if (unameInput) unameInput.focus();
      return;
    }

    if (!password) {
      this.showError("Silakan masukkan password.");
      if (pwdInput) pwdInput.focus();
      return;
    }

    const targetUrl = API.buildUrl("/api/auth/login");
    console.log("🔐 Memverifikasi kredensial ke:", targetUrl);

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Memverifikasi...";
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Masuk ke Orb ➔";
      }

      if (res.status === 404) {
        this.showError("Server backend belum aktif (HTTP 404). Silakan buka cPanel -> Setup Python App -> Restart.");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        this.showError(errData.detail || "Username atau password salah.");
        if (pwdInput) {
          pwdInput.value = "";
          pwdInput.focus();
        }
        return;
      }

      const data = await res.json();
      localStorage.setItem(this.sessionTokenKey, data.token);
      localStorage.setItem(this.userKey, JSON.stringify(data.user));

      if (pwdInput) pwdInput.value = "";
      this.unlockApp();
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Masuk ke Orb ➔";
      }
      console.error("Auth password request error:", err);
      if (err.name === "AbortError") {
        this.showError("Koneksi timeout. Server sedang booting, silakan coba tekan 'Masuk' lagi.");
      } else {
        this.showError(`Gagal menghubungi server: ${targetUrl}`);
      }
    }
  },

  async handleGoogleLogin() {
    this.clearError();
    try {
      const res = await fetch(API.buildUrl("/api/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ferdy@krftworks.my.id", name: "Ferdy" })
      });

      if (!res.ok) {
        this.showError("Autentikasi Google gagal.");
        return;
      }

      const data = await res.json();
      localStorage.setItem(this.sessionTokenKey, data.token);
      localStorage.setItem(this.userKey, JSON.stringify(data.user));

      this.unlockApp();
    } catch (err) {
      this.showError("Koneksi Google terputus.");
    }
  },

  lockApp() {
    const loginView = document.getElementById("viewAuthLogin");
    if (loginView) {
      loginView.style.display = "flex";
    }

    const header = document.querySelector(".app-top-header");
    if (header) header.style.display = "none";

    const nav = document.querySelector(".sticky-bottom-nav-bar");
    if (nav) nav.style.display = "none";

    document.querySelectorAll(".app-page-view").forEach(el => {
      if (el.id !== "viewAuthLogin") el.style.display = "none";
    });

    const pwdInput = document.getElementById("authPasswordInput");
    if (pwdInput) {
      pwdInput.value = "";
      setTimeout(() => pwdInput.focus(), 150);
    }
  },

  unlockApp() {
    const loginView = document.getElementById("viewAuthLogin");
    if (loginView) {
      loginView.style.display = "none";
    }

    const header = document.querySelector(".app-top-header");
    if (header) header.style.display = "flex";

    const nav = document.querySelector(".sticky-bottom-nav-bar");
    if (nav) nav.style.display = "flex";

    if (window.OrbApp && window.OrbApp.navigateToTab) {
      window.OrbApp.navigateToTab(window.OrbApp.currentTab || "office");
    } else {
      const officeView = document.getElementById("viewOfficeHome");
      if (officeView) officeView.style.display = "block";
    }
  },

  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(API.buildUrl("/api/auth/logout"), {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
      }
    } catch (_) {}

    localStorage.removeItem(this.sessionTokenKey);
    localStorage.removeItem(this.userKey);
    this.lockApp();
  }
};

window.Auth = Auth;
