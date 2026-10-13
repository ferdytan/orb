/* ==========================================================================
   ORB - AVATARS RENDERER & INTERACTION MANAGER
   ========================================================================== */

const AvatarsManager = {
  agents: [],
  selectedAgentId: "fin", // Default active agent
  isCompactMode: false,
  currentIndex: 0,

  init(agentsData) {
    this.agents = agentsData;
    this.render();
    this.setupListeners();
  },

  updateAgents(agentsData) {
    this.agents = agentsData;
    this.render();
  },

  updateSingleAgent(agentId, status, tagText, tagColor, descText) {
    const agent = this.agents.find(a => a.id === agentId);
    if (agent) {
      agent.status = status;
      if (tagText) agent.tag_text = tagText;
      if (tagColor) agent.tag_color = tagColor;
      if (descText) agent.description_text = descText;
      this.render();
      
      // Also update bottom floating chat if selected
      if (this.selectedAgentId === agentId) {
        window.ChatManager?.updateActiveAgent(agent);
      }
    }
  },

  toggleCompactMode() {
    this.isCompactMode = !this.isCompactMode;
    const track = document.getElementById("avatarsCarouselTrack");
    const toggleBtn = document.getElementById("avatarViewToggleBtn");
    
    if (this.isCompactMode) {
      track.classList.add("compact-grid-mode");
      if (toggleBtn) toggleBtn.innerHTML = `<span>◫</span> View Carousel`;
    } else {
      track.classList.remove("compact-grid-mode");
      if (toggleBtn) toggleBtn.innerHTML = `<span>▦</span> All 10`;
    }
    this.updatePagination();
  },

  render() {
    const track = document.getElementById("avatarsCarouselTrack");
    if (!track) return;

    track.innerHTML = "";

    this.agents.forEach((agent, index) => {
      const card = document.createElement("div");
      card.className = `avatar-actor-card ${agent.id === this.selectedAgentId ? 'is-selected' : ''}`;
      card.dataset.agentId = agent.id;
      card.dataset.index = index;

      // Status pill color class
      let statusClass = `status-${agent.status}`;
      if (!['active', 'listening', 'routing', 'idle'].includes(agent.status)) {
        statusClass = 'status-active';
      }

      const base = window.API?.basePath || '';
      const avatarSrc = agent.avatar_image.startsWith('/') 
        ? `${base}${agent.avatar_image}` 
        : `${base}/${agent.avatar_image}`;

      card.innerHTML = `
        <div class="avatar-status-pill ${statusClass}" style="background-color: ${agent.tag_color || ''};">
          ${agent.tag_text || agent.status}
        </div>
        <div class="avatar-figure-frame">
          <img src="${avatarSrc}" alt="${agent.name}" class="avatar-img-plush" loading="lazy" />
        </div>
        <div class="avatar-meta-capsule">
          <div class="avatar-title-row">
            ${agent.name}
          </div>
          <div class="avatar-activity-desc">
            <span>${agent.description_icon}</span>
            <span>${agent.description_text}</span>
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        this.selectAgent(agent.id);
        window.AgentModalManager?.open(agent.id);
      });

      track.appendChild(card);
    });

    this.updatePagination();
  },

  selectAgent(agentId) {
    this.selectedAgentId = agentId;
    document.querySelectorAll(".avatar-actor-card").forEach(el => {
      el.classList.toggle("is-selected", el.dataset.agentId === agentId);
    });

    const agent = this.agents.find(a => a.id === agentId);
    if (agent && window.ChatManager) {
      window.ChatManager.updateActiveAgent(agent);
    }
  },

  setupListeners() {
    const track = document.getElementById("avatarsCarouselTrack");
    if (track) {
      track.addEventListener("scroll", () => {
        this.handleScroll();
      }, { passive: true });
    }

    const toggleBtn = document.getElementById("avatarViewToggleBtn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => this.toggleCompactMode());
    }
  },

  handleScroll() {
    if (this.isCompactMode) return;
    const track = document.getElementById("avatarsCarouselTrack");
    if (!track) return;
    const cardWidth = track.firstElementChild ? track.firstElementChild.offsetWidth + 8 : 120;
    const scrollPos = track.scrollLeft;
    const page = Math.round(scrollPos / (cardWidth * 3));
    this.setPaginationIndex(page);
  },

  setPaginationIndex(index) {
    this.currentIndex = index;
    const dots = document.querySelectorAll(".carousel-dot");
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  },

  updatePagination() {
    const container = document.getElementById("carouselDotsIndicator");
    if (!container) return;

    if (this.isCompactMode) {
      container.innerHTML = "";
      return;
    }

    // Usually 10 agents / 3 per page = ~4 pagination pages
    const numPages = Math.ceil(this.agents.length / 3);
    container.innerHTML = "";

    for (let i = 0; i < numPages; i++) {
      const dot = document.createElement("div");
      dot.className = `carousel-dot ${i === this.currentIndex ? 'active' : ''}`;
      dot.addEventListener("click", () => {
        const track = document.getElementById("avatarsCarouselTrack");
        if (track && track.firstElementChild) {
          const cardWidth = track.firstElementChild.offsetWidth + 8;
          track.scrollTo({ left: i * cardWidth * 3, behavior: "smooth" });
        }
      });
      container.appendChild(dot);
    }
  }
};

window.AvatarsManager = AvatarsManager;
