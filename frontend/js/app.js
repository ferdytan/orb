/* ==========================================================================
   ORB - MAIN APPLICATION CONTROLLER (PWA & REAL-TIME LIGHTING)
   ========================================================================== */

const OrbApp = {
  currentLighting: "night", // 'morning', 'noon', 'evening', 'night'
  currentTheme: "dark",     // 'light', 'dark'
  isAutoLighting: true,     // Default: automatically follow the real clock!
  activeTab: "office",      // 'office', 'agents', 'goals', 'settings'

  async init() {
    console.log("🚀 Initializing Orb Virtual Office PWA...");

    this.setupTabs();
    this.setupClock();
    this.setupSettingsView();
    this.setupModals();

    // 1. Fetch initial data safely (with offline resilience)
    let agents = [];
    let goals = [];
    let wallet = { balance: 1400, currency: "USD" };
    let talents = [];
    let collections = [];

    try {
      agents = await window.API.getAgents();
    } catch (_) {
      agents = window.DEFAULT_AGENTS;
    }

    try {
      goals = await window.API.getGoals();
      wallet = await window.API.getWallet();
      talents = await window.API.getTalents();
      collections = await window.API.getCollections();
    } catch (_) {}

    // 2. Initialize UI subsystems (guaranteed to render!)
    if (window.AvatarsManager) {
      window.AvatarsManager.init(agents);
    }

    if (window.BentoManager) {
      window.BentoManager.init({ goals, wallet, talents, collections });
    }

    if (window.AgentModalManager) {
      window.AgentModalManager.init();
    }

    const initialAgent = agents.find(a => a.id === "fin") || agents[0];
    if (window.ChatManager) {
      window.ChatManager.init(initialAgent);
    }

    // 3. Apply real-time lighting based on actual clock
    this.syncLightingWithRealClock();
    this.applyTheme(this.currentTheme);

    // 4. Connect WebSocket for live updates if backend is ready
    if (window.API?.initWebSocket) {
      window.API.initWebSocket((data) => this.handleWsMessage(data));
    }
  },

  setupTabs() {
    const tabBtns = document.querySelectorAll(".nav-tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Top status pill click -> Open Settings
    const statusPill = document.getElementById("headerStatusPill");
    statusPill?.addEventListener("click", () => {
      this.switchTab("settings");
    });

    // Top Brand title click -> Back to Office Home
    const brandBtn = document.getElementById("headerBrandBtn");
    brandBtn?.addEventListener("click", () => {
      this.switchTab("office");
    });
  },

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update bottom nav button active states
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    // Update page view containers
    const pageMap = {
      office: "viewOfficeHome",
      agents: "viewAgentsRoster",
      goals: "viewGoalsActivity",
      settings: "viewSettings"
    };

    document.querySelectorAll(".app-page-view").forEach(view => {
      view.classList.remove("active");
    });

    const targetView = document.getElementById(pageMap[tabName]);
    if (targetView) {
      targetView.classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  setupClock() {
    const updateTime = () => {
      if (this.isAutoLighting) {
        this.syncLightingWithRealClock();
      }
    };
    updateTime();
    setInterval(updateTime, 60000); // Check every minute
  },

  syncLightingWithRealClock() {
    const now = new Date();
    const hour = now.getHours();
    let determined = "night";
    let label = "Malam";

    // Morning: 05:00 - 10:59 (Terang, sunrise)
    // Noon: 11:00 - 14:59 (Paling terang, cerah)
    // Evening / Senja: 15:00 - 18:29 (Warna senja, sunset)
    // Night: 18:30 - 04:59 (Agak gelap, lampu office redup & cozy desk lamp)
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

    if (scene) {
      scene.classList.remove("lighting-morning", "lighting-noon", "lighting-evening", "lighting-night");
      scene.classList.add(`lighting-${mode}`);
    }

    const labels = {
      morning: "Pagi",
      noon: "Siang",
      evening: "Senja",
      night: "Malam"
    };

    const displayLabel = timeLabel || labels[mode] || mode;
    if (statusText) {
      statusText.textContent = isAuto ? `Auto • ${displayLabel}` : `Manual • ${displayLabel}`;
    }

    // Update settings buttons highlight
    document.querySelectorAll(".lighting-mode-card").forEach(card => {
      if (this.isAutoLighting) {
        card.classList.toggle("active", card.dataset.lighting === "auto");
      } else {
        card.classList.toggle("active", card.dataset.lighting === mode);
      }
    });
  },

  setupSettingsView() {
    // Lighting Mode Cards
    const lightingCards = document.querySelectorAll(".lighting-mode-card");
    lightingCards.forEach(card => {
      card.addEventListener("click", () => {
        const mode = card.dataset.lighting;
        if (mode === "auto") {
          this.isAutoLighting = true;
          this.syncLightingWithRealClock();
        } else {
          this.isAutoLighting = false;
          this.applyLighting(mode, false);
        }
      });
    });

    // Theme Toggle Switch
    const themeSwitch = document.getElementById("settingsThemeToggle");
    themeSwitch?.addEventListener("click", () => {
      const nextTheme = this.currentTheme === "dark" ? "light" : "dark";
      this.applyTheme(nextTheme);
    });
  },

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);

    const themeSwitch = document.getElementById("settingsThemeToggle");
    if (themeSwitch) {
      themeSwitch.classList.toggle("active", theme === "dark");
    }
  },

  setupModals() {
    // Generic Modal Close Button
    const genericModal = document.getElementById("genericOrbModal");
    const genericCloseBtn = document.getElementById("genericModalCloseBtn");

    genericCloseBtn?.addEventListener("click", () => {
      genericModal?.classList.remove("active");
    });

    genericModal?.addEventListener("click", (e) => {
      if (e.target === genericModal) {
        genericModal.classList.remove("active");
      }
    });
  },

  handleWsMessage(data) {
    if (!data) return;

    if (data.type === "agent_status_update" && window.AvatarsManager) {
      window.AvatarsManager.updateSingleAgent(
        data.agent_id,
        data.status,
        data.tag_text,
        data.tag_color,
        data.description_text
      );
    }
  }
};

window.OrbApp = OrbApp;

// Auto-boot application on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  OrbApp.init();
});
