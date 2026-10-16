/* ==========================================================================
   ORB - FIN HERO DESK STAGE (SINGLE ACTIVE AGENT ARCHITECTURE)
   Zero dummy avatars. Instant first-screen shell rendering.
   ========================================================================== */

const AvatarsManager = {
  finData: null,

  init(agentsData = null) {
    console.log("🛋️ Initializing Fin Hero Desk Stage...");
    if (Array.isArray(agentsData) && agentsData.length > 0) {
      this.finData = agentsData.find(a => a.id === "fin") || agentsData[0];
    } else {
      this.finData = window.DEFAULT_AGENTS[0];
    }

    this.render();
    this.setupListeners();
  },

  updateAgentStatus(status, tagText, tagColor, descText) {
    if (!this.finData) this.finData = window.DEFAULT_AGENTS[0];
    if (status) this.finData.status = status;
    if (tagText) this.finData.tag_text = tagText;
    if (tagColor) this.finData.tag_color = tagColor;
    if (descText) this.finData.description_text = descText;
    this.render();
  },

  render() {
    const fin = this.finData || window.DEFAULT_AGENTS[0];
    const deskContainer = document.getElementById("finDeskHeroContainer");
    if (!deskContainer) return;

    const avatarSrc = "./assets/avatar_fin_360.png";

    deskContainer.innerHTML = `
      <div class="fin-hero-desk-card" id="finHeroDeskCard" title="Klik untuk membuka Fin Finance Workspace">
        <!-- Status Pill -->
        <div class="fin-hero-status-bar">
          <div class="fin-status-capsule status-${fin.status || 'active'}">
            <span class="fin-status-dot"></span>
            <span>${fin.tag_text || 'Online • Aktif'}</span>
          </div>
          <div class="fin-workspace-chip">
            <span>Buka Workspace</span>
            <span class="fin-chip-arrow">↗</span>
          </div>
        </div>

        <!-- 3D Character Stage & Shadow -->
        <div class="fin-character-stage">
          <img 
            src="${avatarSrc}" 
            alt="Fin Personal Finance" 
            class="fin-hero-plush-img" 
            fetchpriority="high"
            decoding="async"
          />
          <div class="fin-contact-shadow"></div>
        </div>

        <!-- Meta Capsule & Activity Note -->
        <div class="fin-hero-meta-row">
          <div class="fin-hero-name-col">
            <span class="fin-hero-name">Fin</span>
            <span class="fin-hero-role">Personal Finance Specialist</span>
          </div>
          <div class="fin-hero-note-bubble">
            <span class="fin-bubble-icon">💰</span>
            <span class="fin-bubble-text" id="finDeskActivityText">
              ${fin.description_text || 'Menganalisis arus kas & mendampingi anggaran'}
            </span>
          </div>
        </div>
      </div>
    `;

    document.getElementById("finHeroDeskCard")?.addEventListener("click", () => {
      window.location.hash = "#fin";
    });
  },

  setupListeners() {
    // Stage listeners if needed
  }
};

window.AvatarsManager = AvatarsManager;
