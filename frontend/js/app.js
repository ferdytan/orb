/* ==========================================================================
   ORB - MAIN APPLICATION CONTROLLER
   ========================================================================== */

const OrbApp = {
  currentLighting: "morning", // 'morning', 'noon', 'evening', 'night'
  currentTheme: "light",     // 'light', 'dark'
  isAutoLighting: false,
  isPhoneFrame: true,

  async init() {
    console.log("🚀 Initializing Orb Virtual Office...");

    this.setupClock();
    this.setupGlobalControls();
    this.setupModals();

    // 1. Fetch initial data
    try {
      const [agents, goals, wallet, talents, collections, lighting] = await Promise.all([
        window.API.getAgents(),
        window.API.getGoals(),
        window.API.getWallet(),
        window.API.getTalents(),
        window.API.getCollections(),
        window.API.getLighting()
      ]);

      // 2. Apply lighting & theme
      if (lighting) {
        this.currentLighting = lighting.time_of_day || "morning";
        this.currentTheme = lighting.theme_mode || "light";
        this.isAutoLighting = lighting.auto || false;
      }
      this.applyLighting(this.currentLighting, false);
      this.applyTheme(this.currentTheme);

      // 3. Initialize UI subsystems
      window.AvatarsManager.init(agents);
      window.BentoManager.init({ goals, wallet, talents, collections });
      window.AgentModalManager.init();

      // Find initial active agent (e.g., 'fin')
      const initialAgent = agents.find(a => a.id === "fin") || agents[0];
      window.ChatManager.init(initialAgent);

      // 4. Connect WebSocket for live push updates
      window.API.initWebSocket((data) => this.handleWsMessage(data));

    } catch (e) {
      console.error("Failed to load initial Orb system data:", e);
    }
  },

  setupClock() {
    const updateTime = () => {
      const clockEl = document.getElementById("deviceClockText");
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }

      if (this.isAutoLighting) {
        this.autoSyncLightingWithHour();
      }
    };
    updateTime();
    setInterval(updateTime, 30000);
  },

  autoSyncLightingWithHour() {
    const hour = new Date().getHours();
    let determined = "morning";
    if (hour >= 6 && hour < 11) determined = "morning";
    else if (hour >= 11 && hour < 16) determined = "noon";
    else if (hour >= 16 && hour < 19) determined = "evening";
    else determined = "night";

    if (determined !== this.currentLighting) {
      this.applyLighting(determined, true);
    }
  },

  setupGlobalControls() {
    // Lighting buttons
    const lightingBtns = document.querySelectorAll(".lighting-btn");
    lightingBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.lighting;
        if (mode === "auto") {
          this.isAutoLighting = !this.isAutoLighting;
          btn.classList.toggle("active", this.isAutoLighting);
          if (this.isAutoLighting) this.autoSyncLightingWithHour();
        } else {
          this.isAutoLighting = false;
          document.querySelector('.lighting-btn[data-lighting="auto"]')?.classList.remove("active");
          this.applyLighting(mode, true);
        }
      });
    });

    // Theme toggle button
    const themeBtn = document.getElementById("globalThemeToggleBtn");
    themeBtn?.addEventListener("click", () => {
      const nextTheme = this.currentTheme === "light" ? "dark" : "light";
      this.applyTheme(nextTheme);
      window.API.setLighting({
        time_of_day: this.currentLighting,
        theme_mode: nextTheme,
        auto: this.isAutoLighting
      });
    });

    // Handheld Frame vs Fullscreen toggle
    const viewBtn = document.getElementById("globalViewToggleBtn");
    const shell = document.querySelector(".handheld-shell");
    viewBtn?.addEventListener("click", () => {
      this.isPhoneFrame = !this.isPhoneFrame;
      shell?.classList.toggle("expanded-fullscreen", !this.isPhoneFrame);
      viewBtn.innerHTML = this.isPhoneFrame ? `<span>📱</span> Frame` : `<span>🖥️</span> Expanded`;
    });
  },

  applyLighting(mode, notifyServer = true) {
    this.currentLighting = mode;

    // Update active button
    document.querySelectorAll(".lighting-btn:not([data-lighting='auto'])").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lighting === mode);
    });

    // Update backdrop background image & CSS classes
    const backdrop = document.getElementById("officeBackdropLayer");
    const scene = document.querySelector(".office-header-scene");
    if (!backdrop || !scene) return;

    // Remove existing lighting classes
    scene.classList.remove("lighting-morning", "lighting-noon", "lighting-evening", "lighting-night");
    scene.classList.add(`lighting-${mode}`);

    // Map image assets
    const base = window.API?.basePath || '';
    const images = {
      morning: `${base}/assets/office_morning.jpg`,
      noon: `${base}/assets/office_noon.jpg`,
      evening: `${base}/assets/office_evening.jpg`,
      night: `${base}/assets/office_night.jpg`
    };

    backdrop.style.backgroundImage = `url('${images[mode] || images.morning}')`;

    if (notifyServer) {
      window.API.setLighting({
        time_of_day: mode,
        theme_mode: this.currentTheme,
        auto: this.isAutoLighting
      });
    }
  },

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    const themeBtn = document.getElementById("globalThemeToggleBtn");
    if (themeBtn) {
      themeBtn.innerHTML = theme === "light" ? `<span>☀️</span> Light` : `<span>🌙</span> Dark`;
    }
  },

  setupModals() {
    const modal = document.getElementById("genericOrbModal");
    const closeBtn = document.getElementById("genericModalCloseBtn");

    closeBtn?.addEventListener("click", () => {
      modal?.classList.remove("active");
    });

    modal?.addEventListener("click", (e) => {
      if (e.target.id === "genericOrbModal") {
        modal.classList.remove("active");
      }
    });
  },

  handleWsMessage(data) {
    console.log("WebSocket event received:", data.type, data);

    switch (data.type) {
      case "agent_status":
        window.AvatarsManager.updateSingleAgent(
          data.agent_id,
          data.status,
          data.tag_text,
          data.tag_color,
          data.description_text
        );
        break;

      case "goals_updated":
        window.API.getGoals().then(goals => {
          window.BentoManager.goals = goals;
          window.BentoManager.renderGoalWidget();
        });
        break;

      case "wallet_updated":
        window.BentoManager.wallet = data.wallet;
        window.BentoManager.renderWalletWidget();
        break;

      case "lighting_changed":
        if (data.lighting) {
          this.applyLighting(data.lighting.time_of_day, false);
          this.applyTheme(data.lighting.theme_mode);
        }
        break;

      case "chat_response":
        // Show response in active view
        window.ChatManager.showToast(data.agent_id.toUpperCase(), data.text);
        break;
    }
  }
};

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  OrbApp.init();
});

window.OrbApp = OrbApp;
