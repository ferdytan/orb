/* ==========================================================================
   ORB - EXECUTIVE DESK HERO STAGE (FIN & WELLY COLLABORATION)
   Zero dummy avatars. Fin (Finance) & Welly (Wealth) plush characters.
   ========================================================================== */

const AvatarsManager = {
  finData: null,
  wellyData: null,

  init(agentsData = null) {
    console.log("🛋️ Initializing Executive Desk Stage (Fin & Welly)...");
    if (Array.isArray(agentsData) && agentsData.length > 0) {
      this.finData = agentsData.find(a => a.id === "fin") || window.DEFAULT_AGENTS[0];
      this.wellyData = agentsData.find(a => a.id === "welly") || window.DEFAULT_AGENTS[1];
    } else {
      this.finData = window.DEFAULT_AGENTS[0];
      this.wellyData = window.DEFAULT_AGENTS[1];
    }

    this.render();
  },

  updateAgentStatus(agentId, status, tagText, tagColor, descText) {
    const target = (agentId === "welly") ? this.wellyData : this.finData;
    if (target) {
      if (status) target.status = status;
      if (tagText) target.tag_text = tagText;
      if (tagColor) target.tag_color = tagColor;
      if (descText) target.description_text = descText;
      this.render();
    }
  },

  render() {
    const fin = this.finData || window.DEFAULT_AGENTS[0];
    const welly = this.wellyData || window.DEFAULT_AGENTS[1];
    const deskContainer = document.getElementById("finDeskHeroContainer");
    if (!deskContainer) return;

    const finAvatarSrc = "./assets/avatar_fin_360.png";
    const wellyAvatarSrc = "./assets/avatar_welly_360.png";

    deskContainer.innerHTML = `
      <div class="hero-desk-dual-grid">
        <!-- Fin Desk Card -->
        <div class="fin-hero-desk-card" id="heroDeskFin" title="Klik untuk membuka Fin Finance Workspace">
          <div class="fin-hero-status-bar">
            <div class="fin-status-capsule status-${fin.status || 'active'}">
              <span class="fin-status-dot"></span>
              <span>${fin.tag_text || 'Online 🟢'}</span>
            </div>
            <div class="fin-workspace-chip">
              <span>Fin</span>
              <span class="fin-chip-arrow">↗</span>
            </div>
          </div>

          <div class="fin-character-stage">
            <img 
              src="${finAvatarSrc}" 
              alt="Fin Personal Finance" 
              class="fin-hero-plush-img" 
              fetchpriority="high"
              decoding="async"
            />
            <div class="fin-contact-shadow"></div>
          </div>

          <div class="fin-hero-meta-row">
            <div class="fin-hero-name-col">
              <span class="fin-hero-name">Fin</span>
              <span class="fin-hero-role">Personal Finance</span>
            </div>
            <div class="fin-hero-note-bubble">
              <span class="fin-bubble-icon">💰</span>
              <span class="fin-bubble-text">
                ${fin.description_text || 'Catat arus kas & budget harian'}
              </span>
            </div>
          </div>
        </div>

        <!-- Welly Desk Card -->
        <div class="fin-hero-desk-card welly-desk-card" id="heroDeskWelly" title="Klik untuk membuka Welly Wealth Workspace">
          <div class="fin-hero-status-bar">
            <div class="fin-status-capsule status-${welly.status || 'active'}" style="background: rgba(59, 130, 246, 0.15); color: #3B82F6;">
              <span class="fin-status-dot" style="background: #3B82F6;"></span>
              <span>${welly.tag_text || 'Online 🟢'}</span>
            </div>
            <div class="fin-workspace-chip" style="color: #60A5FA; background: rgba(59, 130, 246, 0.15);">
              <span>Welly</span>
              <span class="fin-chip-arrow">↗</span>
            </div>
          </div>

          <div class="fin-character-stage">
            <img 
              src="${wellyAvatarSrc}" 
              alt="Welly Wealth Planning" 
              class="fin-hero-plush-img" 
              fetchpriority="high"
              decoding="async"
            />
            <div class="fin-contact-shadow"></div>
          </div>

          <div class="fin-hero-meta-row">
            <div class="fin-hero-name-col">
              <span class="fin-hero-name">Welly</span>
              <span class="fin-hero-role">Wealth & Planning</span>
            </div>
            <div class="fin-hero-note-bubble">
              <span class="fin-bubble-icon">📈</span>
              <span class="fin-bubble-text">
                ${welly.description_text || 'Kapasitas & alokasi masa depan'}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("heroDeskFin")?.addEventListener("click", () => {
      window.location.hash = "#fin";
    });

    document.getElementById("heroDeskWelly")?.addEventListener("click", () => {
      window.location.hash = "#welly";
    });
  }
};

window.AvatarsManager = AvatarsManager;
