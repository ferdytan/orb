/* ==========================================================================
   ORB - MAIN APPLICATION CONTROLLER & SPA ROUTER
   Fin-First Architecture: Instant 0ms Shell Render & Resilient Client Router
   ========================================================================== */

const OrbApp = {
  currentLighting: "night",
  currentTheme: "dark",
  isAutoLighting: true,
  activeTab: "office", // 'office', 'fin', 'settings'

  init() {
    console.log("🚀 Initializing Orb Fin-First PWA...");

    // 1. FAST PATH: Synchronous initial shell render (ZERO BLOCKING AWAITS!)
    if (window.AvatarsManager) {
      window.AvatarsManager.init(window.DEFAULT_AGENTS);
    }

    if (window.BentoManager) {
      window.BentoManager.init();
    }

    if (window.FinWorkspace) {
      window.FinWorkspace.init();
    }

    if (window.WellyWorkspace) {
      window.WellyWorkspace.init();
    }

    if (window.DotsBotManager) {
      window.DotsBotManager.init();
    }

    if (window.ChatFirstManager) {
      window.ChatFirstManager.init();
    }

    // 2. Setup Navigation, Router, Auth & Clock
    if (window.Auth) {
      window.Auth.init();
    }
    this.setupRouter();
    this.setupTabs();
    this.setupClock();
    this.setupSettingsView();
    this.setupChatBar();

    // 3. Apply real-time lighting based on actual clock
    this.syncLightingWithRealClock();
    this.applyTheme(this.currentTheme);

    // 4. Background Async Hydration: Fetch live data from backend without delaying UI
    this.hydrateFromBackend();

    // 5. Connect WebSocket for live push updates
    if (window.API?.initWebSocket) {
      window.API.initWebSocket((data) => this.handleWsMessage(data));
    }
  },

  async hydrateFromBackend() {
    try {
      const agents = await window.API.getAgents();
      if (Array.isArray(agents) && agents.length > 0) {
        window.AvatarsManager?.init(agents);
      }
    } catch (_) {}

    try {
      await window.BentoManager?.refresh();
      await window.FinWorkspace?.loadInitialData();
      await window.WellyWorkspace?.refresh();
    } catch (_) {}
  },

  refreshExecutiveBrief() {
    window.BentoManager?.refresh();
  },

  // --------------------------------------------------------------------------
  // SPA CLIENT ROUTER (HASH-BASED)
  // --------------------------------------------------------------------------
  setupRouter() {
    window.addEventListener("hashchange", () => this.handleRoute());
    // Initial route handling
    this.handleRoute();
  },

  handleRoute() {
    // If not authenticated, ensure lock screen is presented
    if (window.Auth && !window.Auth.isAuthenticated()) {
      window.Auth.lockApp();
      return;
    }

    const rawHash = window.location.hash.replace(/^#/, '').trim();
    if (!rawHash) {
      this.switchTab("chat_first", false);
      window.ChatFirstManager?.switchAgent("fin");
      return;
    }

    const parts = rawHash.split("?")[0].split("/");
    const primaryTab = parts[0] || "agents";
    const subRoute = parts[1] || null;

    if (primaryTab === "agents" || primaryTab === "chat" || primaryTab === "chat_first") {
      this.switchTab("chat_first", false);
      const agentId = (subRoute === "welly") ? "welly" : "fin";
      window.ChatFirstManager?.switchAgent(agentId);
    } else if (primaryTab === "fin") {
      this.switchTab("chat_first", false);
      window.ChatFirstManager?.switchAgent("fin");
      if (subRoute === "add" || subRoute === "add_log") {
        window.ChatFirstManager?.openAddLogPanel();
      } else if (subRoute === "dashboard" || subRoute === "overview") {
        window.ChatFirstManager?.openFinDashboardPanel();
      }
    } else if (primaryTab === "welly") {
      this.switchTab("chat_first", false);
      window.ChatFirstManager?.switchAgent("welly");
      if (subRoute === "portfolio" || subRoute === "snapshot") {
        window.ChatFirstManager?.openWellyPortfolioPanel();
      } else if (subRoute === "plans") {
        window.ChatFirstManager?.openWellyPlansPanel();
      }
    } else if (primaryTab === "settings") {
      this.switchTab("chat_first", false);
      window.ChatFirstManager?.openSettingsPanel();
    } else if (primaryTab === "office") {
      this.switchTab("office", false);
    } else if (primaryTab === "dots") {
      this.switchTab("chat_first", false);
      const agentId = (subRoute === "welly") ? "welly" : "fin";
      window.ChatFirstManager?.switchAgent(agentId);
    } else {
      this.switchTab("chat_first", false);
      window.ChatFirstManager?.switchAgent("fin");
    }
  },

  setupTabs() {
    const tabBtns = document.querySelectorAll(".nav-tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        if (tab === "settings") {
          window.ChatFirstManager?.openSettingsPanel();
        } else {
          window.location.hash = `#${tab}`;
        }
      });
    });

    // Top Settings button click -> Settings Panel
    document.getElementById("headerSettingsBtn")?.addEventListener("click", () => {
      window.ChatFirstManager?.openSettingsPanel();
    });

    // Top status pill click -> Settings Panel
    document.getElementById("headerStatusPill")?.addEventListener("click", () => {
      window.ChatFirstManager?.openSettingsPanel();
    });

    // Top Brand title click -> Agents Home
    document.getElementById("headerBrandBtn")?.addEventListener("click", () => {
      window.location.hash = "#agents/fin";
    });

    // OpenDots brand home click
    document.getElementById("btnDotsBrandHome")?.addEventListener("click", () => {
      window.location.hash = "#agents/fin";
    });
  },

  switchTab(tabName, updateHash = true) {
    this.activeTab = tabName;

    if (updateHash) {
      window.location.hash = `#${tabName}`;
    }

    // Toggle chat-first mode on body and header visibility
    const isChatFirst = (tabName === "chat_first" || tabName === "agents" || tabName === "chat");
    const isDots = (tabName === "dots");
    document.body.classList.toggle("orb-chat-first-mode", isChatFirst);
    document.body.classList.toggle("dots-mode", isDots);

    const topHeader = document.getElementById("appTopHeader");
    const bottomNav = document.getElementById("appBottomNavBar");
    if (topHeader) topHeader.style.display = (isChatFirst || isDots) ? "none" : "";
    if (bottomNav) bottomNav.style.display = (isChatFirst || isDots) ? "none" : "";

    // Update bottom nav button active states
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      const tab = btn.dataset.tab;
      const isActive = (tab === tabName) || 
                       (tabName === "office" && (tab === "office" || tab === "beranda")) ||
                       (tabName === "settings" && tab === "settings");
      btn.classList.toggle("active", isActive);
    });

    // Update page view containers
    const pageMap = {
      chat_first: "viewChatFirstApp",
      agents: "viewChatFirstApp",
      chat: "viewChatFirstApp",
      dots: "viewDotsBot",
      office: "viewOfficeHome",
      fin: "viewFinWorkspace",
      welly: "viewWellyWorkspace",
      settings: "viewSettings"
    };

    document.querySelectorAll(".app-page-view").forEach(view => {
      view.classList.remove("active");
      view.style.display = "none";
    });

    const targetId = pageMap[tabName] || "viewChatFirstApp";
    const targetView = document.getElementById(targetId);
    if (targetView) {
      targetView.classList.add("active");
      targetView.style.display = "flex";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (tabName === "fin" && window.FinWorkspace) {
      window.FinWorkspace.renderCurrentSubtab();
    } else if (tabName === "welly" && window.WellyWorkspace) {
      window.WellyWorkspace.refresh();
    } else if (tabName === "office" && window.BentoManager) {
      window.BentoManager.refresh();
    }
  },

  // --------------------------------------------------------------------------
  // OFFICE CHAT BAR (TANYA FIN QUICK ACCESS)
  // --------------------------------------------------------------------------
  setupChatBar() {
    const input = document.getElementById("chatBarInput");
    const sendBtn = document.getElementById("chatSendBtn");

    const doSubmit = () => {
      const text = input?.value?.trim();
      if (!text) return;
      input.value = "";

      // Switch to Tanya Fin subtab and send question
      window.location.hash = "#fin/chat";
      setTimeout(() => {
        const chatInput = document.getElementById("finChatTextInput");
        const chatSubmit = document.getElementById("finChatSubmitBtn");
        if (chatInput && chatSubmit) {
          chatInput.value = text;
          chatSubmit.click();
        }
      }, 150);
    };

    sendBtn?.addEventListener("click", doSubmit);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSubmit();
    });
  },

  // --------------------------------------------------------------------------
  // CLOCK & LIGHTING
  // --------------------------------------------------------------------------
  setupClock() {
    const updateTime = () => {
      if (this.isAutoLighting) {
        this.syncLightingWithRealClock();
      }
    };
    updateTime();
    setInterval(updateTime, 60000);
  },

  syncLightingWithRealClock() {
    const now = new Date();
    const hour = now.getHours();
    let determined = "night";
    let label = "Malam";

    if (hour >= 5 && hour < 11) {
      determined = "morning";
      label = "Pagi";
    } else if (hour >= 11 && hour < 15) {
      determined = "noon";
      label = "Siang";
    } else if (hour >= 15 && hour < 18.5) {
      determined = "evening";
      label = "Sore (Senja)";
    } else {
      determined = "night";
      label = "Malam";
    }

    this.applyLighting(determined, true, label);
  },

  applyLighting(mode, isAuto = false, timeLabel = "") {
    this.currentLighting = mode;
    const scene = document.getElementById("officeHeaderScene");
    const statusText = document.getElementById("headerLightingStatusText");
    const backdrop = document.getElementById("officeBackdropLayer");

    if (!scene) return;

    scene.classList.remove("lighting-morning", "lighting-noon", "lighting-evening", "lighting-night");
    scene.classList.add(`lighting-${mode}`);

    if (backdrop) {
      backdrop.style.backgroundImage = `url('./assets/office_${mode}.jpg')`;
    }

    if (statusText) {
      const modeNames = {
        morning: "Pagi",
        noon: "Siang",
        evening: "Sore",
        night: "Malam"
      };
      const prefix = isAuto ? "Auto • " : "Manual • ";
      statusText.textContent = `${prefix}${timeLabel || modeNames[mode] || mode}`;
    }

    document.querySelectorAll(".lighting-mode-card").forEach(card => {
      card.classList.toggle("active", isAuto ? card.dataset.lighting === "auto" : card.dataset.lighting === mode);
    });
  },

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    const toggleBtn = document.getElementById("settingsThemeToggle");
    toggleBtn?.classList.toggle("active", theme === "dark");
  },

  setupSettingsView() {
    // Lighting buttons
    document.querySelectorAll(".lighting-mode-card").forEach(card => {
      card.addEventListener("click", () => {
        const selected = card.dataset.lighting;
        if (selected === "auto") {
          this.isAutoLighting = true;
          this.syncLightingWithRealClock();
        } else {
          this.isAutoLighting = false;
          this.applyLighting(selected, false);
        }
      });
    });

    // Theme toggle
    const themeBtn = document.getElementById("settingsThemeToggle");
    themeBtn?.addEventListener("click", () => {
      const newTheme = this.currentTheme === "dark" ? "light" : "dark";
      this.applyTheme(newTheme);
    });

    // Logout / Lock session
    const logoutBtn = document.getElementById("btnSettingsLogout");
    logoutBtn?.addEventListener("click", async () => {
      if (confirm("Kunci sesi dan keluar dari Orb?")) {
        await window.Auth?.logout();
      }
    });
  },

  handleWsMessage(data) {
    if (!data) return;
    if (data.type === "transactions_updated" || data.type === "wallet_updated") {
      this.refreshExecutiveBrief();
      if (this.activeTab === "fin" && window.FinWorkspace) {
        window.FinWorkspace.renderCurrentSubtab();
      }
    }
  }
};

window.OrbApp = OrbApp;

// Auto-boot upon DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  OrbApp.init();
});
