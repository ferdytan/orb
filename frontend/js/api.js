/* ==========================================================================
   ORB - API & WEBSOCKET CLIENT (WITH OFFLINE/RESILIENT FALLBACKS)
   ========================================================================== */

const getBasePath = () => {
  return window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
};

// Fallback seed data so the UI NEVER breaks even when backend is restarting or offline
const DEFAULT_AGENTS = [
  {
    id: "fin",
    name: "Fin",
    role: "Finance & Budgeting",
    domain: "finance",
    status: "active",
    tag_text: "active",
    tag_color: "#10B981",
    description_icon: "💰",
    description_text: "Tracking budget & wallet",
    avatar_image: "./assets/avatar_fin.png",
    personality: "Energetic, cheerful accountant plush. Loves spreadsheets, tracking savings goals, and calculating runway.",
    color_theme: "#DCFCE7",
    sort_order: 1
  },
  {
    id: "nova",
    name: "Nova",
    role: "Analytics & Intelligence",
    domain: "analytics",
    status: "active",
    tag_text: "active",
    tag_color: "#8B5CF6",
    description_icon: "📊",
    description_text: "Crunching metrics & goals",
    avatar_image: "./assets/avatar_nova.png",
    personality: "Cozy intellectual wearing retro glasses. Loves graphs, conversion rates, and coffee.",
    color_theme: "#F3E8FF",
    sort_order: 2
  },
  {
    id: "muse",
    name: "Muse",
    role: "Executive Travel & Concierge",
    domain: "travel",
    status: "active",
    tag_text: "active",
    tag_color: "#3B82F6",
    description_icon: "✈️",
    description_text: "Flight tracking Bali -> JKT",
    avatar_image: "./assets/avatar_muse.png",
    personality: "Gentle, worldly bear with aviator scarf. Manages boarding passes, flight perks, and hotel itineraries.",
    color_theme: "#DBEAFE",
    sort_order: 3
  },
  {
    id: "chat",
    name: "Chat",
    role: "Communication & Concierge",
    domain: "communication",
    status: "active",
    tag_text: "active",
    tag_color: "#EC4899",
    description_icon: "💬",
    description_text: "Monitoring team inbox",
    avatar_image: "./assets/avatar_chat.png",
    personality: "Bubbly, warm rabbit with golden antenna. Routes correspondence, drafts meeting notes, and welcomes guests.",
    color_theme: "#FCE7F3",
    sort_order: 4
  },
  {
    id: "blaze",
    name: "Blaze",
    role: "Growth & Marketing",
    domain: "marketing",
    status: "active",
    tag_text: "active",
    tag_color: "#F97316",
    description_icon: "🚀",
    description_text: "Drafting campaigns",
    avatar_image: "./assets/avatar_blaze.png",
    personality: "High-octane fox wearing cyber visor. Drives social outreach, viral campaigns, and funnels.",
    color_theme: "#FFEDD5",
    sort_order: 5
  },
  {
    id: "sage",
    name: "Sage",
    role: "Strategy & Sprint Planning",
    domain: "strategy",
    status: "idle",
    tag_text: "idle",
    tag_color: "#6B7280",
    description_icon: "🌱",
    description_text: "Planning sprint",
    avatar_image: "./assets/avatar_sage.png",
    personality: "Wise mint sprout with journal. Balances priorities, roadmap deadlines, and team energy.",
    color_theme: "#E6FFFA",
    sort_order: 6
  },
  {
    id: "spark",
    name: "Spark",
    role: "UI & Experience Design",
    domain: "design",
    status: "listening",
    tag_text: "listening",
    tag_color: "#F59E0B",
    description_icon: "✨",
    description_text: "Designing wireframes",
    avatar_image: "./assets/avatar_spark.png",
    personality: "Playful chick with digital antenna stylus. Crafts bento layouts, micro-animations, design tokens.",
    color_theme: "#FEF3C7",
    sort_order: 7
  },
  {
    id: "echo",
    name: "Echo",
    role: "Audio & Podcasting",
    domain: "media",
    status: "routing",
    tag_text: "routing",
    tag_color: "#0EA5E9",
    description_icon: "🎙️",
    description_text: "Syncing team audio",
    avatar_image: "./assets/avatar_echo.png",
    personality: "Sky-blue sound bubble. Transcribes audio, records meeting recaps, broadcasts updates.",
    color_theme: "#E0F2FE",
    sort_order: 8
  },
  {
    id: "pixel",
    name: "Pixel",
    role: "3D & Visual Assets",
    domain: "creative",
    status: "active",
    tag_text: "active",
    tag_color: "#EC4899",
    description_icon: "🎨",
    description_text: "Rendering 3D bento",
    avatar_image: "./assets/avatar_pixel.png",
    personality: "Pink VR bunny. Renders plush textures, generates icons, builds visual interfaces.",
    color_theme: "#FCE7F3",
    sort_order: 9
  },
  {
    id: "atlas",
    name: "Atlas",
    role: "Global Compliance & Ops",
    domain: "operations",
    status: "idle",
    tag_text: "idle",
    tag_color: "#64748B",
    description_icon: "🌐",
    description_text: "Global sync standby",
    avatar_image: "./assets/avatar_atlas.png",
    personality: "Scholarly owl with monocle. Monitors international regulations, timezones, enterprise logistics.",
    color_theme: "#F1F5F9",
    sort_order: 10
  }
];

