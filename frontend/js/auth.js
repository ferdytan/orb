/* ==========================================================================
   ORB - AUTHENTICATION & CREDENTIAL CHECK CONTROLLER
   Supports: PIN (1607) | Username & Password (ferdy / 1607) | Google Login
   ========================================================================== */

const Auth = {
  currentPin: "",
  activeMode: "pin", // 'pin' or 'password'
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
    this.setupTabs();
    this.setupKeypad();
    this.setupPasswordForm();
    this.setupGoogleAuth();
    this.setupKeyboard();

    // Check if user is already authenticated
    if (this.isAuthenticated()) {
      this.unlockApp();
    } else {
      this.lockApp();
    }
  },

  setupTabs() {
    const pinTabBtn = document.getElementById("authTabPinBtn");
    const pwdTabBtn = document.getElementById("authTabPasswordBtn");
    const pinPanel = document.getElementById("authPanelPin");
    const pwdPanel = document.getElementById("authPanelPassword");

    if (pinTabBtn && pwdTabBtn && pinPanel && pwdPanel) {
      pinTabBtn.addEventListener("click", () => {
        this.activeMode = "pin";
        pinTabBtn.classList.add("active");
        pwdTabBtn.classList.remove("active");
        pinPanel.style.display = "flex";
        pwdPanel.style.display = "none";
        this.clearError();
      });

      pwdTabBtn.addEventListener("click", () => {
        this.activeMode = "password";
        pwdTabBtn.classList.add("active");
        pinTabBtn.classList.remove("active");
        pinPanel.style.display = "none";
        pwdPanel.style.display = "flex";
        this.clearError();

        // Focus password input if username is already filled
        const pwdInput = document.getElementById("authPasswordInput");
        if (pwdInput) setTimeout(() => pwdInput.focus(), 100);
      });
    }
  },

  setupKeypad() {
    const keypad = document.getElementById("authNumericKeypad");
    if (!keypad) return;

    keypad.addEventListener("click", (e) => {
      const btn = e.target.closest(".auth-key-btn");
      if (!btn) return;

      const key = btn.dataset.key;
      if (key === "backspace") {
        this.removeDigit();
      } else if (key === "clear") {
        this.clearPin();
      } else if (key !== undefined) {
        this.appendDigit(key);
      }
    });
  },

  setupPasswordForm() {
    const form = document.getElementById("authPasswordForm");
    const submitBtn = document.getElementById("authSubmitPasswordBtn");
    const pwdInput = document.getElementById("authPasswordInput");

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
  },

  setupKeyboard() {
    window.addEventListener("keydown", (e) => {
      const loginView = document.getElementById("viewAuthLogin");
      if (!loginView || loginView.style.display === "none") return;

      // Only handle numeric keyboard when PIN mode is active and not focusing an input
      if (this.activeMode !== "pin") return;
      if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;

      if (e.key >= "0" && e.key <= "9") {
        this.appendDigit(e.key);
      } else if (e.key === "Backspace") {
        this.removeDigit();
      } else if (e.key === "Escape") {
        this.clearPin();
      }
    });
  },

  setupGoogleAuth() {
    const googleBtn = document.getElementById("authGoogleBtn");
    if (googleBtn) {
      googleBtn.addEventListener("click", async () => {
        await this.handleGoogleLogin();
      });
    }
  },

  appendDigit(digit) {
    if (this.currentPin.length >= 4) return;
    this.currentPin += digit;
    this.updateDots();

    if (this.currentPin.length === 4) {
      setTimeout(() => this.submitPin(), 100);
    }
  },

  removeDigit() {
    if (this.currentPin.length > 0) {
      this.currentPin = this.currentPin.slice(0, -1);
      this.updateDots();
      this.clearError();
    }
  },

  clearPin() {
    this.currentPin = "";
    this.updateDots();
    this.clearError();
  },

  updateDots() {
    for (let i = 1; i <= 4; i++) {
      const dot = document.getElementById(`pinDot${i}`);
      if (dot) {
        if (i <= this.currentPin.length) {
          dot.classList.add("filled");
        } else {
          dot.classList.remove("filled");
        }
      }
    }
  },

  showError(msg) {
    const errEl = document.getElementById("authErrorMessage");
    const container = document.getElementById("authPinDotsContainer");
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = "block";
    }
    if (container && this.activeMode === "pin") {
      container.classList.add("shake-animation");
      setTimeout(() => container.classList.remove("shake-animation"), 500);
    }
  },

  clearError() {
    const errEl = document.getElementById("authErrorMessage");
    if (errEl) {
      errEl.textContent = "";
      errEl.style.display = "none";
    }
  },

  async submitPin() {
    const pin = this.currentPin;
    this.clearError();

    const targetUrl = API.buildUrl("/api/auth/pin");
    console.log("🔐 Memverifikasi PIN ke:", targetUrl);

    // Visual feedback: dim dots during validation
    const dots = document.querySelectorAll(".auth-pin-dot");
    dots.forEach(d => d.style.opacity = "0.5");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      dots.forEach(d => d.style.opacity = "1");

      if (res.status === 404) {
        this.showError("Server backend belum aktif (HTTP 404). Silakan restart Python App di cPanel.");
        setTimeout(() => this.clearPin(), 800);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        this.showError(errData.detail || "PIN salah. Silakan coba lagi (Standar: 1607).");
        setTimeout(() => this.clearPin(), 400);
        return;
      }

      const data = await res.json();
      localStorage.setItem(this.sessionTokenKey, data.token);
      localStorage.setItem(this.userKey, JSON.stringify(data.user));

      this.clearPin();
      this.unlockApp();
    } catch (err) {
      dots.forEach(d => d.style.opacity = "1");
      console.error("Auth PIN request error:", err);
      if (err.name === "AbortError") {
        this.showError(`Koneksi timeout (8s) ke server backend.`);
      } else {
        this.showError(`Gagal menghubungi backend: ${targetUrl}`);
      }
      setTimeout(() => this.clearPin(), 800);
    }
  },

  async submitPassword() {
    this.clearError();

    const unameInput = document.getElementById("authUsernameInput");
    const pwdInput = document.getElementById("authPasswordInput");
    const submitBtn = document.getElementById("authSubmitPasswordBtn");

    const username = unameInput ? unameInput.value.trim() : "";
    const password = pwdInput ? pwdInput.value.trim() : "";

    if (!username || !password) {
      this.showError("Username dan password wajib diisi.");
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
      const timeoutId = setTimeout(() => controller.abort(), 8000);

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
        this.showError("Server backend belum aktif (HTTP 404). Silakan restart Python App di cPanel.");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        this.showError(errData.detail || "Username atau password salah. Standar: ferdy / 1607");
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
        this.showError(`Koneksi timeout (8s) ke server backend.`);
      } else {
        this.showError(`Gagal menghubungi backend: ${targetUrl}`);
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
    // Show Login Screen
    const loginView = document.getElementById("viewAuthLogin");
    if (loginView) {
      loginView.style.display = "flex";
    }

    // Hide Top Header and Bottom Nav
    const header = document.querySelector(".app-top-header");
    if (header) header.style.display = "none";

    const nav = document.querySelector(".sticky-bottom-nav-bar");
    if (nav) nav.style.display = "none";

    // Hide all views
    document.querySelectorAll(".app-page-view").forEach(el => {
      if (el.id !== "viewAuthLogin") el.style.display = "none";
    });

    this.clearPin();
  },

  unlockApp() {
    // Hide Login Screen
    const loginView = document.getElementById("viewAuthLogin");
    if (loginView) {
      loginView.style.display = "none";
    }

    // Show Top Header and Bottom Nav
    const header = document.querySelector(".app-top-header");
    if (header) header.style.display = "flex";

    const nav = document.querySelector(".sticky-bottom-nav-bar");
    if (nav) nav.style.display = "flex";

    // Restore active tab (default office)
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
