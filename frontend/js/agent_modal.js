/* ==========================================================================
   ORB - EXPANDED AGENT DASHBOARD & DOMAIN VIEWS
   ========================================================================== */

const AgentModalManager = {
  currentAgent: null,
  activeMemoryTab: "per_agent", // 'per_agent' or 'shared'
  cachedDetail: null,

  init() {
    this.setupListeners();
  },

  async open(agentId) {
    const overlay = document.getElementById("agentExpandedOverlay");
    if (!overlay) return;

    try {
      const data = await window.API?.getAgentDetail(agentId);
      this.currentAgent = data?.agent || window.DEFAULT_AGENTS?.find(a => a.id === agentId) || window.DEFAULT_AGENTS?.[0];
      this.cachedDetail = data;

      this.renderAgentHeader();
      this.renderDomainWidgets();
      this.renderMemories();
      this.renderChatHistory();

      overlay.classList.add("active");
    } catch (e) {
      console.warn("Fallback to offline agent detail:", e);
      this.currentAgent = window.DEFAULT_AGENTS?.find(a => a.id === agentId) || window.DEFAULT_AGENTS?.[0];
      this.renderAgentHeader();
      this.renderDomainWidgets();
      overlay.classList.add("active");
    }
  },

  close() {
    const overlay = document.getElementById("agentExpandedOverlay");
    if (overlay) overlay.classList.remove("active");
  },

  renderAgentHeader() {
    if (!this.currentAgent) return;
    const heroImg = document.getElementById("sheetAgentAvatarImg");
    const nameEl = document.getElementById("sheetAgentName");
    const roleEl = document.getElementById("sheetAgentRole");
    const statusTag = document.getElementById("sheetAgentStatusTag");
    const descEl = document.getElementById("sheetAgentDesc");

    const avatarSrc = window.resolveOrbAsset ? window.resolveOrbAsset(this.currentAgent.avatar_image) : (this.currentAgent.avatar_image || './assets/avatar_fin.png');

    if (heroImg) heroImg.src = avatarSrc;
    if (nameEl) nameEl.textContent = this.currentAgent.name;
    if (roleEl) roleEl.textContent = this.currentAgent.role;
    if (statusTag) {
      statusTag.textContent = `${this.currentAgent.tag_text || this.currentAgent.status}`;
      statusTag.style.backgroundColor = this.currentAgent.tag_color || "#10B981";
    }
    if (descEl) descEl.textContent = this.currentAgent.personality;
  },

  renderDomainWidgets() {
    const container = document.getElementById("sheetDomainWidgetsContainer");
    if (!container || !this.currentAgent) return;

    const domain = this.currentAgent.domain;
    let html = "";

    switch (domain) {
      case "finance":
        html = `
          <div class="domain-widget-card">
            <h4>SAVINGS GOAL</h4>
            <div class="metric-value">Rp 850.000</div>
            <div style="font-size: 0.7rem; color: #10B981; font-weight: 700; margin-top: 4px;">85% of Rp 1 juta target</div>
          </div>
          <div class="domain-widget-card">
            <h4>DAILY BURN</h4>
            <div class="metric-value">Rp 45.200</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">Well under safe margin</div>
          </div>
        `;
        break;

      case "travel":
        html = `
          <div class="domain-widget-card">
            <h4>FLIGHT CORRIDOR</h4>
            <div class="metric-value">DPS ✈️ CGK</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">Morning departure • On Time</div>
          </div>
          <div class="domain-widget-card">
            <h4>SEAT PREFERENCE</h4>
            <div class="metric-value">Window 12A</div>
            <div style="font-size: 0.7rem; color: #3B82F6; font-weight: 700; margin-top: 4px;">Auto-checkin active</div>
          </div>
        `;
        break;

      case "analytics":
        html = `
          <div class="domain-widget-card">
            <h4>CONVERSION</h4>
            <div class="metric-value">4.82%</div>
            <div style="font-size: 0.7rem; color: #10B981; font-weight: 700; margin-top: 4px;">+0.6% this week</div>
          </div>
          <div class="domain-widget-card">
            <h4>ACTIVE RETENTION</h4>
            <div class="metric-value">91.4%</div>
            <div style="font-size: 0.7rem; color: #8B5CF6; font-weight: 700; margin-top: 4px;">Above target</div>
          </div>
        `;
        break;

      default:
        html = `
          <div class="domain-widget-card">
            <h4>STATUS</h4>
            <div class="metric-value">${this.currentAgent.status.toUpperCase()}</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">${this.currentAgent.description_text || 'Ready'}</div>
          </div>
          <div class="domain-widget-card">
            <h4>VELOCITY</h4>
            <div class="metric-value">100%</div>
            <div style="font-size: 0.7rem; color: #10B981; font-weight: 700; margin-top: 4px;">Operational</div>
          </div>
        `;
        break;
    }

    container.innerHTML = html;
  },

  renderMemories() {
    const list = document.getElementById("sheetMemoryList");
    if (!list) return;

    const memories = this.cachedDetail?.memories || [
      { id: 1, memory_type: "per_agent", content: `Specialized directive for ${this.currentAgent?.name}: High precision execution.` },
      { id: 2, memory_type: "shared", content: "Team Policy: Real-time synchronization across Orb domains." }
    ];

    const filtered = memories.filter(m => m.memory_type === this.activeMemoryTab);
    list.innerHTML = "";

    if (filtered.length === 0) {
      list.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 12px;">No memories in this tab.</div>`;
      return;
    }

    filtered.forEach(m => {
      const bubble = document.createElement("div");
      bubble.className = "memory-bubble";
      bubble.textContent = m.content;
      list.appendChild(bubble);
    });
  },

  renderChatHistory() {
    const log = document.getElementById("sheetChatLog");
    if (!log) return;

    log.innerHTML = `
      <div class="chat-bubble agent">
        Hello! I'm <strong>${this.currentAgent?.name}</strong> (${this.currentAgent?.role}). How can I assist you right now?
      </div>
    `;
  },

  setupListeners() {
    const closeBtn = document.getElementById("sheetCloseBtn");
    closeBtn?.addEventListener("click", () => this.close());

    const overlay = document.getElementById("agentExpandedOverlay");
    overlay?.addEventListener("click", (e) => {
      if (e.target === overlay) this.close();
    });

    const tabPer = document.getElementById("tabPerAgentMemory");
    const tabShared = document.getElementById("tabSharedMemory");

    tabPer?.addEventListener("click", () => {
      this.activeMemoryTab = "per_agent";
      tabPer.classList.add("active");
      tabShared?.classList.remove("active");
      this.renderMemories();
    });

    tabShared?.addEventListener("click", () => {
      this.activeMemoryTab = "shared";
      tabShared.classList.add("active");
      tabPer?.classList.remove("active");
      this.renderMemories();
    });

    // Send direct chat
    const sendBtn = document.getElementById("sheetChatSendBtn");
    const inputEl = document.getElementById("sheetChatInput");

    const doSend = async () => {
      const text = inputEl?.value.trim();
      if (!text) return;

      const log = document.getElementById("sheetChatLog");
      if (log) {
        const uBubble = document.createElement("div");
        uBubble.className = "chat-bubble user";
        uBubble.textContent = text;
        log.appendChild(uBubble);
        inputEl.value = "";

        const res = await window.API?.sendChat(this.currentAgent.id, text);
        const aBubble = document.createElement("div");
        aBubble.className = "chat-bubble agent";
        aBubble.textContent = res.text;
        log.appendChild(aBubble);
        log.scrollTop = log.scrollHeight;
      }
    };

    sendBtn?.addEventListener("click", doSend);
    inputEl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSend();
    });
  }
};

window.AgentModalManager = AgentModalManager;