const DEFAULT_GOALS = [
  {
    id: 1,
    title: "Turn one outside sale...",
    milestone: "Turn a read reply into a real ask",
    progress_pct: 65,
    completed: 0,
    assigned_agent_id: "fin",
    category: "Sales & Revenue",
    target_value: "1 Outside Sale",
    current_value: "0.65 Progress"
  },
  {
    id: 2,
    title: "Save Rp 1 juta this month",
    milestone: "Automate weekly transfer of Rp 250k into reserve vault",
    progress_pct: 85,
    completed: 0,
    assigned_agent_id: "fin",
    category: "Personal Savings",
    target_value: "Rp 1.000.000",
    current_value: "Rp 850.000"
  },
  {
    id: 3,
    title: "Ship Orb Handheld Dashboard v1.0",
    milestone: "Finalize plush avatars and dynamic lighting shaders",
    progress_pct: 90,
    completed: 0,
    assigned_agent_id: "spark",
    category: "Product Engineering",
    target_value: "Version 1.0",
    current_value: "Release Candidate"
  }
];

const DEFAULT_WALLET = {
  id: 1,
  balance: 1400.0,
  currency: "USD",
  last_transaction: "Synced with Fin"
};

const DEFAULT_TALENTS = [
  { id: 1, category: "Social", level: 8, score: 85, badge_name: "Community Catalyst" },
  { id: 2, category: "Collab", level: 9, score: 92, badge_name: "Synergy Master" },
  { id: 3, category: "Creativity", level: 10, score: 98, badge_name: "Orb Visionary" }
];

const DEFAULT_COLLECTIONS = [
  { id: 1, badge_id: "achiever_star", title: "Achiever Star", description: "Awarded for completing 5 daily milestones in sequence", badge_type: "ribbon_star", unlocked: 1 },
  { id: 2, badge_id: "celestial_spark", title: "Celestial Spark", description: "Awarded for unlocking shared crew synergy across 3 domains", badge_type: "medal_spark", unlocked: 1 },
  { id: 3, badge_id: "vault_keeper", title: "Vault Keeper", description: "Awarded for hitting monthly savings milestone", badge_type: "vault", unlocked: 1 },
  { id: 4, badge_id: "speed_demon", title: "Speed Demon", description: "Zero latency response time for routing requests", badge_type: "speed", unlocked: 0 }
];

