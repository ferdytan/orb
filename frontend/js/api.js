/* ==========================================================================
   ORB - API & WEBSOCKET CLIENT
   ========================================================================== */

const API = {
  baseUrl: window.location.origin,
  ws: null,
  wsListeners: [],

  // WebSocket Management
  initWebSocket(onMessageCallback) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("⚡ Orb WebSocket connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessageCallback) onMessageCallback(data);
          this.wsListeners.forEach(listener => listener(data));
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket closed. Reconnecting in 2s...");
        setTimeout(() => this.initWebSocket(onMessageCallback), 2000);
      };

      this.ws.onerror = (err) => {
        console.warn("WebSocket encounter error", err);
      };
    } catch (e) {
      console.error("Could not initialize WebSocket:", e);
    }
  },

  addWsListener(fn) {
    this.wsListeners.push(fn);
  },

  sendWs(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  },

  // REST API Methods
  async getAgents() {
    const res = await fetch(`${this.baseUrl}/api/agents`);
    return await res.json();
  },

  async getAgentDetail(agentId) {
    const res = await fetch(`${this.baseUrl}/api/agents/${agentId}`);
    return await res.json();
  },

  async updateAgentStatus(agentId, statusData) {
    const res = await fetch(`${this.baseUrl}/api/agents/${agentId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(statusData)
    });
    return await res.json();
  },

  async getGoals() {
    const res = await fetch(`${this.baseUrl}/api/goals`);
    return await res.json();
  },

  async updateGoal(goalId, updateData) {
    const res = await fetch(`${this.baseUrl}/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData)
    });
    return await res.json();
  },

  async createGoal(goalData) {
    const res = await fetch(`${this.baseUrl}/api/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goalData)
    });
    return await res.json();
  },

  async getMemories(agentId = null) {
    const url = agentId ? `${this.baseUrl}/api/memory?agent_id=${agentId}` : `${this.baseUrl}/api/memory`;
    const res = await fetch(url);
    return await res.json();
  },

  async addMemory(memoryData) {
    const res = await fetch(`${this.baseUrl}/api/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memoryData)
    });
    return await res.json();
  },

  async getWallet() {
    const res = await fetch(`${this.baseUrl}/api/wallet`);
    return await res.json();
  },

  async updateWallet(walletData) {
    const res = await fetch(`${this.baseUrl}/api/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(walletData)
    });
    return await res.json();
  },

  async getTalents() {
    const res = await fetch(`${this.baseUrl}/api/talents`);
    return await res.json();
  },

  async getCollections() {
    const res = await fetch(`${this.baseUrl}/api/collections`);
    return await res.json();
  },

  async sendChat(agentId, message) {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: agentId, message: message })
    });
    return await res.json();
  },

  async getLighting() {
    const res = await fetch(`${this.baseUrl}/api/lighting`);
    return await res.json();
  },

  async setLighting(lightingData) {
    const res = await fetch(`${this.baseUrl}/api/lighting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lightingData)
    });
    return await res.json();
  }
};

window.API = API;
