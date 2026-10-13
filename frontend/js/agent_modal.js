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

    // Fetch full agent detail
    try {
      const data = await window.API?.getAgentDetail(agentId);
      this.currentAgent = data.agent;
      this.cachedDetail = data;

      this.renderAgentHeader();
      this.renderDomainWidgets();
      this.renderMemories();
      this.renderChatHistory();

      overlay.classList.add("active");
    } catch (e) {
      console.error("Failed to load agent detail:", e);
    }
  },

  close() {
    const overlay = document.getElementById("agentExpandedOverlay");
    if (overlay) overlay.classList.remove("active");
  },

  renderAgentHeader() {
    const heroImg = document.getElementById("sheetAgentAvatarImg");
    const nameEl = document.getElementById("sheetAgentName");
    const roleEl = document.getElementById("sheetAgentRole");
    const statusTag = document.getElementById("sheetAgentStatusTag");
    const descEl = document.getElementById("sheetAgentDesc");

    const base = window.API?.basePath || '';
    const avatarSrc = this.currentAgent.avatar_image.startsWith('/') 
      ? `${base}${this.currentAgent.avatar_image}` 
      : `${base}/${this.currentAgent.avatar_image}`;

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
    if (!container) return;

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

      case "communication":
        html = `
          <div class="domain-widget-card">
            <h4>SENTIMENT</h4>
            <div class="metric-value">94.8%</div>
            <div style="font-size: 0.7rem; color: #10B981; font-weight: 700; margin-top: 4px;">High customer satisfaction</div>
          </div>
          <div class="domain-widget-card">
            <h4>ACTIVE QUEUE</h4>
            <div class="metric-value">3 Tickets</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">Average response: 42s</div>
          </div>
        `;
        break;

      case "analytics":
        html = `
          <div class="domain-widget-card">
            <h4>CONVERSION</h4>
            <div class="metric-value">+4.8%</div>
            <div style="font-size: 0.7rem; color: #8B5CF6; font-weight: 700; margin-top: 4px;">Week-over-week lift</div>
          </div>
          <div class="domain-widget-card">
            <h4>ACTIVE SESSIONS</h4>
            <div class="metric-value">1,420</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">Steady organic growth</div>
          </div>
        `;
        break;

      case "marketing":
        html = `
          <div class="domain-widget-card">
            <h4>OUTREACH HOOK</h4>
            <div class="metric-value">Viral 3.2x</div>
            <div style="font-size: 0.7rem; color: #F97316; font-weight: 700; margin-top: 4px;">Targeting outside sales</div>
          </div>
          <div class="domain-widget-card">
            <h4>CLICK RATE</h4>
            <div class="metric-value">11.4%</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">Above industry average</div>
          </div>
        `;
        break;

      default:
        html = `
          <div class="domain-widget-card">
            <h4>DOMAIN STATUS</h4>
            <div class="metric-value">${domain.toUpperCase()}</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">All systems nominal</div>
          </div>
          <div class="domain-widget-card">
            <h4>WORKFLOW SYNC</h4>
            <div class="metric-value">CrewAI Active</div>
            <div style="font-size: 0.7rem; color: #10B981; font-weight: 700; margin-top: 4px;">Orchestrator ready</div>
          </div>
        `;
        break;
    }

    container.innerHTML = html;
  },

  renderMemories() {
    const listEl = document.getElementById("sheetMemoryList");
    if (!listEl || !this.cachedDetail) return;

    const memories = this.cachedDetail.memories || [];
    const filtered = memories.filter(m => m.memory_type === this.activeMemoryTab);

    if (filtered.length === 0) {
      listEl.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">No memories in this category yet.</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(m => `
      <div class="memory-bubble">
        <span style="font-weight: 700; text-transform: uppercase; font-size: 0.65rem; color: var(--text-secondary);">${m.category}:</span>
        ${m.content}
      </div>
    `).join("");
  },

  renderChatHistory() {
    const logEl = document.getElementById("sheetChatLog");
    if (!logEl || !this.cachedDetail) return;

    const messages = this.cachedDetail.messages || [];
    if (messages.length === 0) {
      logEl.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic; text-align: center;">Say hello to start pairing with ${this.currentAgent.name}!</div>`;
      return;
    }

    logEl.innerHTML = messages.map(m => `
      <div class="chat-bubble ${m.sender}">
        ${m.text}
      </div>
    `).join("");

    logEl.scrollTop = logEl.scrollHeight;
  },

  setupListeners() {
    // Sheet close button & backdrop click
    document.getElementById("sheetCloseBtn")?.addEventListener("click", () => this.close());
    document.getElementById("agentExpandedOverlay")?.addEventListener("click", (e) => {
      if (e.target.id === "agentExpandedOverlay") this.close();
    });

    // Memory tabs
    document.getElementById("tabPerAgentMemory")?.addEventListener("click", () => {
      this.activeMemoryTab = "per_agent";
      document.getElementById("tabPerAgentMemory").classList.add("active");
      document.getElementById("tabSharedMemory").classList.remove("active");
      this.renderMemories();
    });

    document.getElementById("tabSharedMemory")?.addEventListener("click", () => {
      this.activeMemoryTab = "shared";
      document.getElementById("tabSharedMemory").classList.add("active");
      document.getElementById("tabPerAgentMemory").classList.remove("active");
      this.renderMemories();
    });

    // Add memory button
    document.getElementById("sheetAddMemoryBtn")?.addEventListener("click", async () => {
      const input = prompt(`Add a new ${this.activeMemoryTab === 'shared' ? 'Shared Crew' : 'Per-Agent'} memory:`);
      if (input && input.trim()) {
        await window.API?.addMemory({
          agent_id: this.currentAgent.id,
          memory_type: this.activeMemoryTab,
          category: "preference",
          content: input.trim()
        });
        // Refresh detail
        const data = await window.API?.getAgentDetail(this.currentAgent.id);
        this.cachedDetail = data;
        this.renderMemories();
      }
    });

    // Modal chat send
    const modalInput = document.getElementById("sheetChatInput");
    const modalSend = document.getElementById("sheetChatSendBtn");

    const sendMsg = async () => {
      const text = modalInput.value.trim();
      if (!text || !this.currentAgent) return;
      modalInput.value = "";

      // Append user bubble immediately
      const logEl = document.getElementById("sheetChatLog");
      if (logEl) {
        logEl.innerHTML += `<div class="chat-bubble user">${text}</div>`;
        logEl.scrollTop = logEl.scrollHeight;
      }

      const res = await window.API?.sendChat(this.currentAgent.id, text);
      if (logEl && res) {
        logEl.innerHTML += `<div class="chat-bubble agent">${res.text}</div>`;
        logEl.scrollTop = logEl.scrollHeight;
      }
    };

    modalSend?.addEventListener("click", sendMsg);
    modalInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMsg();
    });
  }
};

window.AgentModalManager = AgentModalManager;