// Helper to consistently resolve asset URLs across root subdomain deployments
window.resolveOrbAsset = function(path) {
  if (!path) return './assets/avatar_fin.png';
  let clean = path.trim().replace(/^\.?\//, '');
  if (!clean.startsWith('assets/')) {
    clean = 'assets/' + clean;
  }
  return './' + clean;
};

window.DEFAULT_AGENTS = DEFAULT_AGENTS;
window.DEFAULT_GOALS = DEFAULT_GOALS;
window.DEFAULT_WALLET = DEFAULT_WALLET;
window.DEFAULT_TALENTS = DEFAULT_TALENTS;
window.DEFAULT_COLLECTIONS = DEFAULT_COLLECTIONS;

const getApiBaseUrl = () => {
  // 1. Prioritas tertinggi: Override manual via window.ORB_API_URL jika di-set
  if (typeof window !== "undefined" && window.ORB_API_URL && typeof window.ORB_API_URL === "string") {
    const custom = window.ORB_API_URL.trim().replace(/\/+$/, '');
    if (custom) return custom;
  }

  // 2. Lingkungan produksi:
  // Ketika frontend dibuka dari subdomain https://orb.krftworks.my.id,
  // target API production adalah root Python App di https://krftworks.my.id
  if (typeof window !== "undefined" && window.location && window.location.hostname === "orb.krftworks.my.id") {
    return "https://krftworks.my.id";
  }

  // 3. Lingkungan local development (localhost, 127.0.0.1):
  // Menggunakan origin dan basePath lokal yang sama (tidak memaksa ke API production)
  return window.location.origin + getBasePath();
};

const API = {
  basePath: getBasePath(),
  baseUrl: getApiBaseUrl(),
  ws: null,
  wsListeners: [],

  // Helper pembentuk URL aman yang mencegah duplikasi /api/api/...
  buildUrl(endpoint) {
    const base = (this.baseUrl || '').replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Cegah duplikasi jika base URL berakhiran /api dan endpoint diawali /api/
    if (base.endsWith('/api') && (cleanEndpoint === '/api' || cleanEndpoint.startsWith('/api/'))) {
      return `${base.slice(0, -4)}${cleanEndpoint}`;
    }
    return `${base}${cleanEndpoint}`;
  },

  // WebSocket Management
  initWebSocket(onMessageCallback) {
    let wsHost = window.location.host;
    let wsBasePath = this.basePath;

    try {
      const u = new URL(this.baseUrl);
      wsHost = u.host;
      wsBasePath = u.pathname.replace(/\/+$/, '');
      if (wsBasePath.endsWith('/api')) {
        wsBasePath = wsBasePath.slice(0, -4);
      }
    } catch (_) {}

    const protocol = (window.location.protocol === "https:" || (this.baseUrl && this.baseUrl.startsWith("https:"))) ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${wsHost}${wsBasePath}/ws`;

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
        setTimeout(() => this.initWebSocket(onMessageCallback), 5000);
      };

      this.ws.onerror = () => {
        // Silent recovery
      };
    } catch (e) {
      console.warn("WebSocket unavailable, running in resilient client mode:", e);
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

  // REST API Methods with Safe Fallbacks
  async getAgents() {
    try {
      const res = await fetch(this.buildUrl('/api/agents'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}
    return DEFAULT_AGENTS;
  },

  async getAgentDetail(agentId) {
    try {
      const res = await fetch(this.buildUrl(`/api/agents/${agentId}`));
      if (res.ok) return await res.json();
    } catch (_) {}

    const agent = DEFAULT_AGENTS.find(a => a.id === agentId) || DEFAULT_AGENTS[0];
    return {
      agent,
      memories: [
        { id: 1, memory_type: "per_agent", category: "goal", content: `Active task for ${agent.name}: Maintain 100% operational velocity.` },
        { id: 2, memory_type: "shared", category: "preference", content: "Crew Guideline: Warm and proactive plush assistance." }
      ],
      chat_history: [
        { sender: "agent", text: `Hello! I'm ${agent.name}, your ${agent.role} agent. What can we accomplish together?` }
      ]
    };
  },

  async updateAgentStatus(agentId, statusData) {
    try {
      const res = await fetch(this.buildUrl(`/api/agents/${agentId}/status`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusData)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return { success: true };
  },

  async getGoals() {
    try {
      const res = await fetch(this.buildUrl('/api/goals'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}
    return DEFAULT_GOALS;
  },

  async updateGoal(goalId, updateData) {
    try {
      const res = await fetch(this.buildUrl(`/api/goals/${goalId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return { success: true };
  },

  async getWallet() {
    try {
      const res = await fetch(this.buildUrl('/api/wallet'));
      if (res.ok) return await res.json();
    } catch (_) {}
    return DEFAULT_WALLET;
  },

  async getTalents() {
    try {
      const res = await fetch(this.buildUrl('/api/talents'));
      if (res.ok) return await res.json();
    } catch (_) {}
    return DEFAULT_TALENTS;
  },

  async getCollections() {
    try {
      const res = await fetch(this.buildUrl('/api/collections'));
      if (res.ok) return await res.json();
    } catch (_) {}
    return DEFAULT_COLLECTIONS;
  },

  async sendChat(agentId, message) {
    try {
      const res = await fetch(this.buildUrl('/api/chat'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, message: message })
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    const agent = DEFAULT_AGENTS.find(a => a.id === agentId) || DEFAULT_AGENTS[0];
    return {
      text: `Got it! ${agent.name} is working on: "${message}". Logged to memory!`,
      action: null
    };
  },

  async getLighting() {
    try {
      const res = await fetch(this.buildUrl('/api/lighting'));
      if (res.ok) return await res.json();
    } catch (_) {}
    return { time_of_day: "auto", theme_mode: "dark", auto: true };
  },

  async setLighting(lightingData) {
    try {
      const res = await fetch(this.buildUrl('/api/lighting'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lightingData)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return lightingData;
  }
};

window.API = API;
